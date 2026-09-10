/**
 * Returns the assistant config consumed by the Nexora extension's PlatformProfileLoader.
 * The response shape MUST match what ControlPlaneClient.listAssistants() expects:
 *
 *   { configResult: { config: AssistantUnrolled; errors: [] }; ownerSlug; packageSlug; iconUrl; rawYaml }[]
 *
 * Any deviation from this shape causes the extension to silently load no cloud models.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth-verify'
import { type PlanId } from '@/lib/models'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nexora-mu-henna.vercel.app'

// Each model entry becomes a ModelConfig (AssistantUnrolled.models[]).
// provider: 'openai' covers all OpenAI-compatible APIs (DeepSeek, etc.).
function buildModels(plan: PlanId, token: string) {
  // L'extension (client OpenAI-compatible) fait apiBase + "/chat/completions"
  // - il manquait le segment "v1" (la vraie route est
  // app/api/proxy/model-proxy/v1/chat/completions/route.ts), donc chaque
  // appel tombait sur le 404 HTML de Next.js au lieu du JSON attendu (d'où
  // "Unexpected token '<'" côté extension - jamais un JSON valide, quel que
  // soit le modèle). Un slash final éventuel sur NEXT_PUBLIC_APP_URL est
  // aussi retiré pour éviter un double "//" dans l'URL finale.
  const apiBase = `${BASE_URL.replace(/\/$/, '')}/api/proxy/model-proxy/v1`

  // capabilities est un TABLEAU de chaînes dans le schéma Zod de
  // @continuedev/config-yaml (modelCapabilitySchema.array()) - un objet
  // { uploadImage: true } y échouait avec "Expected array, received object",
  // erreur FATALE qui invalidait tout le config (donc TOUS les modèles,
  // quel que soit celui sélectionné - c'est le bug "No chat model selected"
  // persistant peu importe le choix). tool_use pour tous : sans elle,
  // modelSupportsNativeTools retombe sur la détection par provider, qui
  // échoue pour un modèle non-OpenAI servi en API compatible (deepseek-chat
  // perdait les appels d'outils natifs). image_input en plus pour la vision.
  function m(name: string, model: string, vision = false, provider = 'openai') {
    const capabilities = vision ? ['tool_use', 'image_input'] : ['tool_use']
    return { name, model, provider, apiBase, apiKey: token, capabilities }
  }

  const deepseek    = m('DeepSeek V3',      'deepseek-chat')           // pas de vision
  const geminiFlash = m('Gemini Flash',      'gemini-flash',    true)
  const geminiPro   = m('Gemini Pro',        'gemini-pro',      true)
  const haiku       = m('Claude Haiku',      'claude-haiku',    true)
  const sonnet      = m('Claude Sonnet',     'claude-sonnet',   true)
  const opus        = m('Claude Opus',       'claude-opus',     true)

  // Tous les modèles sont toujours visibles et sélectionnables, quel que soit
  // le plan : selectBestModel() (lib/models.ts, appelé par
  // /v1/chat/completions) vérifie déjà côté serveur si le modèle choisi fait
  // partie du plan de l'utilisateur et bascule silencieusement vers le
  // meilleur modèle disponible sinon (voir preferredModel dans ce fichier).
  // Cacher certains modèles ici créait une seconde barrière redondante,
  // contraire à l'intention d'origine : liste ouverte, restriction à
  // l'usage. Seul l'ORDRE (donc le modèle proposé par défaut) varie selon le
  // plan, pas la liste elle-même.
  switch (plan) {
    case 'starter':
      // Gemini Flash par défaut (capable, multimodal, peu cher)
      return { models: [geminiFlash, geminiPro, deepseek, sonnet, opus, haiku], autocomplete: deepseek }
    case 'pro':
      // Claude Sonnet par défaut (excellent pour l'agent / le code)
      return { models: [sonnet, geminiPro, haiku, geminiFlash, deepseek, opus], autocomplete: deepseek }
    case 'business':
      // Claude Sonnet par défaut ; Opus disponible pour le maximum
      return { models: [sonnet, opus, geminiPro, haiku, geminiFlash, deepseek], autocomplete: deepseek }
    case 'enterprise':
      // Claude Sonnet par défaut ; Opus disponible pour le maximum
      return { models: [sonnet, opus, geminiPro, haiku, geminiFlash, deepseek], autocomplete: deepseek }
    default: // free
      // Gemini Flash par défaut au lieu de DeepSeek → bien meilleure 1re impression
      return { models: [geminiFlash, deepseek, geminiPro, sonnet, opus, haiku], autocomplete: deepseek }
  }
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

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('subscription_plans!inner(slug)')
      .eq('user_id', userId)
      .eq('status', 'active')
      // Exclut les abonnements expirés (forfaits test 7/14j, ou tout plan échu).
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle()

    const plan = ((subscription?.subscription_plans as { slug?: string } | null)?.slug ?? 'free') as PlanId
    const { models, autocomplete } = buildModels(plan, token)

    // AssistantUnrolled shape expected by PlatformProfileLoader
    const assistantConfig = {
      name: 'Nexora AI',
      version: '1.0.0',
      schema: 'v1',
      models,
      tabAutocompleteModel: autocomplete,
      context: [],
    }

    const rawYaml = [
      `name: Nexora AI`,
      `version: 1.0.0`,
      `schema: v1`,
      `models:`,
      ...models.map(m =>
        `  - name: ${m.name}\n    model: ${m.model}\n    provider: ${m.provider}\n    apiBase: ${m.apiBase}` +
        `\n    capabilities:\n` +
        m.capabilities.map(c => `      - ${c}`).join('\n')
      ),
    ].join('\n')

    // Return the shape that ControlPlaneClient.listAssistants() destructures
    return NextResponse.json([
      {
        configResult: {
          config: assistantConfig,
          errors: [],
        },
        ownerSlug: 'nexora',
        packageSlug: 'nexora-assistant',
        iconUrl: null,
        rawYaml,
      },
    ])
  } catch (err) {
    console.error('[list-assistants] error:', err)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
