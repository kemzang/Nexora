/**
 * Creation d'une organisation, reservee a l'administration.
 *
 * C'est le maillon qui manquait : un lead Enterprise accepte n'avait aucun
 * chemin vers un compte d'equipe fonctionnel. On part du dossier commercial
 * deja saisi, on fixe les sieges negocies, et on invite le proprietaire.
 *
 * Volontairement pas de creation libre cote utilisateur — cf. l'en-tete de
 * la migration 013.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  INVITE_TTL_DAYS,
  newInviteToken,
  serviceClient,
  slugify,
} from '@/lib/organizations'
import { sendOrgInvite } from '@/lib/orgEmails'

export const runtime = 'nodejs'

function admins(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await serviceClient().auth.getUser(token)
  if (error || !data.user?.email) return null
  const email = data.user.email.toLowerCase()
  return admins().includes(email) ? email : null
}

const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })

/**
 * Lit une echeance de contrat.
 *
 * Renvoie `null` quand il n'y en a pas — un contrat a duree indeterminee est
 * legitime —, la date quand elle tient debout, et `'invalid'` quand elle est
 * dans le passe : creer une organisation deja expiree n'a aucun sens, et
 * c'est le genre de faute de frappe qu'on ne remarque qu'en lisant la plainte
 * du client.
 */
function parseContractEnd(raw: unknown): string | null | 'invalid' {
  if (raw === undefined || raw === null || raw === '') return null
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return 'invalid'
  if (d.getTime() <= Date.now()) return 'invalid'
  return d.toISOString()
}

