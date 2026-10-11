import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cacheGet, cacheSet, isDistributedCacheConfigured } from '@/lib/upstash-cache'

/** Client serveur : ces tables ont RLS actif sans politique, seule la clé de service écrit. */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Limite grossière par IP. Un formulaire public sans frein se fait inonder
 * dès qu'un robot le découvre — et chaque soumission déclenche un e-mail.
 */
export async function rateLimited(key: string, max: number, windowSeconds: number) {
  if (!isDistributedCacheConfigured) return false
  const hits = (await cacheGet<number>(key)) ?? 0
  if (hits >= max) return true
  await cacheSet(key, hits + 1, windowSeconds)
  return false
}

export const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })
