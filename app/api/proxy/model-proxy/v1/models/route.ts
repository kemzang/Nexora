import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'
import { MODELS, PLANS, type PlanId } from '@/lib/models'
import { getUserPlan } from '@/lib/quota'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


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
    const availableModelIds = PLANS[userPlan]?.models ?? []

    const now = Math.floor(Date.now() / 1000)

    const models = availableModelIds.map(id => {
      const m = MODELS[id]
      return {
        id: m.id,
        object: 'model',
        created: now,
        owned_by: `nexora-${m.provider.toLowerCase()}`,
        // OpenAI-compatible fields
        permission: [],
        root: m.id,
        parent: null,
        // Nexora extra info
        nexora: {
          name: m.name,
          provider: m.provider,
          context_window: m.contextWindow,
          capability: m.capability,
          available_on_plan: userPlan,
        },
      }
    })

    return NextResponse.json({
      object: 'list',
      data: models,
    })
  } catch (err) {
    console.error('models list error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
