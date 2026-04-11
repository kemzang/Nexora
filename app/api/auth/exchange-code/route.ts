import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { code, state } = await req.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    }

    // Vérifier que le code existe et n'a pas expiré
    const codeHash = createHash('sha256').update(code).digest('hex')
    const { data: authCodeData, error: codeError } = await supabase
      .from('api_keys')
      .select('user_id, expires_at, is_active')
      .eq('key_hash', codeHash)
      .eq('is_active', true)
      .single()

    if (codeError || !authCodeData) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 })
    }

    // Vérifier l'expiration
    if (new Date(authCodeData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré' }, { status: 400 })
    }

    // Désactiver le code d'autorisation (usage unique)
    await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('key_hash', codeHash)

    // Générer un token d'accès permanent pour l'extension
    const accessToken = `nxr_${Date.now()}_${createHash('sha256').update(`${authCodeData.user_id}_${Date.now()}_${Math.random()}`).digest('hex').slice(0, 32)}`
    
    const { error: tokenError } = await supabase
      .from('api_keys')
      .insert({
        user_id: authCodeData.user_id,
        name: 'Extension VS Code',
        key_prefix: accessToken.slice(0, 10),
        key_hash: createHash('sha256').update(accessToken).digest('hex'),
        permissions: { chat: true, completion: true, generation: true },
        rate_limit_per_minute: 60,
        is_active: true,
      })

    if (tokenError) {
      console.error('Erreur création token:', tokenError)
      return NextResponse.json({ error: 'Erreur création token' }, { status: 500 })
    }

    // Récupérer les infos utilisateur
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', authCodeData.user_id)
      .single()

    return NextResponse.json({ 
      success: true, 
      access_token: accessToken,
      token_type: 'Bearer',
      user: {
        id: authCodeData.user_id,
        name: userData?.display_name || 'Utilisateur',
      },
      state 
    })
  } catch (err) {
    console.error('Exchange code error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}