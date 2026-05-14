import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'
import { selectBestModel, estimateTokens, type ModelId, MODELS, type PlanId } from '@/lib/models'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_CONFIG: Record<string, { baseUrl: string; keyEnv: string; format: 'openai' | 'anthropic' | 'gemini' }> = {
  'deepseek-chat': { baseUrl: 'https://api.deepseek.com/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', format: 'openai' },
  'gemini-flash': { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', keyEnv: 'GEMINI_API_KEY', format: 'gemini' },
  'gemini-pro': { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', keyEnv: 'GEMINI_API_KEY', format: 'gemini' },
  'claude-haiku': { baseUrl: 'https://api.anthropic.com/v1/messages', keyEnv: 'ANTHROPIC_API_KEY', format: 'anthropic' },
  'grok-2': { baseUrl: 'https://api.x.ai/v1/chat/completions', keyEnv: 'XAI_API_KEY', format: 'openai' },
  'claude-sonnet': { baseUrl: 'https://api.anthropic.com/v1/messages', keyEnv: 'ANTHROPIC_API_KEY', format: 'anthropic' },
  'gpt-5': { baseUrl: 'https://api.openai.com/v1/chat/completions', keyEnv: 'OPENAI_API_KEY', format: 'openai' },
  'claude-opus': { baseUrl: 'https://api.anthropic.com/v1/messages', keyEnv: 'ANTHROPIC_API_KEY', format: 'anthropic' },
}

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

async function fetchOpenAI(apiUrl: string, apiKey: string, body: any) {
  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
}

async function fetchAnthropic(apiUrl: string, apiKey: string, body: any, modelId: string) {
  const systemMessages = body.messages.filter((m: any) => m.role === 'system')
  const nonSystemMessages = body.messages.filter((m: any) => m.role !== 'system')

  const anthropicBody: Record<string, any> = {
    model: modelId,
    max_tokens: 4096,
    messages: nonSystemMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  }

  if (systemMessages.length > 0) {
    anthropicBody.system = systemMessages.map((m: any) => ({ type: 'text', text: m.content }))
  }

  if (body.stream) {
    anthropicBody.stream = true
  }

  return fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(anthropicBody),
  })
}

async function fetchGemini(apiUrl: string, apiKey: string, body: any, modelId: string) {
  const lastUserMsg = [...body.messages].reverse().find((m: any) => m.role === 'user')
  const contents = body.messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const geminiBody: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: body.temperature ?? 0.7,
      maxOutputTokens: body.max_tokens ?? 4096,
    },
  }

  const modelPath = modelId === 'gemini-flash' ? 'gemini-2.0-flash' : 'gemini-2.0-pro'
  const url = `${apiUrl}/models/${modelPath}:generateContent${body.stream ? '?alt=sse' : ''}`

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(geminiBody),
  })
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    const [userId, body] = await Promise.all([
      verifyToken(token),
      req.json(),
    ])

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, model: preferredModel, stream = true, ...rest } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    const userPlan = await getUserPlan(userId)
    const { model: selectedModel, downgraded } = selectBestModel(userPlan, preferredModel as ModelId)

    const apiConfig = API_CONFIG[selectedModel.id]

    if (!apiConfig) {
      return NextResponse.json({ error: `Modèle ${selectedModel.id} non configuré` }, { status: 500 })
    }

    const apiKey = process.env[apiConfig.keyEnv]

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API serveur non configurée' }, { status: 500 })
    }

    let aiResponse: Response

    if (apiConfig.format === 'openai') {
      aiResponse = await fetchOpenAI(apiConfig.baseUrl, apiKey, {
        model: selectedModel.apiIdentifier,
        messages,
        stream,
        ...rest,
      })
    } else if (apiConfig.format === 'anthropic') {
      aiResponse = await fetchAnthropic(apiConfig.baseUrl, apiKey, body, selectedModel.apiIdentifier)
    } else if (apiConfig.format === 'gemini') {
      aiResponse = await fetchGemini(apiConfig.baseUrl, apiKey, body, selectedModel.id)
    } else {
      return NextResponse.json({ error: 'Format API inconnu' }, { status: 500 })
    }

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      return NextResponse.json({ error: err }, { status: aiResponse.status })
    }

    const estimatedTokens = estimateTokens(messages)

    void supabase.from('usage_sessions').insert({
      user_id: userId,
      session_type: 'chat_proxy',
      model_id: null,
      tokens_input: estimatedTokens,
      metadata: {
        plan: userPlan,
        model: selectedModel.id,
        preferred: preferredModel || null,
        downgraded,
      },
    })

    return new NextResponse(aiResponse.body, {
      headers: {
        'Content-Type': aiResponse.headers.get('Content-Type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('model-proxy error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
