// Rerank partagé — utilisé par la route proxy /v1/rerank (IDE/CLI) et par la
// recherche d'historique de collaboration (app/api/collab/search). Route vers
// Cohere si COHERE_API_KEY est configurée, sinon repli sur un score de
// recouvrement de mots-clés (jamais d'échec dur : la recherche doit toujours
// renvoyer quelque chose, même sans clé Cohere).

export interface RerankResult {
  index: number
  relevance_score: number
  document: string
}

export async function rerankDocuments(
  query: string,
  documents: string[],
  topN?: number,
): Promise<{ results: RerankResult[]; model: string }> {
  const cohereKey = process.env.COHERE_API_KEY

  if (cohereKey && documents.length > 0) {
    try {
      const upstream = await fetch('https://api.cohere.com/v1/rerank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cohereKey}`,
          'X-Client-Name': 'nexora',
        },
        body: JSON.stringify({
          query,
          documents,
          model: 'rerank-english-v3.0',
          top_n: topN ?? documents.length,
        }),
      })

      if (upstream.ok) {
        const data = await upstream.json()
        const results: RerankResult[] = (data.results ?? []).map(
          (r: { index: number; relevance_score: number }) => ({
            index: r.index,
            relevance_score: r.relevance_score,
            document: documents[r.index],
          }),
        )
        return { results, model: 'rerank-english-v3.0' }
      }
      console.error('Cohere rerank error:', await upstream.text())
    } catch (err) {
      console.error('Cohere rerank unreachable:', err)
    }
    // Tombe dans le repli ci-dessous si Cohere échoue
  }

  // ── Repli : recouvrement de mots-clés ───────────────────────────────────
  const queryTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean))
  const scored: RerankResult[] = documents.map((doc, index) => {
    const docTokens = doc.toLowerCase().split(/\s+/)
    const overlap = docTokens.filter((t) => queryTokens.has(t)).length
    return { index, relevance_score: overlap / Math.max(queryTokens.size, 1), document: doc }
  })
  scored.sort((a, b) => b.relevance_score - a.relevance_score)

  return {
    results: topN ? scored.slice(0, topN) : scored,
    model: 'nexora-keyword-fallback',
  }
}
