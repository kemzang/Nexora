import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { paddleApiBaseUrl } from '@/lib/paddle'

// ── Lien PDF de facture, généré à la demande ─────────────────────────────────
// Les liens renvoyés par l'API Paddle expirent après 1h — on ne les stocke
// jamais en base (voir invoices.pdf_url, laissé null). `stripe_payment_intent_id`
// garde l'id de transaction Paddle nécessaire pour redemander un lien frais.
const API_URL = paddleApiBaseUrl()
const UPSTREAM_TIMEOUT_MS = 15_000

function makeClient(userToken?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    userToken ? { global: { headers: { Authorization: `Bearer ${userToken}` } } } : {},
  )
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.PADDLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
    }

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const anonClient = makeClient()
    const { data: { user } } = await anonClient.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const invoiceId = req.nextUrl.searchParams.get('id')
    if (!invoiceId) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })

    const admin = makeClient()
    // La condition user_id=user.id est ce qui empêche un utilisateur de lire
    // la facture d'un autre — jamais confier ce filtre au seul client.
    const { data: invoice } = await admin
      .from('invoices')
      .select('id, user_id, stripe_payment_intent_id')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!invoice || !invoice.stripe_payment_intent_id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    let upstreamResp: Response
    try {
      upstreamResp = await fetch(`${API_URL}/transactions/${invoice.stripe_payment_intent_id}/invoice`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
    } catch (err) {
      console.error('[paddle invoice-pdf] upstream fetch failed:', err)
      return NextResponse.json({ error: 'Could not reach the billing provider' }, { status: 502 })
    }

    if (!upstreamResp.ok) {
      const detail = await upstreamResp.text().catch(() => '')
      console.error(`[paddle invoice-pdf] upstream error ${upstreamResp.status}:`, detail)
      return NextResponse.json({ error: `Billing provider error (${upstreamResp.status})` }, { status: 502 })
    }

    const json = await upstreamResp.json()
    const url = json?.data?.url
    if (!url) {
      return NextResponse.json({ error: 'Unexpected response from the billing provider' }, { status: 502 })
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[paddle invoice-pdf] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
