import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'
import { getEffectiveTokenLimit, type PlanId } from '@/lib/models'
import type { FimModelId } from '@/lib/modelRouter'
import { quotaWindow, secondsUntilReset } from '@/lib/billingWindow'
import { isFreeQuotaBlocked } from '@/lib/machineAccounts'
import { enArrierePlan } from '@/lib/arrierePlan'
import { getUserPlan } from '@/lib/quota'

export const runtime = 'nodejs'

// Duree max de la fonction. 60 s est le plafond du plan Vercel Hobby, donc
// cette valeur se deploie sur tous les plans. Sur un plan Pro, elle peut etre
// montee jusqu'a 300 pour les generations tres longues.
// Streaming LLM : voir chat/completions.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const usageCache = new Map<string, { total: number; expiresAt: number }>()
const createdAtCache = new Map<string, { createdAt: string; expiresAt: number }>()

// DeepSeek supports /completions (FIM) only via beta endpoint
const FIM_ROUTES: Partial<Record<FimModelId, { url: string; keyEnv: string }>> = {
  'deepseek-chat': {
    url: 'https://api.deepseek.com/beta/completions', // MUST use /beta for FIM
    keyEnv: 'DEEPSEEK_API_KEY',
  },
}

const FIM_PLAN_MIN: Record<FimModelId, PlanId> = {
  'deepseek-chat': 'free',
}

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'business', 'enterprise']

function planGte(a: PlanId, b: PlanId): boolean {
  return PLAN_ORDER.indexOf(a) >= PLAN_ORDER.indexOf(b)
}

/*
 * Le plan se lit dans `lib/quota.ts`, et nulle part ailleurs.
 *
 * Cette route en tenait sa propre copie, qui filtrait sur
 * `status = 'active'` SANS verifier `current_period_end`. Un abonnement
 * dont la periode est terminee mais dont le statut n'a pas encore bascule
 * — le temps qu'un webhook arrive, qu'un paiement echoue, ou qu'une
 * annulation prenne effet — continuait donc d'etre servi comme un
 * abonnement payant.
 *
 * Trois autres routes faisaient la verification correctement ; deux
 * l'oubliaient. C'est le propre d'une fonction recopiee : elle se
 * corrige a un endroit et reste fausse aux autres. Il n'y en a plus
 * qu'une, celle de `lib/quota.ts`, qui verifie la date de fin et partage
 * son cache.
 */

async function getUserCreatedAt(userId: string): Promise<string | undefined> {
  const cached = createdAtCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.createdAt
  const { data } = await supabase.auth.admin.getUserById(userId)
  const createdAt = data?.user?.created_at
  if (createdAt) createdAtCache.set(userId, { createdAt, expiresAt: Date.now() + 3_600_000 })
  return createdAt
}

async function checkMonthlyLimit(userId: string, plan: PlanId): Promise<string | null> {
  /*
   * Le palier gratuit ne vaut que pour les deux premiers comptes d'une meme
   * machine. Cette limite n'etait appliquee QUE dans chat/completions : un
   * troisieme compte perdait le chat offert mais gardait l'autocompletion,
   * les embeddings, le reclassement et la recherche web — tous factures a
   * Nexora, et l'autocompletion est la plus gourmande puisqu'elle part a
   * chaque pause de frappe. Les plans payants ne sont jamais concernes.
   */
  if (plan === 'free' && (await isFreeQuotaBlocked(supabase, userId))) {
    return '0'
  }

  const createdAt = await getUserCreatedAt(userId)
  const planLimit = getEffectiveTokenLimit(plan, createdAt)
  if (planLimit <= 0) return null
  const cached = usageCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.total >= planLimit ? planLimit.toString() : null
  }
  // Meme fenetre que le proxy de chat : l'autocompletion puise dans le meme
  // quota, les deux compteurs doivent repartir ensemble.
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('current_period_start, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .maybeSingle()
  const startOfMonth = quotaWindow({
    createdAt,
    periodStart: sub?.current_period_start as string | undefined,
    periodEnd: sub?.current_period_end as string | undefined,
  }).start.toISOString()
  const { data } = await supabase
    .from('usage_sessions')
    .select('tokens_input, tokens_total')
    .gte('started_at', startOfMonth)
    .eq('user_id', userId)
  const usage = (data ?? []).reduce((s, r) => s + (r.tokens_total ?? r.tokens_input ?? 0), 0)
  usageCache.set(userId, { total: usage, expiresAt: Date.now() + 60_000 })
  return usage >= planLimit ? planLimit.toString() : null
}

