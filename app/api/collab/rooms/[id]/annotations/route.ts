import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth-verify'
import { captureServerError } from '@/lib/sentry'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function assertMember(roomId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single()
  return !!data
}

async function resolveUser(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) return verifyToken(auth.split(' ')[1])
  return null
}

/**
 * GET /api/collab/rooms/[id]/annotations
 * Toutes les annotations du salon (le client les regroupe par message_id) —
 * même pattern qu'un chargement complet des messages, pas de pagination par
 * message pour rester simple côté client.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params
  try {
    const userId = await resolveUser(req)
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (!(await assertMember(roomId, userId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: annotations, error } = await supabase
      .from('collab_annotations')
      .select('id, message_id, author_id, author_name, content, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (error) {
      captureServerError(error, { route: 'collab/annotations/GET', roomId })
      return NextResponse.json({ error: 'Erreur lecture annotations' }, { status: 500 })
    }

    return NextResponse.json({ annotations: annotations ?? [] })
  } catch (err) {
    captureServerError(err, { route: 'collab/annotations/GET', roomId })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * POST /api/collab/rooms/[id]/annotations
 * Ajoute un commentaire sur un message précis du salon.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params
  try {
    const userId = await resolveUser(req)
    if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (!(await assertMember(roomId, userId))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { messageId, content, authorName } = await req.json()
    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'messageId et content requis' }, { status: 400 })
    }

    const { data: message } = await supabase
      .from('collab_messages')
      .select('id')
      .eq('id', messageId)
      .eq('room_id', roomId)
      .single()
    if (!message) {
      return NextResponse.json({ error: 'Message introuvable dans ce salon' }, { status: 404 })
    }

    const { data: annotation, error } = await supabase
      .from('collab_annotations')
      .insert({
        message_id: messageId,
        room_id: roomId,
        author_id: userId,
        author_name: authorName?.trim() || 'Développeur',
        content: content.trim(),
      })
      .select()
      .single()

    if (error || !annotation) {
      captureServerError(error, { route: 'collab/annotations/POST', roomId })
      return NextResponse.json({ error: 'Erreur ajout annotation' }, { status: 500 })
    }

    return NextResponse.json({ annotation }, { status: 201 })
  } catch (err) {
    captureServerError(err, { route: 'collab/annotations/POST', roomId })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
