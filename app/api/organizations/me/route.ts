/**
 * L'equipe de l'utilisateur connecte : membres, invitations en cours,
 * consommation du pot commun.
 *
 * Le detail par membre n'est renvoye qu'aux responsables — un membre simple
 * n'a pas a voir combien consomment ses collegues.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import {
  canManageMembers,
  getUserOrg,
  joinOrgBySsoDomain,
  orgCreditLimit,
  serviceClient,
} from '@/lib/organizations'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const userId = token ? await verifyToken(token) : null
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = serviceClient()
  let org = await getUserOrg(db, userId)

  // Rattachement par domaine (SSO). On le tente ici plutot que sur le chemin
  // critique du proxy : cette route n'est appelee qu'a l'ouverture du tableau
  // de bord, et seuls les comptes sans equipe paient la requete en plus.
  if (!org) {
    const { data: auth } = await db.auth.getUser(token!)
    const email = auth.user?.email
    if (email && (await joinOrgBySsoDomain(db, userId, email))) {
      org = await getUserOrg(db, userId)
    }
  }

  if (!org) return NextResponse.json({ organization: null })

  const [{ data: members }, { data: usage }, { data: invites }] =
    await Promise.all([
      db
        .from('organization_members')
        .select('user_id, role, joined_at')
        .eq('org_id', org.orgId)
        .order('joined_at'),
      db.rpc('organization_usage', { p_org_id: org.orgId }),
      canManageMembers(org.role)
        ? db
            .from('organization_invites')
            .select('id, email, role, expires_at, created_at')
            .eq('org_id', org.orgId)
            .is('accepted_at', null)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
    ])

  // Noms d'affichage : la table des membres ne porte que des identifiants.
  const ids = (members ?? []).map((m) => m.user_id)
  const { data: profiles } = ids.length
    ? await db
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids)
    : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] }
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))

  // Consommation individuelle, responsables uniquement.
  let perMember: Record<string, number> = {}
  if (canManageMembers(org.role)) {
    const { data: rows } = await db.rpc('organization_usage_by_member', {
      p_org_id: org.orgId,
    })
    for (const r of (rows ?? []) as { member_id: string; credits_used: number }[]) {
      perMember[r.member_id] = Number(r.credits_used)
    }
  }

  const used = Number(usage ?? 0)
  const limit = orgCreditLimit(org)

  return NextResponse.json({
    organization: {
      id: org.orgId,
      name: org.name,
      slug: org.slug,
      seats: org.seats,
      creditsPerSeat: org.creditsPerSeat,
      role: org.role,
      credits: { used, limit, remaining: Math.max(0, limit - used) },
    },
    members: (members ?? []).map((m) => ({
      id: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      name: byId.get(m.user_id)?.display_name ?? null,
      avatarUrl: byId.get(m.user_id)?.avatar_url ?? null,
      isYou: m.user_id === userId,
      creditsUsed: perMember[m.user_id],
    })),
    invites: invites ?? [],
  })
}