export async function POST(req: NextRequest) {
  /*
   * Ou passe le temps avant le premier octet ?
   *
   * Mesure du 24 novembre 2026 : 2,43 s avant le premier octet, puis
   * 0,3 s pour tout le reste. Le flux fonctionne donc, mais il demarre
   * trop tard : VS Code annule sa demande d'autocompletion entre 1,5 et
   * 3,7 s, et aucune suggestion n'a jamais pu s'afficher.
   *
   * Reste a savoir si ces secondes sont a nous — verification du jeton,
   * lecture du plan, calcul du quota, chacun un aller-retour de base —
   * ou si c'est DeepSeek qui met ce temps a produire son premier jeton.
   * Les deux se corrigent a des endroits opposes, et on ne peut pas
   * trancher de l'exterieur. Ces mesures repondent en une requete.
   */
  const t0 = Date.now()
  let tAuth = 0
  let tQuota = 0

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const userId = await verifyToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    tAuth = Date.now() - t0

    const body = await req.json()
    const {
      model = 'deepseek-chat',
      prompt,
      suffix,
      max_tokens = 256,
      temperature = 0,
      stop = ['\n\n'],
      stream = false,
    } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
    }

    const fimRoute = FIM_ROUTES[model as FimModelId]
    if (!fimRoute) {
      return NextResponse.json(
        { error: `FIM not supported for model "${model}". Supported: ${Object.keys(FIM_ROUTES).join(', ')}` },
        { status: 400 }
      )
    }

    const userPlan = await getUserPlan(userId)
    const minPlan = FIM_PLAN_MIN[model as FimModelId] || 'free'
    if (!planGte(userPlan, minPlan)) {
      return NextResponse.json(
        { error: `Model "${model}" requires ${minPlan} plan or higher. Current plan: ${userPlan}` },
        { status: 403 }
      )
    }

    // Autocomplétion ILLIMITÉE pour les plans payants (ne décompte pas les crédits,
    // comme Copilot/Cursor). Le Free reste plafonné — ça pousse à s'abonner.
    const autocompleteIsFree = userPlan !== 'free'
    if (!autocompleteIsFree) {
      const limitReached = await checkMonthlyLimit(userId, userPlan)
      if (limitReached) {
        const retryAfter = secondsUntilReset(await getUserCreatedAt(userId))
        return NextResponse.json(
          { error: `Monthly token limit reached (${limitReached}). Upgrade your plan.`, code: 'MONTHLY_LIMIT_REACHED', plan: userPlan, retry_after: retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
    }

    const apiKey = process.env[fimRoute.keyEnv]
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const fimBody: Record<string, unknown> = {
      model,
      prompt,
      max_tokens,
      temperature,
      stop,
      stream,
    }
    if (suffix !== undefined) fimBody.suffix = suffix

    tQuota = Date.now() - t0 - tAuth

    const tAvantModele = Date.now()
    const upstream = await fetch(fimRoute.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(fimBody),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text()
      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('retry-after') || '60'
        return NextResponse.json(
          { error: 'Upstream rate limit exceeded', retry_after: parseInt(retryAfter) },
          { status: 429, headers: { 'Retry-After': retryAfter } }
        )
      }
      console.error(`FIM upstream error [${upstream.status}]:`, errorText)
      return NextResponse.json({ error: errorText }, { status: upstream.status })
    }

    // Facturation : un insert tue est du quota consomme et jamais
    // compte. `enArrierePlan` garde la fonction vivante le temps de
    // l'ecriture, sans faire attendre la reponse.
    enArrierePlan(
      supabase.from('usage_sessions').insert({
        user_id: userId,
        started_at: new Date().toISOString(), // requis pour le filtre mensuel (dashboard + quota)
        session_type: 'fim',
        model_id: model,
        tokens_input: Math.ceil(prompt.length / 4),
        // Plans payants : autocomplétion gratuite → tokens_total: 0 (n'entame pas le quota).
        // Free : on laisse tokens_total absent → le quota compte via tokens_input.
        ...(autocompleteIsFree ? { tokens_total: 0 } : {}),
        metadata: { model, max_tokens, autocompleteFree: autocompleteIsFree },
      }),
      'usage_sessions',
    )

    if (stream) {
      return new NextResponse(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          // Lisible par `curl -D-` et par l'onglet reseau du navigateur.
          'Server-Timing': [
            `auth;dur=${tAuth}`,
            `quota;dur=${tQuota}`,
            `model;dur=${Date.now() - tAvantModele}`,
          ].join(', '),
        },
      })
    }

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('completions proxy error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
