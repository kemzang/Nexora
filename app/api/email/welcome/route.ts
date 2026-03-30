import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const { email, userName } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const { data, error } = await sendWelcomeEmail({
      to: email,
      userName: userName || 'Utilisateur',
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
