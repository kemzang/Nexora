/**
 * The response shape MUST match what ControlPlaneClient.listOrganizations()
 * expects: { organizations: OrganizationDescription[] } — NOT a bare array.
 * (Unlike list-assistants, which the extension reads as a raw array — each
 * route has its own contract, checked against core/control-plane/client.ts.)
 * Getting this wrong doesn't error here: resp.json() succeeds, but
 * `const { organizations } = ...` silently yields undefined, which crashes
 * ConfigHandler.getOrgs() on orgDescriptions.map() and forces a fallback to
 * an unauthenticated local profile — that's what caused it before.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth-verify'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const userId = await verifyToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single()

    // Retourner l'organisation au format Nexora Hub
    const organizations = [
      {
        id: userId,
        name: profile?.display_name || 'Utilisateur',
        slug: 'nexora',
        iconUrl: profile?.avatar_url || null,
        role: 'member',
      }
    ]

    return NextResponse.json({ organizations })
  } catch (err) {
    console.error('list-organizations error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