/** Liste des organisations, pour le tableau de bord d'administration. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return bad('Forbidden', 403)
  const db = serviceClient()

  const { data, error } = await db
    .from('organizations')
    .select('id, name, slug, seats, credits_per_seat, status, sso_domains, created_at, lead_id, contract_ends_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return bad('Read failed', 500)

  // Nombre de membres par organisation, en une requete plutot qu'une par
  // ligne — la liste reste utilisable quand il y aura des dizaines de clients.
  const { data: members } = await db
    .from('organization_members')
    .select('org_id')
  const counts = new Map<string, number>()
  for (const m of members ?? []) {
    counts.set(m.org_id, (counts.get(m.org_id) ?? 0) + 1)
  }

  return NextResponse.json({
    organizations: (data ?? []).map((o) => ({
      ...o,
      member_count: counts.get(o.id) ?? 0,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return bad('Forbidden', 403)

  const body = await req.json().catch(() => null)
  if (!body) return bad('Invalid body')

  const name = String(body.name ?? '').trim()
  const ownerEmail = String(body.ownerEmail ?? '').trim().toLowerCase()
  const seats = Number(body.seats)
  const creditsPerSeat = Number(body.creditsPerSeat ?? 40_000_000)
  // Echeance du contrat. Facultative : un contrat a duree indeterminee n'en
  // a pas, et on ne doit pas en inventer une par defaut — une date posee au
  // hasard couperait l'acces d'un client qui n'a rien demande.
  const contractEndsAt = parseContractEnd(body.contractEndsAt)
  if (contractEndsAt === 'invalid') {
    return bad('contractEndsAt must be a date in the future')
  }
  const ssoDomains: string[] = Array.isArray(body.ssoDomains)
    ? body.ssoDomains
        .map((d: unknown) => String(d).trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean)
    : []

  if (name.length < 2) return bad('Missing field: name')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
    return bad('Missing or invalid field: ownerEmail')
  }
  if (!Number.isInteger(seats) || seats < 1 || seats > 10_000) {
    return bad('seats must be between 1 and 10000')
  }
  if (!Number.isFinite(creditsPerSeat) || creditsPerSeat < 0) {
    return bad('Invalid creditsPerSeat')
  }

  const db = serviceClient()

  // Un domaine ne peut appartenir qu'a une organisation : sinon deux equipes
  // se disputeraient les nouveaux comptes du meme employeur, et le
  // rattachement deviendrait imprevisible.
  for (const domain of ssoDomains) {
    const { data: clash } = await db
      .from('organizations')
      .select('id, name')
      .contains('sso_domains', [domain])
      .maybeSingle()
    if (clash) {
      return bad(`Domain ${domain} is already claimed by ${clash.name}`, 409)
    }
  }

  // Le proprietaire doit exister : on ne cree pas de compte a sa place, il
  // s'inscrit lui-meme depuis l'invitation.
  const { data: ownerId } = await db.rpc('user_id_by_email', {
    p_email: ownerEmail,
  })

  const { data: org, error } = await db
    .from('organizations')
    .insert({
      name,
      slug: slugify(name),
      // Tant que le proprietaire n'a pas de compte, on pose l'administrateur
      // courant comme titulaire : la colonne est obligatoire, et l'invitation
      // transfere le role a l'acceptation.
      owner_id: ownerId ?? (await requireAdminUserId(req)),
      seats,
      credits_per_seat: creditsPerSeat,
      sso_domains: ssoDomains,
      contract_ends_at: contractEndsAt,
      lead_id: body.leadId ?? null,
    })
    .select('id, name, slug, seats')
    .single()

  if (error || !org) {
    console.error('[org] create failed', error)
    return bad('Could not create the organization', 500)
  }

  // Le proprietaire deja inscrit devient membre tout de suite ; sinon il le
  // devient en acceptant l'invitation.
  if (ownerId) {
    await db.from('organization_members').insert({
      org_id: org.id,
      user_id: ownerId,
      role: 'owner',
    })
  }

  const token = newInviteToken()
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 86_400_000,
  ).toISOString()

  await db.from('organization_invites').insert({
    org_id: org.id,
    email: ownerEmail,
    role: 'admin',
    token,
    expires_at: expiresAt,
  })

  try {
    await sendOrgInvite({
      to: ownerEmail,
      orgName: org.name,
      token,
      role: 'owner',
    })
  } catch (e) {
    // L'organisation existe : un echec d'envoi ne doit pas la perdre.
    console.error('[org] invite email failed', e)
  }

  return NextResponse.json({ organization: org, invited: ownerEmail })
}

async function requireAdminUserId(req: NextRequest): Promise<string> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const { data } = await serviceClient().auth.getUser(token!)
  return data.user!.id
}

/**
 * Modification d'une organisation : echeance, sieges, statut.
 *
 * Sans cette route, une echeance posee a la creation etait definitive — on
 * ne pouvait ni renouveler un contrat, ni corriger une date saisie de
 * travers, sans passer par la base a la main.
 */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return bad('Forbidden', 403)

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '').trim()
  if (!id) return bad('Missing field: id')

  const patch: Record<string, unknown> = {}

  if ('contractEndsAt' in body) {
    // Un renouvellement repousse l'echeance, et `null` revient a un contrat
    // sans terme. Les deux sont des gestes courants.
    const end = parseContractEnd(body.contractEndsAt)
    if (end === 'invalid') return bad('contractEndsAt must be a date in the future')
    patch.contract_ends_at = end
  }

  if ('seats' in body) {
    const seats = Number(body.seats)
    if (!Number.isInteger(seats) || seats < 1 || seats > 10_000) {
      return bad('seats must be between 1 and 10000')
    }
    patch.seats = seats
  }

  if ('status' in body) {
    const status = String(body.status)
    if (!['active', 'suspended', 'cancelled'].includes(status)) {
      return bad('Invalid status')
    }
    patch.status = status
  }

  if (Object.keys(patch).length === 0) return bad('Nothing to update')
  patch.updated_at = new Date().toISOString()

  const { error } = await serviceClient()
    .from('organizations')
    .update(patch)
    .eq('id', id)
  if (error) {
    console.error('[org] update failed', error)
    return bad('Could not update the organization', 500)
  }
  return NextResponse.json({ success: true })
}
