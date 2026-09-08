import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { rerankDocuments } from '@/lib/rerank'

export const runtime = 'nodejs'

// Duree max de la fonction. 60 s est le plafond du plan Vercel Hobby, donc
// cette valeur se deploie sur tous les plans. Sur un plan Pro, elle peut etre
// montee jusqu'a 300 pour les generations tres longues.
// Rerank : un gros batch peut depasser le defaut Vercel.
export const maxDuration = 60

/**
 * Reranking endpoint — used by Nexora IDE for codebase search context.
 * Routes to Cohere or falls back to a simple BM25-style score if no key is configured.
 */
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
    const { query, documents, top_n } = body

    if (!query || !documents?.length) {
      return NextResponse.json({ error: 'query and documents are required' }, { status: 400 })
    }

    const { results, model: usedModel } = await rerankDocuments(query, documents, top_n)

    return NextResponse.json({
      object: 'list',
      data: results,
      model: usedModel,
      usage: {},
    })
  } catch (err) {
    console.error('rerank proxy error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
