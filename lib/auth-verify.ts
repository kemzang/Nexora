import { createClient } from '@supabase/supabase-js'

// Hash SHA-256 compatible Edge Runtime (Web Crypto API)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Vérifie un token (soit Supabase natif JWT, soit token custom nxr_...)
// Retourne le user_id ou null
export async function verifyToken(token: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Token custom généré par exchange-code
  if (token.startsWith('nxr_')) {
    const tokenHash = await sha256(token)
    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id, expires_at, is_active')
      .eq('key_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null
    return data.user_id
  }

  // Token Supabase natif (JWT)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user.id
}
