import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Le compte courant est-il administrateur ?
 *
 * Sert uniquement a masquer l'entree « Leads » de la barre laterale. La
 * verification qui protege reellement les donnees reste celle de
 * /api/admin/leads — masquer une entree de menu n'est pas une securite, c'est
 * du confort : un utilisateur ordinaire n'a pas a voir un onglet qui lui
 * repondra « restricted ».
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ admin: false })

  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (admins.length === 0) return NextResponse.json({ admin: false })

  const { data, error } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  ).auth.getUser(token)

  if (error || !data.user?.email) return NextResponse.json({ admin: false })
  return NextResponse.json({ admin: admins.includes(data.user.email.toLowerCase()) })
}
