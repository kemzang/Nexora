/**
 * Acceptation d'une invitation.
 *
 * L'invitation est liee a une adresse, pas a un compte : on verifie que le
 * compte connecte porte bien cette adresse. Sans cette verification, un lien
 * intercepte suffirait a entrer dans l'equipe de quelqu'un d'autre.
 */
import { NextRequest, NextResponse } from 'next/server'
import { countSeatsInUse, serviceClient } from '@/lib/organizations'

export const runtime = 'nodejs'

const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })

export async function POST(req: NextRequest) {
  const authToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!authToken) return bad('Unauthorized', 401)

  const db = serviceClient()
  const { data: auth, error: authError } = await db.auth.getUser(authToken)
  if (authError || !auth.user?.email) return bad('Unauthorized', 401)

  const userId = auth.user.id
  const userEmail = auth.user.email.toLowerCase()

  const body = await req.json().catch(() => null)
  const token = String(body?.token ?? '')
  if (!token) return bad('Missing token')

  const { data: invite } = await db
    .from('organization_invites')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return bad('This invitation does not exist', 404)
  if (invite.accepted_at) return bad('This invitation has already been used', 409)
  if (new Date(invite.expires_at) < new Date()) {
    return bad('This invitation has expired. Ask for a new one.', 410)
  }
  if (invite.email.toLowerCase() !== userEmail) {
    return bad(
      `This invitation was sent to ${invite.email}. Sign in with that address to accept it.`,
      403,
    )
  }

  const { data: already } = await db
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (already) {
    return already.org_id === invite.org_id
      ? NextResponse.json({ success: true, orgId: invite.org_id })
      : bad('You already belong to another team. Leave it first.', 409)
  }

  const { data: org } = await db
    .from('organizations')
    .select('id, name, seats, status, owner_id')
    .eq('id', invite.org_id)
    .maybeSingle()
  if (!org || org.status !== 'active') {
    return bad('This team is no longer active', 409)
  }

  // Le siege peut avoir ete pris entre l'envoi et l'acceptation.
  if ((await countSeatsInUse(db, org.id)) > org.seats) {
    return bad('All seats are taken. Ask an administrator to add one.', 409)
  }

  // Le proprietaire designe a la creation n'avait pas encore de compte : son
  // invitation lui rend le role et la propriete de l'organisation.
  const isOwnerInvite = invite.role === 'admin' && org.owner_id !== userId
  const { data: ownerMember } = await db
    .from('organization_members')
    .select('user_id')
    .eq('org_id', org.id)
    .eq('role', 'owner')
    .maybeSingle()

  const role = !ownerMember && isOwnerInvite ? 'owner' : invite.role

  const { error } = await db.from('organization_members').insert({
    org_id: org.id,
    user_id: userId,
    role,
  })
  if (error) {
    console.error('[org] accept failed', error)
    return bad('Could not add you to the team', 500)
  }

  if (role === 'owner') {
    await db.from('organizations').update({ owner_id: userId }).eq('id', org.id)
  }

  await db
    .from('organization_invites')
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invite.id)

  return NextResponse.json({ success: true, orgId: org.id, orgName: org.name })
}

/** Apercu de l'invitation avant connexion, pour afficher le nom de l'equipe. */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return bad('Missing token')

  const db = serviceClient()
  const { data } = await db
    .from('organization_invites')
    .select('email, role, expires_at, accepted_at, organizations(name)')
    .eq('token', token)
    .maybeSingle()

  if (!data) return bad('This invitation does not exist', 404)

  return NextResponse.json({
    email: data.email,
    role: data.role,
    orgName: (data.organizations as unknown as { name: string } | null)?.name,
    expired: new Date(data.expires_at) < new Date(),
    used: !!data.accepted_at,
  })
}
