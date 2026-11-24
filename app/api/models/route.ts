import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'
import { getModelsForPlan, MODELS, type ModelId, type PlanId, PLANS } from '@/lib/models'
import { getUserPlan } from '@/lib/quota'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
 * Le plan se lit dans `lib/quota.ts`, et nulle part ailleurs.
 *
 * Quatre copies de cette fonction coexistaient, chacune ecrite un peu
 * differemment, et toutes ne verifiaient pas `current_period_end` : un
 * abonnement termine mais pas encore bascule restait servi comme payant.
 * On corrige une copie, les autres restent fausses — c'est pour cela
 * qu'il n'y en a plus qu'une.
 */

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
