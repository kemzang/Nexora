import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { PLANS, type PlanId } from '@/lib/models'
import { captureServerError } from '@/lib/sentry'
import { sendPaymentConfirmation } from '@/lib/resend'

// ── Paddle webhook ───────────────────────────────────────────────────────────
// Configure in the Paddle dashboard (Developer Tools > Notifications) pointing
// at this route, subscribed to at least: subscription.created,
// subscription.updated, subscription.canceled, transaction.completed. Like
// the Lemon Squeezy webhook, this is the ONLY place that actually grants a
// paid plan — Paddle.js's client-side "success" callback is just UX, never
// trusted for access.
export const runtime = 'nodejs'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Paddle-Signature header format: "ts=<unix_ts>;h1=<hex_hmac>"
// Signed payload is `${ts}:${rawBody}`, HMAC-SHA256 with the webhook secret.
function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((p) => p.split('=') as [string, string]),
  )
  const ts = parts.ts
  const h1 = parts.h1
  if (!ts || !h1) return false

  const digest = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex')
  const a = Buffer.from(digest, 'utf8')
  const b = Buffer.from(h1, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

interface PaddlePayload {
  event_type: string
  data: {
    id: string
    status?: string
    subscription_id?: string | null
    invoice_number?: string | null
    currency_code?: string
    custom_data?: { user_id?: string; plan?: string } | null
    next_billed_at?: string | null
    current_billing_period?: { ends_at?: string } | null
    billing_period?: { starts_at?: string; ends_at?: string } | null
    scheduled_change?: { action?: string; effective_at?: string } | null
    details?: { totals?: { total?: string; tax?: string } }
  }
}

async function activateFromCustomData(
  reference: string,
  userId: string | undefined,
  planSlug: string | undefined,
  periodEnd: string | undefined,
): Promise<void> {
  if (!userId || !planSlug) {
    console.warn('[paddle webhook] missing user_id/plan in custom_data, cannot activate')
    return
  }
  const planCfg = PLANS[planSlug as PlanId]
  if (!planCfg) {
    console.warn(`[paddle webhook] unknown plan "${planSlug}"`)
    return
  }

  // Idempotent : déjà traité pour cette référence ?
  const { data: existing } = await admin
    .from('user_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', reference)
    .limit(1)
  if (existing && existing.length > 0) return

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id, tokens_per_month')
    .eq('slug', planSlug)
    .single()
  if (!plan) {
    console.warn(`[paddle webhook] plan "${planSlug}" absent de subscription_plans`)
    return
  }

  await admin
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'active')

  const now = new Date()
  const end = periodEnd ? new Date(periodEnd) : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

  const { error } = await admin.from('user_subscriptions').insert({
    user_id: userId,
    plan_id: plan.id,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
    tokens_remaining: plan.tokens_per_month,
    // Réutilise cette colonne comme clé d'idempotence générique (déjà le cas
    // pour NotchPay et Lemon Squeezy).
    stripe_subscription_id: reference,
  })
  if (error) console.error('[paddle webhook] insert user_subscriptions failed:', error.message)
}

async function renewSubscription(
  reference: string,
  periodEnd: string | undefined,
  scheduledChange: PaddlePayload['data']['scheduled_change'],
): Promise<void> {
  if (!periodEnd) return
  // `scheduled_change.action === 'cancel'` reflète une résiliation programmée
  // (via notre bouton ou le portail client Paddle) : on garde ce champ en
  // phase avec Paddle, quelle que soit son origine.
  const { error } = await admin
    .from('user_subscriptions')
    .update({
      current_period_end: new Date(periodEnd).toISOString(),
      status: 'active',
      cancel_at_period_end: scheduledChange?.action === 'cancel',
    })
    .eq('stripe_subscription_id', reference)
  if (error) console.error('[paddle webhook] renew failed:', error.message)
}

async function deactivateSubscription(reference: string): Promise<void> {
  const { error } = await admin
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', reference)
  if (error) console.error('[paddle webhook] deactivate failed:', error.message)
}

/**
 * Un événement transaction.completed = un paiement réellement encaissé
 * (premier paiement ou renouvellement) : c'est ce qui doit produire une
 * facture, pas subscription.created/updated qui ne reflètent que le cycle
 * de vie de l'abonnement. Le PDF n'est pas stocké ici (les liens Paddle
 * expirent après 1h) — voir app/api/payments/paddle/invoice-pdf, qui le
 * régénère à la demande à partir de `stripe_payment_intent_id` (id de
 * transaction Paddle, réutilisé comme les autres colonnes stripe_*).
 */
