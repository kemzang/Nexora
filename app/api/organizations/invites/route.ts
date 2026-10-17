/**
 * Invitations : emettre et revoquer.
 *
 * Le controle des sieges se fait ici, en comptant les invitations encore
 * valables en plus des membres. Sans ca, on peut inviter trente personnes
 * sur dix sieges et depasser silencieusement ce qui est facture.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import {
  canManageMembers,
  countSeatsInUse,
  getUserOrg,
  INVITE_TTL_DAYS,
  newInviteToken,
  serviceClient,
} from '@/lib/organizations'
import { sendOrgInvite } from '@/lib/orgEmails'

export const runtime = 'nodejs'

const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })

async function requireManager(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const userId = token ? await verifyToken(token) : null
  if (!userId) return null
  const db = serviceClient()
  const org = await getUserOrg(db, userId)
  if (!org || !canManageMembers(org.role)) return null
  return { db, org, userId }
}

export async function POST(req: NextRequest) {
  const ctx = await requireManager(req)
  if (!ctx) return bad('Forbidden', 403)
  const { db, org, userId } = ctx

  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const role = body?.role === 'admin' ? 'admin' : 'member'

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return bad('Invalid email address')
  }

  if ((await countSeatsInUse(db, org.orgId)) >= org.seats) {
    return bad(
      `All ${org.seats} seats are taken. Remove a member or add seats before inviting someone else.`,
      409,
    )
  }

  // Deja membre : inviter a nouveau n'aurait aucun effet, autant le dire.
  const { data: existingId } = await db.rpc('user_id_by_email', {
    p_email: email,
  })
  if (existingId) {
    const { data: already } = await db
      .from('organization_members')
      .select('org_id')
      .eq('user_id', existingId)
      .maybeSingle()
    if (already?.org_id === org.orgId) {
      return bad('This person is already in your team', 409)
    }
    if (already) {
      return bad('This person already belongs to another team', 409)
    }
  }

  const token = newInviteToken()
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 86_400_000,
  ).toISOString()

  // Reinviter remplace l'invitation precedente plutot que d'en empiler une
  // seconde : l'index unique partiel l'impose, et deux liens valables pour
  // la meme personne n'ont pas de sens.
  await db
    .from('organization_invites')
    .delete()
    .eq('org_id', org.orgId)
    .is('accepted_at', null)
    .ilike('email', email)

  const { data: invite, error } = await db
    .from('organization_invites')
    .insert({
      org_id: org.orgId,
      email,
      role,
      token,
      invited_by: userId,
      expires_at: expiresAt,
    })
    .select('id, email, role, expires_at, created_at')
    .single()

  if (error || !invite) {
    console.error('[org] invite insert failed', error)
    return bad('Could not create the invitation', 500)
  }

  const { data: me } = await db
    .from('user_profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  try {
    await sendOrgInvite({
      to: email,
      orgName: org.name,
      token,
      role,
      inviterName: me?.display_name ?? undefined,
    })
  } catch (e) {
    // L'invitation est enregistree : on signale l'echec d'envoi plutot que
    // de laisser croire que le message est parti.
    console.error('[org] invite email failed', e)
    return NextResponse.json({ invite, emailSent: false })
  }

  return NextResponse.json({ invite, emailSent: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireManager(req)
  if (!ctx) return bad('Forbidden', 403)
  const { db, org } = ctx

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return bad('Missing id')

  // Le filtre sur org_id est la garde : sans lui, un responsable pourrait
  // revoquer l'invitation d'une autre equipe en devinant son identifiant.
  const { error } = await db
    .from('organization_invites')
    .delete()
    .eq('id', id)
    .eq('org_id', org.orgId)

  if (error) return bad('Could not revoke the invitation', 500)
  return NextResponse.json({ success: true })
}
