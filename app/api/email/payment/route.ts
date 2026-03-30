import { NextRequest, NextResponse } from 'next/server'
import { sendPaymentConfirmation } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const { email, userName, planName, amount, cardLast4 } = await req.json()

    if (!email || !planName) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const { data, error } = await sendPaymentConfirmation({
      to: email,
      userName: userName || 'Utilisateur',
      planName,
      amount,
      cardLast4,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Payment email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