async function recordInvoiceAndNotify(txn: PaddlePayload['data']): Promise<void> {
  const subReference = txn.subscription_id ? `paddle_sub_${txn.subscription_id}` : undefined
  if (!subReference) {
    console.warn('[paddle webhook] transaction.completed without subscription_id, skipping invoice')
    return
  }

  // Idempotent : cette transaction a-t-elle déjà généré une facture ?
  const { data: existing } = await admin
    .from('invoices')
    .select('id')
    .eq('stripe_payment_intent_id', txn.id)
    .limit(1)
  if (existing && existing.length > 0) return

  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('id, user_id, subscription_plans(name)')
    .eq('stripe_subscription_id', subReference)
    .maybeSingle()
  if (!sub) {
    console.warn(`[paddle webhook] no user_subscriptions row for ${subReference}, skipping invoice`)
    return
  }

  const totalCents = Number(txn.details?.totals?.total ?? 0)
  const taxCents = Number(txn.details?.totals?.tax ?? 0)
  const now = new Date()
  const periodStart = txn.billing_period?.starts_at ? new Date(txn.billing_period.starts_at) : now
  const periodEnd = txn.billing_period?.ends_at ? new Date(txn.billing_period.ends_at) : now

  const { error } = await admin.from('invoices').insert({
    user_id: sub.user_id,
    subscription_id: sub.id,
    invoice_number: txn.invoice_number || `NEXORA-${txn.id}`,
    amount: totalCents / 100,
    tax_amount: taxCents / 100,
    currency: txn.currency_code || 'USD',
    status: 'paid',
    billing_period_start: periodStart.toISOString(),
    billing_period_end: periodEnd.toISOString(),
    stripe_payment_intent_id: txn.id,
  })
  if (error) {
    console.error('[paddle webhook] insert invoice failed:', error.message)
    return
  }

  try {
    const { data: authUser } = await admin.auth.admin.getUserById(sub.user_id)
    const email = authUser?.user?.email
    if (email) {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('display_name')
        .eq('id', sub.user_id)
        .maybeSingle()
      const planName = (sub as any).subscription_plans?.name || 'Nexora'
      await sendPaymentConfirmation({
        to: email,
        userName: (profile as any)?.display_name || email.split('@')[0],
        planName,
        amount: `${(totalCents / 100).toFixed(2)} ${txn.currency_code || 'USD'}`,
        cardLast4: '••••',
      })
    }
  } catch (err) {
    // Best-effort : une facture sans email n'est pas bloquant, mais on le trace.
    console.error('[paddle webhook] payment confirmation email failed:', err)
    captureServerError(err, { context: 'transaction.completed email', txnId: txn.id })
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[paddle webhook] PADDLE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const rawBody = await req.text()
  const valid = verifySignature(rawBody, req.headers.get('paddle-signature'), secret)
  if (!valid) {
    console.warn('[paddle webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: PaddlePayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload.event_type
  const customData = payload.data?.custom_data ?? undefined
  const subscriptionId = payload.data?.id
  const reference = subscriptionId ? `paddle_sub_${subscriptionId}` : undefined
  const periodEnd = payload.data?.next_billed_at ?? payload.data?.current_billing_period?.ends_at ?? undefined

  try {
    if (!reference) {
      console.warn('[paddle webhook] missing subscription id, ignoring event', eventType)
    } else {
      switch (eventType) {
        case 'subscription.created':
          await activateFromCustomData(reference, customData?.user_id, customData?.plan, periodEnd)
          break
        case 'subscription.updated':
          if (payload.data.status === 'active') {
            await renewSubscription(reference, periodEnd, payload.data.scheduled_change)
          } else if (payload.data.status === 'canceled' || payload.data.status === 'paused') {
            await deactivateSubscription(reference)
          }
          break
        case 'transaction.completed':
          // `reference` ci-dessus vaut `paddle_sub_<id de la transaction>`,
          // inutilisable ici (data.id est l'id de la TRANSACTION, pas de
          // l'abonnement) — recordInvoiceAndNotify lit le bon id lui-même
          // via `data.subscription_id`. Seule la garde `if (!reference)`
          // au-dessus nous intéressait (elle passe, data.id existe toujours).
          await recordInvoiceAndNotify(payload.data)
          break
        case 'subscription.canceled':
          await deactivateSubscription(reference)
          break
        default:
          // transaction.completed, subscription.activated, etc. — pas
          // d'action nécessaire, subscription.created/updated couvrent déjà
          // l'activation et le renouvellement.
          break
      }
    }
  } catch (err) {
    console.error('[paddle webhook] handler error:', err)
    captureServerError(err, { eventType, reference })
    // On répond quand même 200 : une erreur de notre côté ne doit pas
    // déclencher un déluge de re-essais Paddle pour un événement qu'on a déjà
    // reçu et logué.
  }

  return NextResponse.json({ received: true })
}
