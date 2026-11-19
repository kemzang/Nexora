import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { cacheDel, cacheGet, cacheSet } from './upstash-cache'

/**
 * Comptes gratuits par machine.
 *
 * Le palier gratuit offre 100 000 credits par mois et par compte, et rien
 * n'empechait d'en ouvrir autant que d'adresses jetables — chacun consommant
 * de vrais appels d'API factures a Nexora.
 *
 * On lie donc chaque compte a la machine qui l'a active. Au-dela de la limite,
 * les comptes suivants gardent l'acces au produit mais perdent le quota
 * gratuit. Rien ne le leur annonce : un message expliquerait comment
 * contourner. Les plans payants ne sont jamais affectes.
 */

export const MAX_FREE_ACCOUNTS_PER_MACHINE = 2

function service(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/** Un identifiant d'editeur est un UUID ou un hash ; on refuse le reste. */
function sane(machineId: unknown): string | null {
  if (typeof machineId !== 'string') return null
  const id = machineId.trim()
  return /^[A-Za-z0-9._:-]{8,128}$/.test(id) ? id : null
}

/**
 * Enregistre le lien compte-machine et bloque le quota gratuit si la machine
 * en porte deja trop.
 *
 * Idempotent : la cle primaire composee absorbe les connexions repetees du
 * meme compte sur la meme machine.
 */
export async function linkAccountToMachine(
  userId: string,
  rawMachineId: unknown,
): Promise<void> {
  const machineId = sane(rawMachineId)
  if (!machineId) return

  const db = service()

  await db.from('machine_accounts')
    .upsert({ machine_id: machineId, user_id: userId }, { onConflict: 'machine_id,user_id' })

  const { data, error } = await db
    .from('machine_accounts')
    .select('user_id')
    .eq('machine_id', machineId)
    .order('created_at', { ascending: true })

  if (error || !data) return

  // Les premiers arrives gardent leur quota ; seuls les suivants le perdent.
  // Trier par date d'arrivee evite qu'une nouvelle connexion d'un ancien
  // compte ne le penalise retroactivement.
  const blocked = data.slice(MAX_FREE_ACCOUNTS_PER_MACHINE).map((r) => r.user_id)
  if (blocked.includes(userId)) {
    await db.from('user_profiles')
      .update({ free_quota_blocked: true })
      .eq('id', userId)
    // Le drapeau vient de changer : sans cette invalidation, le compte
    // garderait son quota gratuit pendant la duree du cache, c'est-a-dire
    // au moment precis ou on vient de le lui retirer.
    blocageCache.delete(userId)
    await cacheDel(`freeblock:${userId}`)
  }
}

/** Le compte a-t-il perdu son quota gratuit ? Faux par defaut, y compris en cas d'erreur. */
/**
 * Le client est facultatif : plusieurs routes concernees n'en ouvrent pas
 * (reclassement, embeddings). Leur en imposer un pour poser cette question
 * aurait ete la raison parfaite de ne pas la poser du tout — et c'est
 * exactement ce qui s'etait passe.
 */
export async function isFreeQuotaBlocked(
  db: SupabaseClient | null | undefined,
  userId: string,
): Promise<boolean> {
  /*
   * Mis en cache une minute.
   *
   * La reponse ne change qu'a l'activation d'un nouveau compte sur la meme
   * machine — un evenement rare — alors que la question est posee a chaque
   * appel, y compris par l'autocompletion qui part a chaque pause de
   * frappe. Sans cache, c'etait un aller-retour de base supplementaire la
   * ou la latence se voit le plus.
   */
  const enMemoire = blocageCache.get(userId)
  if (enMemoire && enMemoire.expiresAt > Date.now()) return enMemoire.blocked

  const partage = await cacheGet<boolean>(`freeblock:${userId}`)
  if (typeof partage === 'boolean') {
    blocageCache.set(userId, { blocked: partage, expiresAt: Date.now() + 60_000 })
    return partage
  }

  const { data, error } = await (db ?? service())
    .from('user_profiles')
    .select('free_quota_blocked')
    .eq('id', userId)
    .maybeSingle()
  // Une erreur de lecture ne doit pas priver quelqu'un de son quota : on
  // repond « non bloque » sans rien mettre en cache.
  if (error || !data) return false

  const blocked = Boolean(data.free_quota_blocked)
  blocageCache.set(userId, { blocked, expiresAt: Date.now() + 60_000 })
  void cacheSet(`freeblock:${userId}`, blocked, 60)
  return blocked
}

const blocageCache = new Map<string, { blocked: boolean; expiresAt: number }>()
