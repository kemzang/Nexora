import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Revue des tickets de support.
 *
 * Meme regle que pour les prospects : l'acces est reserve aux adresses de
 * ADMIN_EMAILS, et le jeton est verifie aupres de Supabase plutot que de
 * faire confiance a un identifiant envoye par le client.
 *
 * Il n'y a deliberement AUCUNE suppression. Fermer un ticket pose un etat et
 * une date ; la ligne reste consultable dans l'onglet « Closed ». C'est la
 * seule garantie qu'un ticket genant ne disparaisse pas d'un clic.
 */
function admins(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function requireAdmin(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await service().auth.getUser(token)
  if (error || !data.user?.email) return null
  const email = data.user.email.toLowerCase()
  return admins().includes(email) ? email : null
}

const ETATS = ['open', 'answered', 'closed'] as const

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const demande = req.nextUrl.searchParams.get('status') ?? 'open'
  const db = service()
  let query = db
    .from('support_tickets')
    .select(
      'id, reference, email, category, subject, message, context, status, admin_notes, handled_by, handled_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (demande !== 'all') {
    if (!ETATS.includes(demande as (typeof ETATS)[number])) {
      return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
    }
    query = query.eq('status', demande)
  }

  const { data, error } = await query
  if (error) {
    console.error('[admin/support] lecture impossible:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  // Les compteurs par etat : sans eux, on ne voit pas qu'il reste des
  // tickets dans un onglet qu'on n'a pas ouvert.
  const compteurs: Record<string, number> = {}
  for (const etat of ETATS) {
    const { count } = await db
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', etat)
    compteurs[etat] = count ?? 0
  }

  return NextResponse.json({ tickets: data ?? [], counts: compteurs })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  const status = String(body.status ?? '')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!ETATS.includes(status as (typeof ETATS)[number])) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
  }

  const notes =
    typeof body.admin_notes === 'string'
      ? body.admin_notes.slice(0, 5000)
      : undefined

  const { error } = await service()
    .from('support_tickets')
    .update({
      status,
      // On garde QUI a traite et QUAND : six mois plus tard, « pourquoi ce
      // ticket est-il ferme ? » doit avoir une reponse.
      handled_by: admin,
      handled_at: new Date().toISOString(),
      ...(notes !== undefined ? { admin_notes: notes } : {}),
    })
    .eq('id', id)

  if (error) {
    console.error('[admin/support] mise a jour impossible:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
