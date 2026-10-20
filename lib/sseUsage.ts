/**
 * @file Lecture de la consommation reelle dans un flux SSE au format OpenAI.
 *
 * Le flux est recompose ligne par ligne au lieu d'etre relaye tel quel, pour
 * deux raisons.
 *
 * D'abord une ligne SSE peut etre coupee entre deux morceaux reseau. Sans
 * tampon, le JSON incomplet finissait au `catch` et son contenu n'etait jamais
 * compte : la consommation etait sous-evaluee des que la reponse se
 * fragmentait, c'est-a-dire tout le temps sur une longue generation.
 *
 * Ensuite il faut pouvoir retirer une ligne. Le morceau de fin porteur de
 * `usage` — celui qu'on demande a DeepSeek via `stream_options` pour connaitre
 * les jetons relus depuis son cache — a un `choices` vide, et tous les clients
 * ne savent pas l'ignorer. On le lit sans le transmettre.
 *
 * SSE etant du texte a lignes, reemettre les memes lignes conserve le
 * decoupage a l'octet pour tout le reste.
 */

/** Ce que le fournisseur dit avoir reellement traite. */
export interface SseUsage {
  /** Entree totale, cache compris. */
  inputTokens?: number
  /** Part de l'entree servie depuis le cache du fournisseur. */
  cachedInputTokens?: number
  outputTokens?: number
}

/** Lit un bloc `usage` OpenAI. Tolere les noms propres a chaque fournisseur. */
export function readOpenAIUsage(u: any, into: SseUsage): void {
  if (!u || typeof u !== 'object') return
  if (typeof u.prompt_tokens === 'number') into.inputTokens = u.prompt_tokens
  if (typeof u.completion_tokens === 'number') into.outputTokens = u.completion_tokens
  // DeepSeek nomme son cache disque `prompt_cache_hit_tokens` ; OpenAI et ses
  // imitateurs utilisent `prompt_tokens_details.cached_tokens`.
  const hit =
    u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? u.cached_tokens
  if (typeof hit === 'number') into.cachedInputTokens = hit
}

/**
 * Relaie le flux en comptant la sortie et en captant `usage`.
 *
 * `onDone` est **attendu** a la fermeture : en tir-et-oublie, Vercel peut
 * geler la fonction avant la fin de l'enregistrement et la consommation est
 * perdue. Tant qu'on l'attend, le flux reste ouvert.
 */
export function trackSseUsage(
  body: ReadableStream<Uint8Array>,
  usage: SseUsage,
  onDone: (estimatedOutputTokens: number) => Promise<void>,
): ReadableStream<Uint8Array> {
  let outputChars = 0
  let buffer = ''
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  /** @returns true si la ligne doit etre transmise au client. */
  const handleLine = (line: string): boolean => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return true
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return true
    let json: any
    try {
      json = JSON.parse(payload)
    } catch {
      return true
    }
    const delta = json?.choices?.[0]?.delta?.content
    if (typeof delta === 'string') outputChars += delta.length
    if (!json?.usage) return true
    readOpenAIUsage(json.usage, usage)
    // Morceau de fin porteur du seul `usage` : a consommer, pas a relayer.
    return Array.isArray(json.choices) && json.choices.length > 0
  }

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        const kept = lines.filter(handleLine)
        if (kept.length > 0) controller.enqueue(encoder.encode(kept.join('\n') + '\n'))
      },
      async flush(controller) {
        if (buffer) {
          if (handleLine(buffer)) controller.enqueue(encoder.encode(buffer))
          buffer = ''
        }
        await onDone(Math.ceil(outputChars / 4))
      },
    }),
  )
}
