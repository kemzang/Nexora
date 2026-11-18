import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { cacheDel } from '@/lib/upstash-cache'
import { paddleApiBaseUrl } from '@/lib/paddle'

export const runtime = 'nodejs'

/**
 * « J'ai paye et rien ne s'est active. »
 *
 * C'est la demande de support la plus frequente et la plus urgente — et la
 * plus facile a resoudre sans personne : dans la quasi-totalite des cas, le
 * paiement a bien eu lieu chez Paddle et seule la synchronisation a manque
 * (webhook perdu, onglet ferme avant le retour).
 *
 * Cette route relit donc l'etat chez Paddle et repare si besoin, avant que
 * l'utilisateur n'ouvre un ticket. Elle ne CREE jamais un abonnement que
 * Paddle ne confirme pas : la source de verite reste le fournisseur.
 */
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function paddle(chemin: string): Promise<any | null> {
  const cle = process.env.PADDLE_API_KEY
  if (!cle) return null
  try {
    const resp = await fetch(`${paddleApiBaseUrl()}${chemin}`, {
      headers: { Authorization: `Bearer ${cle}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) {
      console.warn('[support/check] Paddle a repondu', resp.status, chemin)
      return null
    }
    return await resp.json()
  } catch (e) {
    console.warn('[support/check] Paddle injoignable:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = service()
  const { data: auth } = await db.auth.getUser(token)
  if (!auth.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = auth.user.id
  const email = auth.user.email

  // 1. Ce que nous croyons savoir.
  const { data: locale } = await db
    .from('user_subscriptions')
    .select('status, current_period_end, subscription_plans!inner(slug)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  const planLocal = (locale?.subscription_plans as any)?.slug ?? null

  // 2. Ce que dit Paddle.
  const clients = await paddle(`/customers?email=${encodeURIComponent(email)}`)
  const customerId = clients?.data?.[0]?.id
  if (!customerId) {
    return NextResponse.json({
      state: planLocal ? 'ok' : 'no_payment_found',
      plan: planLocal,
      message: planLocal
        ? `Your ${planLocal} plan is active.`
        : 'We could not find any payment for this email address. If you paid with a different address, tell us which one below.',
    })
  }

  const abos = await paddle(`/subscriptions?customer_id=${customerId}`)
  const actif = (abos?.data ?? []).find(
    (s: any) => s.status === 'active' || s.status === 'trialing',
  )

  if (!actif) {
    return NextResponse.json({
      state: planLocal ? 'ok' : 'no_active_subscription',
      plan: planLocal,
      message: planLocal
        ? `Your ${planLocal} plan is active.`
        : 'Paddle knows your account but shows no active subscription. If you were charged, send us the receipt below.',
    })
  }

  // 3. Paddle dit actif et nous aussi : rien a faire.
  if (planLocal) {
    return NextResponse.json({
      state: 'ok',
      plan: planLocal,
      message: `Your ${planLocal} plan is active.`,
    })
  }

  // 4. Paddle dit actif, nous non : c'est exactement le cas a reparer.
  const priceId = actif.items?.[0]?.price?.id
  const slug = Object.entries({
    starter: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER,
    pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO,
    business: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS,
    enterprise: process.env.NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE,
  }).find(([, id]) => id && id === priceId)?.[0]

  if (!slug) {
    // On refuse de deviner : activer le mauvais forfait serait pire que de
    // ne rien faire.
    return NextResponse.json({
      state: 'needs_human',
      plan: null,
      message:
        'We found an active subscription but could not match it to a plan. Open a ticket below and we will sort it out.',
    })
  }

  const { data: plan } = await db
    .from('subscription_plans')
    .select('id, tokens_per_month')
    .eq('slug', slug)
    .single()
  if (!plan) {
    return NextResponse.json({
      state: 'needs_human',
      plan: null,
      message:
        'We found your subscription but could not activate it automatically. Open a ticket below.',
    })
  }

  const now = new Date()
  const { error } = await db.from('user_subscriptions').insert({
    user_id: userId,
    plan_id: plan.id,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end:
      actif.current_billing_period?.ends_at ??
      new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString(),
    tokens_remaining: plan.tokens_per_month,
    // Sert de clef d'idempotence, comme pour l'activation apres paiement.
    stripe_subscription_id: actif.id,
  })

  if (error) {
    console.error('[support/check] activation impossible:', error)
    return NextResponse.json({
      state: 'needs_human',
      plan: null,
      message:
        'We found your subscription but could not activate it automatically. Open a ticket below.',
    })
  }

  // Le proxy garde le plan en cache cinq minutes : sans cette invalidation,
  // l'utilisateur resterait sur son ancien quota au moment precis ou il
  // verifie que son achat a pris effet.
  await cacheDel(`plan:${userId}`, `usage:${userId}`, `created-at:${userId}`)

  return NextResponse.json({
    state: 'fixed',
    plan: slug,
    message: `Found it. Your ${slug} plan is now active — reload your editor and it will pick it up.`,
  })
}
