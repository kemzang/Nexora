/**
 * @file Equipes : appartenance, roles, sieges et credits mutualises.
 *
 * Une organisation nait d'une vente, pas d'un bouton dans l'application —
 * cf. l'en-tete de la migration 013. Ce fichier ne contient donc aucune
 * creation libre : seule la route d'administration en cree une.
 *
 * Un utilisateur n'appartient qu'a une organisation. Toute la resolution de
 * quota en decoule : si `getUserOrg` renvoie quelque chose, le quota de la
 * personne est celui du pot commun, sinon c'est son plan personnel.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export type OrgRole = 'owner' | 'admin' | 'member'

export interface UserOrg {
  orgId: string
  name: string
  slug: string
  role: OrgRole
  seats: number
  creditsPerSeat: number
  status: 'active' | 'suspended' | 'cancelled'
  /** Fin du contrat. `null` = sans echeance. */
  contractEndsAt: string | null
}

/**
 * Une organisation dont le contrat est echu ne donne plus acces au pot
 * commun — ses membres retombent sur leur plan personnel, comme si elle
 * etait suspendue.
 *
 * L'echeance est verifiee a la lecture plutot que par une tache planifiee :
 * une tache qui ne tourne pas laisse l'acces ouvert sans que personne le
 * sache, alors qu'un calcul fait sur le chemin critique ne peut pas etre
 * oublie. Le cout est d'une comparaison de dates par requete.
 */
export function isOrgActive(
  org: Pick<UserOrg, 'status' | 'contractEndsAt'>,
  now = new Date(),
): boolean {
  if (org.status !== 'active') return false
  if (!org.contractEndsAt) return true
  const end = new Date(org.contractEndsAt)
  // Une date illisible n'interdit pas l'acces. Deux raisons.
  //
  // La colonne est un timestamptz : Postgres refuserait une valeur abimee,
  // donc ce cas ne devrait pas exister. S'il se produit quand meme, couper
  // une equipe qui paie a cause d'une donnee corrompue est un degat bien
  // plus visible qu'un jour d'acces offert a tort.
  //
  // Surtout, l'affichage cote administration traite deja une date illisible
  // comme « pas d'echeance ». Couper ici donnerait un tableau de bord qui
  // n'annonce rien d'anormal pendant que l'equipe perd son acces — le pire
  // des deux mondes pour diagnostiquer.
  if (Number.isNaN(end.getTime())) return true
  return end > now
}

export function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/** Duree de validite d'une invitation. */
export const INVITE_TTL_DAYS = 14

/** Le jeton voyage dans une URL : on veut du sans-ambiguite, pas du joli. */
export function newInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Identifiant lisible derive du nom. Ajoute un suffixe aleatoire plutot que
 * de boucler sur les collisions : deux entreprises peuvent porter le meme
 * nom, et une boucle de reessai sous contrainte unique est une source
 * classique de course entre deux creations simultanees.
 */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${base || 'team'}-${randomBytes(3).toString('hex')}`
}

/**
 * L'organisation de l'utilisateur, ou null s'il n'en a pas. Une organisation
 * suspendue ou resiliee ne compte pas : ses membres retombent sur leur plan
 * personnel plutot que de se retrouver sans acces du tout.
 */
export async function getUserOrg(
  db: SupabaseClient,
  userId: string,
): Promise<UserOrg | null> {
  const { data, error } = await db
    .from('organization_members')
    .select(
      'role, organizations!inner(id, name, slug, seats, credits_per_seat, status, contract_ends_at)',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  const org = data.organizations as unknown as {
    id: string
    name: string
    slug: string
    seats: number
    credits_per_seat: number
    status: UserOrg['status']
    contract_ends_at: string | null
  }
  if (!org) return null

  const resolved: UserOrg = {
    orgId: org.id,
    name: org.name,
    slug: org.slug,
    role: data.role as OrgRole,
    seats: org.seats,
    creditsPerSeat: org.credits_per_seat,
    status: org.status,
    contractEndsAt: org.contract_ends_at ?? null,
  }

  return isOrgActive(resolved) ? resolved : null
}

/** Plafond du pot commun : sieges payes x credits par siege. */
export function orgCreditLimit(org: Pick<UserOrg, 'seats' | 'creditsPerSeat'>) {
  return org.seats * org.creditsPerSeat
}

/**
 * Credits restants dans le pot commun. La somme est faite par Postgres :
 * la route du proxy appelle ceci sur le chemin critique, et additionner en
 * TypeScript demanderait de rapatrier les lignes de tous les membres.
 */
export async function getOrgRemainingCredits(
  db: SupabaseClient,
  org: UserOrg,
): Promise<number> {
  const { data, error } = await db.rpc('organization_usage', {
    p_org_id: org.orgId,
  })
  if (error) {
    // Une panne de calcul ne doit pas couper l'acces a une equipe qui paie,
    // mais elle ne doit pas non plus ouvrir un robinet sans fin : renvoyer
    // l'infini ici donnait des credits illimites des que la fonction SQL
    // manquait — exactement ce qui arrive si la migration n'a ete appliquee
    // qu'a moitie. On retombe sur le plafond vendu, donc l'equipe continue
    // de travailler et l'exposition reste bornee par ce qu'elle a paye.
    console.error('[org] usage unavailable, falling back to full quota', error)
    return orgCreditLimit(org)
  }
  return Math.max(0, orgCreditLimit(org) - Number(data ?? 0))
}

/** Sieges occupes : membres + invitations encore valables. */
export async function countSeatsInUse(
  db: SupabaseClient,
  orgId: string,
): Promise<number> {
  const [{ count: members }, { count: invites }] = await Promise.all([
    db
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('org_id', orgId),
    db
      .from('organization_invites')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ])
  return (members ?? 0) + (invites ?? 0)
}

/** Seuls le proprietaire et les administrateurs gerent les membres. */
export function canManageMembers(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Rattache un utilisateur a l'organisation qui declare son domaine (SSO).
 * Appele a la connexion. Ne fait rien s'il appartient deja a une equipe,
 * si aucun domaine ne correspond, ou s'il ne reste plus de siege — on ne
 * fait jamais depasser le nombre de sieges payes en silence.
 */
export async function joinOrgBySsoDomain(
  db: SupabaseClient,
  userId: string,
  email: string,
): Promise<string | null> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  const existing = await db
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing.data) return null

  const { data: org } = await db
    .from('organizations')
    .select('id, seats, sso_default_role')
    .contains('sso_domains', [domain])
    .eq('status', 'active')
    .maybeSingle()
  if (!org) return null

  if ((await countSeatsInUse(db, org.id)) >= org.seats) {
    console.warn('[org] sso join refused, no seat left', org.id)
    return null
  }

  const { error } = await db.from('organization_members').insert({
    org_id: org.id,
    user_id: userId,
    role: org.sso_default_role,
  })
  return error ? null : org.id
}
