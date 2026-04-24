import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // Lire le body et vérifier le token en parallèle
    const [userId, body] = await Promise.all([
      verifyToken(token),
      req.json()
    ])

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, model, stream = true, ...rest } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    // DeepSeek par défaut
    const selectedModel = model || 'deepseek-chat'
    const isDeepSeek = !model || model.startsWith('deepseek')
    const apiUrl = isDeepSeek
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'
    const apiKey = isDeepSeek
      ? process.env.DEEPSEEK_API_KEY!
      : process.env.OPENAI_API_KEY!

    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée' }, { status: 500 })
    }

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: selectedModel, messages, stream, ...rest }),
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      return NextResponse.json({ error: err }, { status: aiResponse.status })
    }

    // Logger en arrière-plan sans bloquer
    void supabase.from('usage_sessions').insert({
      user_id: userId,
      session_type: 'chat_proxy',
      metadata: { model: selectedModel, messages_count: messages.length }
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
