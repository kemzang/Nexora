import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { PLANS } from '@/lib/models'
import { getUserPlan, isMonthlyCallLimitReached, recordCall, isGlobalCallLimitReached } from '@/lib/quota'
import { isFreeQuotaBlocked } from '@/lib/machineAccounts'

export const runtime = 'nodejs'

// ── Config ───────────────────────────────────────────────────────────────────
// Backs the fallback docs-site crawler (core/indexing/docs/crawlers/DefaultCrawler.ts)
// used by the codebase-docs-awareness feature in the Nexora client. Replaces
// Continue Dev Inc.'s third-party trial proxy with our own Tavily account.
const TAVILY_CRAWL_URL = 'https://api.tavily.com/crawl'

/**
 * Plafond mensuel global, tous utilisateurs confondus.
 *
 * Un crawl consomme plusieurs credits Tavily, davantage qu'une recherche.
 * Le compteur est distinct de celui de la recherche : deux robinets, deux
 * vannes, pour pouvoir en fermer un sans fermer l'autre.
 */
const TAVILY_MONTHLY_CAP = Number(process.env.TAVILY_CRAWL_MONTHLY_CAP) || 200
const UPSTREAM_TIMEOUT_MS = 45_000
// Tavily's documented supported range for max_depth is 1-5.
const MAX_DEPTH = 5
// The client's default caller (DocsCrawler) asks for up to 1000 pages — far
// more than we want to spend Tavily credits on for a single crawl. Cap hard
// rather than passing that straight upstream.
const MAX_LIMIT = 50

interface TavilyCrawlResult {
  url?: string
  raw_content?: string
}

interface TavilyCrawlResponse {
  results?: TavilyCrawlResult[]
}

// Shape expected by core/indexing/docs/crawlers/DocsCrawler.ts PageData.
interface PageData {
  url: string
  path: string
  content: string
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth — same scheme as every other /api/proxy/* route.
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = await verifyToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Input validation ────────────────────────────────────────────────────
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
    }
    const { startUrl, maxDepth, limit } = body as {
      startUrl?: unknown
      maxDepth?: unknown
      limit?: unknown
    }

    if (typeof startUrl !== 'string' || startUrl.trim().length === 0) {
      return NextResponse.json({ error: 'startUrl must be a non-empty string' }, { status: 400 })
    }
    let parsedUrl: URL
    try {
      parsedUrl = new URL(startUrl)
    } catch {
      return NextResponse.json({ error: 'startUrl must be a valid URL' }, { status: 400 })
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'startUrl must use http or https' }, { status: 400 })
    }

    let effectiveDepth = 4
    if (maxDepth !== undefined) {
      if (typeof maxDepth !== 'number' || !Number.isFinite(maxDepth) || maxDepth <= 0) {
        return NextResponse.json({ error: 'maxDepth must be a positive number' }, { status: 400 })
      }
      // Clamp rather than reject — the client's default config asks for a
      // depth of 4, which is legitimate; only the upstream ceiling matters.
      effectiveDepth = Math.min(Math.floor(maxDepth), MAX_DEPTH)
    }

    let effectiveLimit = MAX_LIMIT
    if (limit !== undefined) {
      if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
        return NextResponse.json({ error: 'limit must be a positive number' }, { status: 400 })
      }
      // Clamp rather than reject — see MAX_LIMIT comment above.
      effectiveLimit = Math.min(Math.floor(limit), MAX_LIMIT)
    }

    // ── Provider configured? ────────────────────────────────────────────────
    const apiKey = process.env.TAVILY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'web crawl not configured' }, { status: 503 })
    }

    // ── Quota — Tavily bills per call, so cap it per plan/month like model
    // tokens (see lib/quota.ts). Independent of the flat per-IP rate limit in
    // middleware.ts, which only guards against short bursts, not sustained
    // monthly cost from a single valid token.
    const userPlan = await getUserPlan(userId)

    /*
     * Deux garde-fous qui manquaient ici alors qu'ils existaient pour la
     * recherche web — et le crawl coute PLUS de credits Tavily qu'une
     * recherche.
     *
     * Le premier : au-dela de deux comptes gratuits par machine, plus de
     * credits offerts. Le second : un plafond mensuel tous utilisateurs
     * confondus, parce que les limites par compte n'empechent pas leur
     * somme de depasser le quota du fournisseur, apres quoi « Pay as you
     * go » facture au lieu d'arreter.
     */
    if (userPlan === 'free' && (await isFreeQuotaBlocked(null, userId))) {
      return NextResponse.json(
        {
          error: 'Monthly free credits are not available on this account.',
          code: 'FREE_QUOTA_BLOCKED',
        },
        { status: 429 },
      )
    }

    if (await isGlobalCallLimitReached('web_crawl', TAVILY_MONTHLY_CAP)) {
      const now = new Date()
      const retryAfter = Math.ceil(
        (Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - now.getTime()) / 1000,
      )
      return NextResponse.json(
        {
          error:
            'Documentation crawling is temporarily unavailable. It will be back at the start of next month.',
          code: 'WEB_CRAWL_SERVICE_LIMIT',
          retry_after: retryAfter,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    const crawlLimit = PLANS[userPlan].webCrawlsPerMonth
    if (await isMonthlyCallLimitReached(userId, 'web_crawl', crawlLimit)) {
      const now = new Date()
      const retryAfter = Math.ceil(
        (new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()) / 1000,
      )
      return NextResponse.json(
        {
          error: `Monthly web crawl limit reached (${crawlLimit}). Upgrade your plan to continue.`,
          code: 'WEB_CRAWL_LIMIT_REACHED',
          plan: userPlan,
          limit: crawlLimit,
          retry_after: retryAfter,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    // ── Upstream call ───────────────────────────────────────────────────────
    let upstreamResp: Response
    try {
      upstreamResp = await fetch(TAVILY_CRAWL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
          max_depth: effectiveDepth,
          limit: effectiveLimit,
          extract_depth: 'basic',
          format: 'markdown',
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError'
      console.error('[proxy/crawl] upstream fetch failed:', err)
      return NextResponse.json(
        { error: timedOut ? 'Crawl timed out' : 'Failed to reach crawl provider' },
        { status: 502 },
      )
    }

    if (!upstreamResp.ok) {
      let detail = ''
      try {
        detail = (await upstreamResp.text()).slice(0, 500)
      } catch {
        // ignore — best-effort detail only
      }
      console.error(`[proxy/crawl] upstream error ${upstreamResp.status}:`, detail)
      return NextResponse.json(
        { error: `Crawl provider error (${upstreamResp.status})` },
        { status: upstreamResp.status === 429 ? 429 : 502 },
      )
    }

    let data: TavilyCrawlResponse
    try {
      data = await upstreamResp.json()
    } catch {
      return NextResponse.json({ error: 'Crawl provider returned invalid JSON' }, { status: 502 })
    }

    const results = Array.isArray(data.results) ? data.results : []
    const pages: PageData[] = results
      .filter((r): r is TavilyCrawlResult & { url: string } => typeof r.url === 'string')
      .map((r) => {
        let path = r.url
        try {
          path = new URL(r.url).pathname || '/'
        } catch {
          // Keep the raw url as a fallback path if it somehow doesn't parse.
        }
        return {
          url: r.url,
          path,
          content: r.raw_content ?? '',
        }
      })

    await recordCall(userId, 'web_crawl', { startUrl: parsedUrl.toString(), maxDepth: effectiveDepth, limit: effectiveLimit })

    return NextResponse.json(pages)
  } catch (err) {
    console.error('[proxy/crawl] error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
