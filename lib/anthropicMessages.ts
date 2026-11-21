import { applyAnthropicCache } from './promptCache'

/**
 * Traduction des messages OpenAI vers le format Anthropic.
 *
 * Sorti de la route pour etre testable : importer la route construit un
 * client Supabase des le chargement du module, donc un test unitaire de la
 * conversion exigeait des variables d'environnement qui n'ont rien a y voir.
 */

/**
 * Traduit le contenu d'un message du format OpenAI vers celui d'Anthropic.
 *
 * Les deux s'accordent sur `text` mais divergent sur les images : OpenAI
 * envoie `image_url` avec une URL (souvent une data-URL base64), Anthropic
 * attend `image` avec une `source` structuree. Sans cette traduction,
 * Anthropic refusait tout le message — et comme une image reste dans
 * l'historique, TOUTES les requetes suivantes de la conversation
 * echouaient, pas seulement celle qui portait l'image.
 */
export function toAnthropicContent(content: any): any {
  if (!Array.isArray(content)) return content ?? ''

  const parts = content
    .map((p: any) => {
      if (!p || typeof p !== 'object') return null
      if (p.type === 'text') return { type: 'text', text: p.text ?? '' }
      // Deja au format Anthropic : laisser passer.
      if (p.type === 'image' && p.source) return p
      if (p.type === 'image_url') {
        const url = p.image_url?.url ?? p.image_url
        if (typeof url !== 'string') return null
        const m = url.match(/^data:([^;,]+);base64,(.*)$/)
        if (m) {
          return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }
        }
        if (/^https?:\/\//.test(url)) {
          return { type: 'image', source: { type: 'url', url } }
        }
        return null
      }
      return null
    })
    .filter(Boolean)

  // Un message sans aucune partie exploitable serait refuse : on met un
  // texte vide plutot qu'un tableau vide.
  return parts.length > 0 ? parts : ''
}

export function buildAnthropicMessages(messages: any[]): any[] {
  const result: any[] = []
  let i = 0
  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'system') { i++; continue }

    // Consecutive tool results → single user message with tool_result parts
    if (msg.role === 'tool') {
      /*
       * Anthropic impose UN resultat par appel d'outil, et refuse toute la
       * requete sinon : « each tool_use must have a single result ». Un seul
       * doublon rend donc la conversation definitivement inenvoyable —
       * l'utilisateur reessaie, le meme historique repart, le meme refus
       * revient. On garde le premier resultat de chaque identifiant.
       *
       * Et un resultat sans appel correspondant dans le message precedent
       * est refuse de la meme facon. Dans les deux cas, mieux vaut une
       * requete amputee qu'une conversation morte.
       */
      const contenuPrecedent = result[result.length - 1]?.content
      const idsAppeles = new Set<string>(
        (Array.isArray(contenuPrecedent) ? contenuPrecedent : [])
          .filter((c: any) => c?.type === 'tool_use')
          .map((c: any) => c.id),
      )
      const parts: any[] = []
      const dejaVus = new Set<string>()
      while (i < messages.length && messages[i].role === 'tool') {
        const id = messages[i].tool_call_id
        if (id && !dejaVus.has(id) && idsAppeles.has(id)) {
          dejaVus.add(id)
          parts.push({
            type: 'tool_result',
            tool_use_id: id,
            content: typeof messages[i].content === 'string'
              ? messages[i].content
              : JSON.stringify(messages[i].content ?? ''),
          })
        }
        i++
      }
      // Un message vide serait lui aussi refuse.
      if (parts.length > 0) result.push({ role: 'user', content: parts })
      continue
    }

    // Assistant message with tool calls
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const content: any[] = []
      if (msg.content) content.push({ type: 'text', text: msg.content })
      for (const tc of msg.tool_calls) {
        let input: any = {}
        try { input = JSON.parse(tc.function.arguments) } catch { /* use {} */ }
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input })
      }
      result.push({ role: 'assistant', content })
      i++
      continue
    }

    result.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: toAnthropicContent(msg.content),
    })
    i++
  }
  return result
}
export function buildAnthropicBody(body: any, modelApiId: string): any {
  const system = body.messages
    .filter((m: any) => m.role === 'system')
    .map((m: any) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n')

  const msgs = buildAnthropicMessages(body.messages)

  const req: any = {
    model: modelApiId,
    max_tokens: body.max_tokens ?? 4096,
    messages: msgs,
    stream: body.stream ?? true,
  }

  // Pose les points de cache et renvoie le `system` a envoyer (chaine nue si
  // la conversation est trop courte pour etre mise en cache). Modifie `msgs`
  // sur place — voir lib/promptCache.ts.
  const systemField = applyAnthropicCache(system, msgs)
  if (system) req.system = systemField

  // Anthropic has deprecated sampling parameters for current Claude models.
  // Do not forward OpenAI-compatible temperature/top_p values to Messages API.

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    req.tools = body.tools.map((t: any) => ({
      name: t.function?.name ?? t.name,
      description: t.function?.description ?? t.description ?? '',
      input_schema: t.function?.parameters ?? t.input_schema ?? { type: 'object', properties: {} },
    }))
  }

  if (body.tool_choice) {
    const tc = body.tool_choice
    if (tc === 'auto' || tc?.type === 'auto') req.tool_choice = { type: 'auto' }
    else if (tc === 'required' || tc?.type === 'required') req.tool_choice = { type: 'any' }
    else if (tc === 'none' || tc?.type === 'none') req.tool_choice = { type: 'none' }
    else if (tc?.function?.name) req.tool_choice = { type: 'tool', name: tc.function.name }
  }

  return req
}
