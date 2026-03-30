import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/resend'
import { supabase } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // Générer le lien de reset via Supabase
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { error: supaError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    })

    if (supaError) {
      console.error('Supabase reset error:', supaError)
      // On ne révèle pas si l'email existe ou non (sécurité)
    }

    // Envoyer aussi notre email custom via Resend
    const resetLink = `${appUrl}/auth/reset-password`
    await sendPasswordResetEmail({
      to: email,
      userName: email.split('@')[0],
      resetLink,
    })

    // Toujours retourner succès (ne pas révéler si l'email existe)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
