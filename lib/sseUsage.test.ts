import { describe, expect, it } from 'vitest'
import { readOpenAIUsage, trackSseUsage, type SseUsage } from './sseUsage'

const enc = new TextEncoder()
const dec = new TextDecoder()

/** Flux a partir de morceaux arbitraires — y compris coupes au mauvais endroit. */
function fluxDe(morceaux: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const m of morceaux) controller.enqueue(enc.encode(m))
      controller.close()
    },
  })
}

async function lire(stream: ReadableStream<Uint8Array>): Promise<string> {
  let out = ''
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += dec.decode(value, { stream: true })
  }
  return out
}

const morceau = (texte: string) =>
  `data: ${JSON.stringify({
    choices: [{ index: 0, delta: { content: texte }, finish_reason: null }],
  })}\n\n`

describe('trackSseUsage', () => {
  it('relaie le flux a l identique', async () => {
    const entree = morceau('bon') + morceau('jour') + 'data: [DONE]\n\n'
    const usage: SseUsage = {}
    let sortieTokens = -1
    const sortie = await lire(
      trackSseUsage(fluxDe([entree]), usage, async (n) => {
        sortieTokens = n
      }),
    )
    expect(sortie).toBe(entree)
    expect(sortieTokens).toBe(Math.ceil('bonjour'.length / 4))
  })

  it('compte une ligne coupee entre deux morceaux reseau', async () => {
    // C'etait le defaut : le JSON incomplet partait au catch et son contenu
    // n'etait jamais compte, donc la conso etait sous-evaluee.
    const ligne = morceau('abcdefgh')
    const coupe = Math.floor(ligne.length / 2)
    const usage: SseUsage = {}
    let sortieTokens = -1
    const sortie = await lire(
      trackSseUsage(
        fluxDe([ligne.slice(0, coupe), ligne.slice(coupe), 'data: [DONE]\n\n']),
        usage,
        async (n) => {
          sortieTokens = n
        },
      ),
    )
    expect(sortie).toContain('abcdefgh')
    expect(sortieTokens).toBe(2) // 8 caracteres
  })

  it('capte usage et retire le morceau de fin qui le porte', async () => {
    // DeepSeek ajoute un dernier morceau a `choices` vide. On le lit sans le
    // transmettre : tous les clients ne savent pas l'ignorer.
    const usageChunk =
      `data: ${JSON.stringify({
        choices: [],
        usage: {
          prompt_tokens: 55_000,
          completion_tokens: 40,
          prompt_cache_hit_tokens: 54_000,
        },
      })}\n\n`
    const usage: SseUsage = {}
    const sortie = await lire(
      trackSseUsage(
        fluxDe([morceau('salut') + usageChunk + 'data: [DONE]\n\n']),
        usage,
        async () => {},
      ),
    )
    expect(sortie).not.toContain('prompt_cache_hit_tokens')
    expect(sortie).toContain('salut')
    expect(sortie).toContain('[DONE]')
    expect(usage).toEqual({
      inputTokens: 55_000,
      outputTokens: 40,
      cachedInputTokens: 54_000,
    })
  })

  it('garde un morceau qui porte a la fois du contenu et usage', async () => {
    // Certains fournisseurs joignent `usage` au dernier morceau utile :
    // le retirer effacerait du texte deja genere.
    const mixte =
      `data: ${JSON.stringify({
        choices: [{ index: 0, delta: { content: 'fin' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 3 },
      })}\n\n`
    const usage: SseUsage = {}
    const sortie = await lire(trackSseUsage(fluxDe([mixte]), usage, async () => {}))
    expect(sortie).toContain('fin')
    expect(usage.inputTokens).toBe(10)
  })

  it('enregistre meme quand le flux se termine sans ligne vide finale', async () => {
    const usage: SseUsage = {}
    let appele = false
    await lire(
      trackSseUsage(fluxDe([`data: ${JSON.stringify({ choices: [{ delta: { content: 'ab' } }] })}`]), usage, async () => {
        appele = true
      }),
    )
    expect(appele).toBe(true)
  })

  it('laisse passer une ligne non-SSE sans la casser', async () => {
    const usage: SseUsage = {}
    const entree = ': heartbeat\n\n' + morceau('ok')
    const sortie = await lire(trackSseUsage(fluxDe([entree]), usage, async () => {}))
    expect(sortie).toBe(entree)
  })
})

describe('readOpenAIUsage', () => {
  it('accepte les trois noms de champ du cache', () => {
    const a: SseUsage = {}
    readOpenAIUsage({ prompt_cache_hit_tokens: 5 }, a)
    expect(a.cachedInputTokens).toBe(5)

    const b: SseUsage = {}
    readOpenAIUsage({ prompt_tokens_details: { cached_tokens: 7 } }, b)
    expect(b.cachedInputTokens).toBe(7)

    const c: SseUsage = {}
    readOpenAIUsage({ cached_tokens: 9 }, c)
    expect(c.cachedInputTokens).toBe(9)
  })

  it('ne laisse rien quand il n y a pas d usage', () => {
    const u: SseUsage = {}
    readOpenAIUsage(undefined, u)
    readOpenAIUsage(null, u)
    readOpenAIUsage('oui', u)
    expect(u).toEqual({})
  })
})
