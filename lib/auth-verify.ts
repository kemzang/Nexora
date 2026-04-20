import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// Vérifie un token (soit Supabase natif, soit token custom nxr_...)
// Retourne le user_id ou null
export async function verifyToken(token: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Token Supabase natif (JWT)
  if (!token.startsWith('nxr_')) {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user.id
  }

  // Token custom généré par exchange-code
  const tokenHash = createHash('sha256').update(token).digest('hex')
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
