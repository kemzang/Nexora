/**
 * Membres : changer un role, retirer quelqu'un, quitter l'equipe.
 *
 * Une regle traverse tout le fichier : il doit toujours rester un
 * proprietaire. Sans elle, une organisation peut se retrouver sans personne
 * habilite a gerer la facturation, et seule une intervention en base la
 * remet d'aplomb.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import {
  canManageMembers,
  getUserOrg,
  serviceClient,
} from '@/lib/organizations'

export const runtime = 'nodejs'

const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })

async function context(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const userId = token ? await verifyToken(token) : null
  if (!userId) return null
  const db = serviceClient()
  const org = await getUserOrg(db, userId)
  if (!org) return null
  return { db, org, userId }
}

/** Changer le role d'un membre. Seul le proprietaire nomme un proprietaire. */
export async function PATCH(req: NextRequest) {
  const ctx = await context(req)
  if (!ctx) return bad('Forbidden', 403)
  const { db, org, userId } = ctx
  if (!canManageMembers(org.role)) return bad('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const memberId = String(body?.memberId ?? '')
  const role = body?.role

  if (!memberId) return bad('Missing memberId')
  if (!['owner', 'admin', 'member'].includes(role)) return bad('Invalid role')
  if (role === 'owner' && org.role !== 'owner') {
    return bad('Only the owner can hand over ownership', 403)
  }

  const { data: target } = await db
    .from('organization_members')
    .select('user_id, role')
    .eq('org_id', org.orgId)
    .eq('user_id', memberId)
    .maybeSingle()
  if (!target) return bad('This person is not in your team', 404)

  // Retrograder le dernier proprietaire laisserait l'equipe sans titulaire.
  if (target.role === 'owner' && role !== 'owner') {
    const { count } = await db
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('org_id', org.orgId)
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return bad('Promote someone else to owner first', 409)
    }
  }

  await db
    .from('organization_members')
    .update({ role })
    .eq('org_id', org.orgId)
    .eq('user_id', memberId)

  // La propriete suit le role : une seule source de verite.
  if (role === 'owner') {
    await db
      .from('organizations')
      .update({ owner_id: memberId })
      .eq('id', org.orgId)
    await db
      .from('organization_members')
      .update({ role: 'admin' })
      .eq('org_id', org.orgId)
      .eq('user_id', userId)
  }

  return NextResponse.json({ success: true })
}

/**
 * Retirer un membre, ou quitter l'equipe soi-meme. Les deux passent ici :
 * c'est la meme operation, seule l'autorisation differe.
 */
export async function DELETE(req: NextRequest) {
  const ctx = await context(req)
  if (!ctx) return bad('Forbidden', 403)
  const { db, org, userId } = ctx

  const memberId = new URL(req.url).searchParams.get('id') || userId
  const isSelf = memberId === userId
  if (!isSelf && !canManageMembers(org.role)) return bad('Forbidden', 403)

  const { data: target } = await db
    .from('organization_members')
    .select('role')
    .eq('org_id', org.orgId)
    .eq('user_id', memberId)
    .maybeSingle()
  if (!target) return bad('This person is not in your team', 404)

  if (target.role === 'owner') {
    const { count } = await db
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('org_id', org.orgId)
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return bad(
        'The team must keep an owner. Promote someone else first.',
        409,
      )
    }
  }

  // Un administrateur ne retire pas un proprietaire.
  if (!isSelf && target.role === 'owner' && org.role !== 'owner') {
    return bad('Only the owner can remove an owner', 403)
  }

  const { error } = await db
    .from('organization_members')
    .delete()
    .eq('org_id', org.orgId)
    .eq('user_id', memberId)

  if (error) return bad('Could not remove this member', 500)
  return NextResponse.json({ success: true })
}
