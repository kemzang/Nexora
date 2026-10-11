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
 * Limite par IP, en deux temps.
 *
 * Une limite unique qui compte toutes les requetes punit la faute de frappe
 * autant que le robot : trois courriels mal saisis et le visiteur est bloque
 * une heure. On separe donc les deux. `tooManyAttempts` tolere largement les
 * essais — ils ne coutent qu'une validation — tandis que `recordSubmission`
 * plafonne ce qui a reellement un cout : une ligne en base et un e-mail.
 */
export async function tooManyAttempts(key: string, max = 20, windowSeconds = 3600) {
  if (!isDistributedCacheConfigured) return false
  const hits = (await cacheGet<number>(`${key}:try`) ?? 0) + 1
  await cacheSet(`${key}:try`, hits, windowSeconds)
  return hits > max
}

export async function tooManySubmissions(key: string, max = 3, windowSeconds = 3600) {
  if (!isDistributedCacheConfigured) return false
  return ((await cacheGet<number>(`${key}:ok`)) ?? 0) >= max
}

export async function recordSubmission(key: string, windowSeconds = 3600) {
  if (!isDistributedCacheConfigured) return
  const n = (await cacheGet<number>(`${key}:ok`)) ?? 0
  await cacheSet(`${key}:ok`, n + 1, windowSeconds)
}

export const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status })
