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
  // `?archived=1` montre la corbeille. Par defaut on ne sert que l'actif :
  // les archives ne doivent pas encombrer la revue quotidienne, mais elles
  // restent consultables — c'est tout l'interet de ne pas les supprimer.
  const showArchived = req.nextUrl.searchParams.get('archived') === '1'
  const scope = (q: any) => (showArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null))
  const [ent, start] = await Promise.all([
    scope(db.from('enterprise_leads').select('*')).order('created_at', { ascending: false }).limit(200),
    scope(db.from('startup_applications').select('*')).order('created_at', { ascending: false }).limit(200),
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
  const admin = await requireAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { table, id, status, notes, discountPercent, discountUntil, archived } =
    await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = service()
  /*
   * Archiver, pas supprimer.
   *
   * La ligne reste en base, horodatee et signee de qui l'a ecartee : on peut
   * revenir sur un clic malheureux, et retrouver un prospect mis de cote trop
   * vite. `archived: false` le remet dans la liste.
   *
   * L'effacement reel existe, mais seulement en SQL a la main : une demande
   * RGPD l'exige, et ce n'est pas un geste qu'on doit pouvoir faire d'un clic.
   */
  const archiveFields =
    archived === undefined
      ? {}
      : archived
        ? { archived_at: new Date().toISOString(), archived_by: admin }
        : { archived_at: null, archived_by: null }
  if (table === 'enterprise') {
    if (status && !ENT_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { error } = await db.from('enterprise_leads')
      .update({ ...(status && { status }), ...(notes !== undefined && { notes }), ...archiveFields })
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
        ...archiveFields,
      })
      .eq('id', id)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  } else {
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
