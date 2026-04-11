import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID requis' }, { status: 400 })
    }

    // Générer un token unique pour l'extension
    const token = `nxr_${Date.now()}_${createHash('sha256').update(`${userId}_${Date.now()}_${Math.random()}`).digest('hex').slice(0, 32)}`
    
    // Stocker le token dans la base (table api_keys)
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Extension VS Code',
        key_prefix: token.slice(0, 10),
        key_hash: createHash('sha256').update(token).digest('hex'),
        permissions: { chat: true, completion: true, generation: true },
        rate_limit_per_minute: 60,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création API key:', error)
      return NextResponse.json({ error: 'Erreur création token' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      token,
      keyId: data.id 
    })
  } catch (err) {
    console.error('Generate token error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}