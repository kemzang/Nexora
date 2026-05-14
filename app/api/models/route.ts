import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'
import { getModelsForPlan, MODELS, type ModelId, type PlanId, PLANS } from '@/lib/models'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserPlan(userId: string): Promise<PlanId> {
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!sub) return 'free'

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('slug')
    .eq('id', sub.plan_id)
    .single()

  return (plan?.slug as PlanId) || 'free'
}

export async function GET(req: NextRequest) {
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

    const userPlan = await getUserPlan(userId)
    const availableModelIds = getModelsForPlan(userPlan)
    const plan = PLANS[userPlan]

    const models = availableModelIds.map(id => ({
      id: MODELS[id].id,
      name: MODELS[id].name,
      provider: MODELS[id].provider,
      contextWindow: MODELS[id].contextWindow,
    }))

    return NextResponse.json({
      plan: userPlan,
      planName: plan.nameFr,
      tokensPerMonth: plan.tokensPerMonth,
      maxRequestsPerDay: plan.maxRequestsPerDay,
      models,
    })
  } catch (err) {
    console.error('models error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
