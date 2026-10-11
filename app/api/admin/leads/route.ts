import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Revue des demandes Enterprise et start-up.
 *
 * L'acces est reserve aux adresses listees dans ADMIN_EMAILS. On verifie le
 * jeton porte par la requete aupres de Supabase plutot que de faire confiance
 * a un identifiant envoye par le client — sans quoi n'importe qui pourrait
 * lire les coordonnees de tous les prospects.
 */
function admins(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
}

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await service().auth.getUser(token)
  if (error || !data.user?.email) return null
  const email = data.user.email.toLowerCase()
  return admins().includes(email) ? email : null
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = service()
  const [ent, start] = await Promise.all([
    db.from('enterprise_leads').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('startup_applications').select('*').order('created_at', { ascending: false }).limit(200),
  ])
  if (ent.error || start.error) {
    console.error('[admin leads] read failed', ent.error ?? start.error)
    return NextResponse.json({ error: 'Read failed' }, { status: 500 })
  }
  return NextResponse.json({ enterprise: ent.data, startups: start.data })
}

const ENT_STATUS = ['new', 'contacted', 'won', 'lost']
const APP_STATUS = ['pending', 'approved', 'rejected']

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { table, id, status, notes, discountPercent, discountUntil } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = service()
  if (table === 'enterprise') {
    if (status && !ENT_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { error } = await db.from('enterprise_leads')
      .update({ ...(status && { status }), ...(notes !== undefined && { notes }) })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  } else if (table === 'startup') {
    if (status && !APP_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { error } = await db.from('startup_applications')
      .update({
        ...(status && { status, reviewed_at: new Date().toISOString() }),
        ...(notes !== undefined && { notes }),
        ...(discountPercent !== undefined && { discount_percent: discountPercent }),
        ...(discountUntil !== undefined && { discount_until: discountUntil }),
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
