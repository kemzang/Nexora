import { NextRequest, NextResponse } from 'next/server'

// ── Rate limiting ────────────────────────────────────────────────────────────
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured (production),
// falls back to in-memory sliding window for local dev.
const RATE_WINDOW_MS = 60_000
const RATE_MAX_REQUESTS = 120

// L'autocomplétion (FIM) tourne en tâche de fond pendant que l'utilisateur
// tape dans son éditeur — des dizaines de requêtes courtes par minute sont
// normales et attendues. Avant ce correctif, elle partageait le MÊME
// compteur `rl:${ip}` que le chat (et web/crawl/collab/keys/payments) :
// une session de code active pouvait épuiser à elle seule les 120
// requêtes/60s, laissant le chat bloqué en "429 Rate limit exceeded" en
// permanence, même après une longue attente — ce n'était jamais une vraie
// rafale de chat, juste l'autocomplétion qui remplissait le même seau en
// continu. Seau séparé, plus généreux, pour ne plus jamais affamer le chat.
const RATE_LIMIT_BUCKETS: Record<string, number> = {
  autocomplete: 600,
  default: RATE_MAX_REQUESTS,
}

function getRateLimitBucket(pathname: string): { bucket: string; max: number } {
  const isCompletionsPath =
    pathname.includes('/model-proxy/v1/fim/completions') ||
    (pathname.includes('/model-proxy/v1/completions') && !pathname.includes('/chat/completions'))
  if (isCompletionsPath) {
    return { bucket: 'autocomplete', max: RATE_LIMIT_BUCKETS.autocomplete }
  }
  return { bucket: 'default', max: RATE_LIMIT_BUCKETS.default }
}

// In-memory fallback (single-instance only)
const localWindows = new Map<string, number[]>()

function localRateLimit(ip: string, bucket: string, max: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const key = `${ip}:${bucket}`
  const hits = (localWindows.get(key) ?? []).filter(t => t > now - RATE_WINDOW_MS)
  hits.push(now)
  localWindows.set(key, hits)
  const remaining = Math.max(0, max - hits.length)
  const resetIn = Math.ceil(((hits[0] ?? now) + RATE_WINDOW_MS - now) / 1000)
  return { allowed: hits.length <= max, remaining, resetIn }
}

async function upstashRateLimit(
  ip: string,
  bucket: string,
  max: number,
  url: string,
  token: string,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `rl:${ip}:${bucket}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - 60

  // Use Upstash REST API directly — no SDK needed in Edge runtime
  const pipeline = [
    ['ZREMRANGEBYSCORE', key, '-inf', windowStart],
    ['ZADD', key, now, `${now}-${Math.random()}`],
    ['ZCARD', key],
    ['EXPIRE', key, 60],
  ]

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pipeline),
  })

  if (!res.ok) {
    // Upstash unavailable — fail open with in-memory fallback
    return localRateLimit(ip, bucket, max)
  }

  const results: { result: number }[] = await res.json()
  const count = results[2]?.result ?? 0
  const remaining = Math.max(0, max - count)
  return { allowed: count <= max, remaining, resetIn: 60 }
}

async function checkRateLimit(ip: string, bucket: string, max: number): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    return upstashRateLimit(ip, bucket, max, upstashUrl, upstashToken)
  }
  return localRateLimit(ip, bucket, max)
}

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://nexora-mu-henna.vercel.app',
  'vscode-webview://',
  'vscode-file://',
  'http://localhost:3000',
  'http://localhost:5173',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    !origin ||
    ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ||
    /^vscode-/.test(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Nexora-Version',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  // Model-proxy + web/crawl proxy: auth pre-check + distributed rate limit.
  // /api/proxy/web and /api/proxy/crawl call a paid third-party (Tavily) with
  // Nexora's own key, same as model-proxy calls paid LLM providers — without
  // this they'd have real auth (verifyToken, inside the route handler) but no
  // rate limit, so a valid token could burn the whole Tavily quota alone.
  //
  // collab/rooms and keys/create use the exact same Bearer nxr_/eyJ contract
  // (verifyToken() inside the route, 401 without it) — same treatment closes
  // the same gap: unlimited room/key creation for any authenticated account.
  const RATE_LIMITED_PREFIXES = [
    '/api/proxy/model-proxy/',
    '/api/proxy/web',
    '/api/proxy/crawl',
    '/api/collab/rooms',
    '/api/collab/search',
    '/api/keys/create',
  ]
  if (RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization header missing', hint: 'Send: Authorization: Bearer <nexora_token>' },
        { status: 401, headers: corsHeaders },
      )
    }

    const looksValid = token.startsWith('nxr_') || token.startsWith('eyJ')
    if (!looksValid) {
      return NextResponse.json(
        { error: 'Invalid token format', hint: 'Token must start with nxr_ or be a valid JWT' },
        { status: 401, headers: corsHeaders },
      )
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    const { bucket, max } = getRateLimitBucket(pathname)
    const { allowed, remaining, resetIn } = await checkRateLimit(ip, bucket, max)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: resetIn },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': String(resetIn),
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + resetIn),
          },
        },
      )
    }

    const res = NextResponse.next()
    Object.entries({
      ...corsHeaders,
      'X-RateLimit-Limit': String(max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + resetIn),
      'X-Accel-Buffering': 'no',
    }).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  if (pathname.startsWith('/api/proxy/') || pathname.startsWith('/api/auth/')) {
    const res = NextResponse.next()
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // payments/* (auth optionnelle selon la route — pas le meme contrat
  // nxr_/eyJ strict que ci-dessus) et le webhook Lemon Squeezy (authentifie
  // par signature HMAC a l'interieur du handler, pas par Bearer token) :
  // rate-limit IP seule, sans exiger de format de token en amont, pour ne
  // pas casser leur logique d'auth existante tout en fermant le meme trou
  // (aucune limite de debit avant aujourd'hui).
  const IP_ONLY_RATE_LIMITED_PREFIXES = [
    '/api/payments/',
    '/api/webhooks/lemonsqueezy',
    '/api/webhooks/paddle',
  ]
  if (IP_ONLY_RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    // Seau dédié : ne partage plus le compteur avec le chat/autocomplete
    // (avant ce correctif, tout passait par la même clé `rl:${ip}`).
    const { allowed, remaining, resetIn } = await checkRateLimit(ip, 'payments', RATE_MAX_REQUESTS)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: resetIn },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': String(resetIn),
            'X-RateLimit-Limit': String(RATE_MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + resetIn),
          },
        },
      )
    }

    const res = NextResponse.next()
    Object.entries({
      ...corsHeaders,
      'X-RateLimit-Limit': String(RATE_MAX_REQUESTS),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + resetIn),
    }).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/proxy/:path*',
    '/api/auth/:path*',
    '/api/collab/:path*',
    '/api/keys/:path*',
    '/api/payments/:path*',
    '/api/webhooks/:path*',
  ],
}
