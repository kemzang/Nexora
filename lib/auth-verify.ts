import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cache en mémoire (valide pendant la durée de vie du serveur)
const tokenCache = new Map<string, { userId: string; expiresAt: number }>()

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyToken(token: string): Promise<string | null> {
  const cached = tokenCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId
  }

  // Token custom nxr_
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

    // Mettre en cache pour 5 minutes
    tokenCache.set(token, { userId: data.user_id, expiresAt: Date.now() + 5 * 60 * 1000 })
    return data.user_id
  }

  // Token Supabase natif (JWT)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  // Mettre en cache pour 5 minutes
  tokenCache.set(token, { userId: user.id, expiresAt: Date.now() + 5 * 60 * 1000 })
  return user.id
}
