import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { sendTicketReply } from '@/lib/supportEmails'
import { validerReponse } from '@/lib/supportTickets'

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

  // Le fil des reponses deja envoyees. Sans lui, on ne voit pas qu'on a
  // deja repondu — et on repond deux fois.
  const tickets = data ?? []
  let reponses: Record<string, unknown[]> = {}
  if (tickets.length > 0) {
    const { data: lignes, error: erreurReponses } = await db
      .from('support_ticket_replies')
      .select('id, ticket_id, author, body, email_sent, email_error, created_at')
      .in('ticket_id', tickets.map((t) => t.id))
      .order('created_at', { ascending: true })
    if (erreurReponses) {
      // Non bloquant : mieux vaut la liste des tickets sans les fils que
      // rien du tout.
      console.error('[admin/support] reponses illisibles:', erreurReponses)
    } else {
      reponses = (lignes ?? []).reduce<Record<string, unknown[]>>((acc, r) => {
        ;(acc[r.ticket_id] ||= []).push(r)
        return acc
      }, {})
    }
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

  return NextResponse.json({ tickets, counts: compteurs, replies: reponses })
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

/**
 * Repondre a un ticket depuis le panneau.
 *
 * L'ordre compte. On ENREGISTRE la reponse d'abord, on envoie ensuite : si
 * l'envoi echoue, le texte n'est pas perdu et l'echec est consigne a cote.
 * L'inverse — envoyer puis enregistrer — perdrait la trace d'un message
 * pourtant recu par le client.
 *
 * Le ticket ne passe a « answered » que si le courriel est bien parti.
 * Sortir de la file un ticket dont la reponse n'a jamais ete remise, c'est
 * exactement la facon d'abandonner quelqu'un sans s'en apercevoir.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const valide = validerReponse(body.body)
  if (!valide.ok) {
    return NextResponse.json({ error: valide.error }, { status: 400 })
  }

  const db = service()
  const { data: ticket, error: erreurTicket } = await db
    .from('support_tickets')
    .select('id, reference, email, subject')
    .eq('id', id)
    .single()

  if (erreurTicket || !ticket) {
    return NextResponse.json({ error: 'Unknown ticket' }, { status: 404 })
  }

  const { data: ligne, error: erreurInsertion } = await db
    .from('support_ticket_replies')
    .insert({ ticket_id: ticket.id, author: admin, body: valide.body })
    .select('id')
    .single()

  if (erreurInsertion || !ligne) {
    console.error('[admin/support] reponse non enregistree:', erreurInsertion)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const envoi = await sendTicketReply({
    reference: ticket.reference,
    email: ticket.email,
    subject: ticket.subject,
    body: valide.body,
  })

  await db
    .from('support_ticket_replies')
    .update({
      email_sent: envoi.ok,
      email_error: envoi.ok ? null : envoi.error.slice(0, 500),
    })
    .eq('id', ligne.id)

  if (envoi.ok) {
    await db
      .from('support_tickets')
      .update({
        status: 'answered',
        handled_by: admin,
        handled_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)
  }

  return NextResponse.json({
    success: true,
    emailSent: envoi.ok,
    // Le detail du refus sert a comprendre : adresse morte, domaine non
    // verifie, quota Resend atteint ne se corrigent pas de la meme facon.
    emailError: envoi.ok ? null : envoi.error,
  })
}
