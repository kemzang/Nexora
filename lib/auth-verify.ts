import { createClient } from '@supabase/supabase-js'

import { apiKeyExpiresAt } from '@/lib/api-keys'
import { cacheGet, cacheSet } from './upstash-cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cache en mémoire (valide pendant la durée de vie du serveur)
const tokenCache = new Map<string, { userId: string; expiresAt: number }>()

/**
 * Faut-il une adresse confirmee pour utiliser l'API ?
 *
 * Deux comptes ont ete crees le 19 novembre depuis un domaine de boites
 * jetables (niceground.shop, dont le courrier part chez duckmail.sbs), avec
 * des adresses generees au hasard. Sans cette verification, fabriquer un
 * compte ne coute rien : il suffit d'une adresse inventee pour consommer des
 * jetons modeles, qui nous sont factures.
 *
 * Exiger la confirmation n'exclut aucun utilisateur legitime — il a de toute
 * facon recu le courriel — et coupe net les comptes fabriques a la chaine.
 *
 * L'interrupteur existe pour une raison precise : si des comptes anterieurs
 * n'ont jamais confirme leur adresse, ils seraient bloques du jour au
 * lendemain. REQUIRE_CONFIRMED_EMAIL=false les laisse passer, le temps de
 * regulariser.
 */
function confirmationExigee(): boolean {
  return process.env.REQUIRE_CONFIRMED_EMAIL !== 'false'
}

/** Cache des confirmations : une requete par utilisateur toutes les 10 min. */
const confirmCache = new Map<string, { ok: boolean; expiresAt: number }>()

async function adresseConfirmee(userId: string): Promise<boolean> {
  if (!confirmationExigee()) return true
  const cached = confirmCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.ok

  const partage = await cacheGet<boolean>(`conf:${userId}`)
  if (typeof partage === 'boolean') {
    confirmCache.set(userId, { ok: partage, expiresAt: Date.now() + 600_000 })
    return partage
  }

  /*
   * En cas de panne, on LAISSE PASSER.
   *
   * La version precedente traitait « Supabase n'a pas repondu » comme
   * « compte non confirme » : une coupure d'une seconde bloquait
   * l'utilisateur, et le resultat etant mis en cache, elle le bloquait
   * pendant dix minutes. On aurait cherche la panne chez nous pendant des
   * heures.
   *
   * Le risque inverse — laisser passer un compte non confirme pendant une
   * panne — est sans commune mesure : cette verification ne protege que
   * contre des comptes fabriques, pas contre un acces non autorise. Le
   * jeton, lui, a deja ete valide.
   */
  let u: { email_confirmed_at?: string; confirmed_at?: string } | undefined
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user) return true
    u = data.user as typeof u
  } catch {
    return true
  }

  // `confirmed_at` couvre aussi les comptes confirmes par un autre moyen
  // (lien magique, fournisseur externe) : s'en tenir a `email_confirmed_at`
  // bloquerait ceux qui se connectent par GitHub.
  const ok = Boolean(u?.email_confirmed_at || u?.confirmed_at)
  // Seul un resultat SUR est mis en cache.
  confirmCache.set(userId, { ok, expiresAt: Date.now() + 10 * 60 * 1000 })
  void cacheSet(`conf:${userId}`, ok, 600)
  return ok
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/*
 * Une clef qui SERT ne doit jamais expirer sous les pieds de son porteur.
 *
 * Les clefs `nxr_` vivent 90 jours. C'est une bonne regle pour une clef
 * oubliee dans un script, et une mauvaise pour celle que l'editeur de
 * quelqu'un utilise toutes les trente secondes : au 91e jour, son
 * autocompletion s'arrete, son chat s'arrete, et rien ne lui dit pourquoi.
 * Il n'a rien fait de mal, et on lui demande d'aller se reconnecter.
 *
 * L'echeance glisse donc tant que la clef sert : chaque usage, au plus une
 * fois par periode de cache, la repousse a 90 jours. Une clef abandonnee
 * expire comme avant ; une clef revoquee reste refusee immediatement, car
 * `is_active` est verifie a chaque appel et ne glisse pas, lui.
 *
 * L'ecriture est deliberement detachee (`void`) : la reponse ne doit pas
 * attendre un aller-retour de base supplementaire sur le chemin chaud de
 * l'autocompletion. Si elle echoue, la clef reste simplement valide
 * jusqu'a son echeance actuelle.
 */
export const RENOUVELER_SOUS_JOURS = 30

export async function prolongerSiProche(
  tokenHash: string,
  expiresAt: string | null,
  db?: { from: (t: string) => any },
): Promise<boolean> {
  if (!expiresAt) return false
  const restant = new Date(expiresAt).getTime() - Date.now()
  if (restant > RENOUVELER_SOUS_JOURS * 24 * 60 * 60 * 1000) return false

  try {
    await (db ?? supabase)
      .from('api_keys')
      .update({ expires_at: apiKeyExpiresAt() })
      .eq('key_hash', tokenHash)
      .eq('is_active', true)
    return true
  } catch {
    // Sans consequence : la clef garde son echeance actuelle.
    return false
  }
}

export async function verifyToken(token: string): Promise<string | null> {
  const cached = tokenCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId
  }

  /*
   * Le cache memoire ne survit pas a l'instance.
   *
   * Vercel demarre sans cesse de nouvelles instances, chacune avec une
   * Map vide. L'autocompletion, qui part a chaque pause de frappe,
   * tombait donc presque toujours sur une instance neuve et repayait
   * deux allers-retours Supabase : la lecture de la clef, puis la
   * verification du compte.
   *
   * Mesure du 24 novembre 2026 : 1822 ms pour cette seule fonction,
   * quand DeepSeek rendait son premier jeton en 360 ms. L'editeur
   * annulait bien avant, et aucune suggestion ne s'affichait jamais.
   *
   * Le cache partage corrige cela, comme il le fait deja pour le plan
   * et le quota dans `lib/quota.ts`. La clef stockee est le HACHAGE du
   * jeton, jamais le jeton : un acces au cache ne doit pas donner de
   * quoi se faire passer pour quelqu'un.
   */
  const empreinte = await sha256(token)
  const partage = await cacheGet<string>(`tok:${empreinte}`)
  if (partage) {
    tokenCache.set(token, { userId: partage, expiresAt: Date.now() + 300_000 })
    return partage
  }

  // Token custom nxr_
  if (token.startsWith('nxr_')) {
    const tokenHash = empreinte
    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id, expires_at, is_active')
      .eq('key_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null
    // Une clef `nxr_` survit a son porteur : on verifie le compte, pas
    // seulement la clef.
    if (!(await adresseConfirmee(data.user_id))) return null

    void prolongerSiProche(tokenHash, data.expires_at as string | null)

    // Mettre en cache pour 5 minutes
    tokenCache.set(token, { userId: data.user_id, expiresAt: Date.now() + 5 * 60 * 1000 })
    void cacheSet(`tok:${empreinte}`, data.user_id, 300)
    return data.user_id
  }

  // Token Supabase natif (JWT)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  // Supabase delivre une session meme sans confirmation quand l'option est
  // desactivee cote projet : la verification se fait donc ici, ou elle ne
  // depend pas d'un reglage qu'on peut changer par megarde.
  if (confirmationExigee() && !(user.email_confirmed_at || user.confirmed_at)) {
    return null
  }

  // Mettre en cache pour 5 minutes
  tokenCache.set(token, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 })
  void cacheSet(`tok:${empreinte}`, user.id, 300)
  return user.id
}
