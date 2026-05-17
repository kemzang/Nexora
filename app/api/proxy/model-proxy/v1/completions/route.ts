import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FIM_MODEL = 'deepseek-chat'
const FIM_API_URL = 'https://api.deepseek.com/completions'

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { model, prompt, suffix, max_tokens = 256, temperature = 0, stop = ['\n\n'], stream = false } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 })
    }

    if (model !== FIM_MODEL) {
      return NextResponse.json({ error: `FIM non supporté pour le modèle ${model}` }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API DeepSeek non configurée' }, { status: 500 })
    }

    const fimBody: Record<string, any> = {
      model: 'deepseek-chat',
      prompt,
      max_tokens,
      temperature,
      stop,
      stream,
    }
    if (suffix) fimBody.suffix = suffix

    const aiResponse = await fetch(FIM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(fimBody),
    })

    if (!aiResponse.ok) {
      return NextResponse.json({ error: await aiResponse.text() }, { status: aiResponse.status })
    }

    void supabase.from('usage_sessions').insert({
      user_id: userId,
      session_type: 'fim',
      model_id: FIM_MODEL,
      metadata: { tokens: max_tokens },
    })

    if (stream) {
      const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      return new NextResponse(aiResponse.body, { headers })
    }

    const data = await aiResponse.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('fim proxy error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
