import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth-verify'
import { rerankDocuments } from '@/lib/rerank'
import { captureServerError } from '@/lib/sentry'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CANDIDATE_LIMIT = 40
const RESULT_LIMIT = 15

/**
 * GET /api/collab/search?q=<texte>
 * Recherche dans l'historique des messages de collaboration de l'utilisateur
 * (tous ses salons, actifs ou fermés) — pas juste le salon courant. Filtre
 * par mot-clé (ILIKE) pour constituer les candidats, puis réordonne par
 * pertinence sémantique via Cohere si une clé est configurée (repli sur
 * l'ordre chronologique sinon — voir lib/rerank.ts).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const userId = await verifyToken(authHeader.slice(7))
    if (!userId) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'Requête trop courte' }, { status: 400 })
    }

    // Salons où l'utilisateur est membre (couvre aussi les salons qu'il possède,
    // puisque le propriétaire est ajouté à room_members à la création).
    const { data: memberships } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId)

    const roomIds = (memberships ?? []).map((m: { room_id: string }) => m.room_id)
    if (roomIds.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const { data: candidates, error } = await supabase
      .from('collab_messages')
      .select('id, room_id, sender_name, role, content, created_at')
      .in('room_id', roomIds)
      .in('role', ['user', 'assistant'])
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(CANDIDATE_LIMIT)

    if (error) {
      captureServerError(error, { route: 'collab/search', userId })
      return NextResponse.json({ error: 'Erreur de recherche' }, { status: 500 })
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const { data: rooms } = await supabase
      .from('collaboration_rooms')
      .select('id, name')
      .in('id', [...new Set(candidates.map((c) => c.room_id))])
    const roomNames = new Map((rooms ?? []).map((r: { id: string; name: string }) => [r.id, r.name]))

    const { results: ranked } = await rerankDocuments(
      q,
      candidates.map((c) => c.content),
      RESULT_LIMIT,
    )

    const results = ranked.map((r) => {
      const msg = candidates[r.index]
      return {
        messageId: msg.id,
        roomId: msg.room_id,
        roomName: roomNames.get(msg.room_id) ?? 'Session Nexora',
        senderName: msg.sender_name,
        role: msg.role,
        content: msg.content,
        createdAt: msg.created_at,
        relevanceScore: r.relevance_score,
      }
    })

    return NextResponse.json({ results })
  } catch (err) {
    captureServerError(err, { route: 'collab/search' })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
