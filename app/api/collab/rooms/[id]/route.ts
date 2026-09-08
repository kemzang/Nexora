import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth-verify'
import { captureServerError } from '@/lib/sentry'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * GET /api/collab/rooms/[id]
 * Infos d'un salon pour un membre existant — permet de rouvrir une session
 * (notamment fermée, is_active=false) sans repasser par le lien d'invitation,
 * par exemple depuis un résultat de recherche dans l'historique.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roomId } = await params
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const userId = await verifyToken(authHeader.slice(7))
    if (!userId) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: room, error } = await supabase
      .from('collaboration_rooms')
      .select('id, name, is_active, created_at')
      .eq('id', roomId)
      .single()

    if (error || !room) {
      return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 })
    }

    return NextResponse.json({ room })
  } catch (err) {
    captureServerError(err, { route: 'collab/rooms/[id]', roomId })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
