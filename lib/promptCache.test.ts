import { describe, expect, it } from 'vitest'
import {
  applyAnthropicCache,
  expectedBillableInput,
  markCachePoint,
  MIN_CACHEABLE_CHARS,
} from './promptCache'
import { cacheReadFactor, computeCreditsConsumed, estimateTokens } from './models'

/** Un message Anthropic de `n` caracteres. */
const msg = (role: 'user' | 'assistant', n = 20) => ({
  role,
  content: 'x'.repeat(n),
})

/** Conversation assez volumineuse pour meriter une mise en cache. */
function grosseConversation(tours = 4) {
  const msgs: any[] = []
  for (let i = 0; i < tours; i++) {
    msgs.push(msg('user', MIN_CACHEABLE_CHARS))
    msgs.push(msg('assistant', 200))
  }
  return msgs
}

const pointsDeCache = (msgs: any[]) =>
  msgs.filter(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((b: any) => b?.cache_control?.type === 'ephemeral'),
  ).length

describe('applyAnthropicCache', () => {
  it('ne touche pas une conversation trop courte pour etre mise en cache', () => {
    const msgs = [msg('user', 10)]
    const system = applyAnthropicCache('tu es utile', msgs)
    expect(system).toBe('tu es utile')
    expect(pointsDeCache(msgs)).toBe(0)
  })

  it('met le prompt systeme en cache des que le contexte est gros', () => {
    const msgs = grosseConversation()
    const system = applyAnthropicCache('tu es utile', msgs)
    expect(Array.isArray(system)).toBe(true)
    expect((system as any[])[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('reste sous la limite de quatre points de cache', () => {
    const msgs = grosseConversation(20)
    applyAnthropicCache('tu es utile', msgs)
    // 1 pour le systeme + ceux poses dans les messages.
    expect(1 + pointsDeCache(msgs)).toBeLessThanOrEqual(4)
  })

  it('pose un point intermediaire pour survivre a la fenetre de vingt blocs', () => {
    // Un tour d'agent qui ajoute beaucoup de blocs d'un coup repousserait le
    // point precedent hors de portee ; l'ancrage trois messages en arriere
    // garde une prise.
    const msgs = grosseConversation()
    applyAnthropicCache('', msgs)
    expect(pointsDeCache(msgs)).toBe(2)
    expect(Array.isArray(msgs[msgs.length - 1].content)).toBe(true)
    expect(Array.isArray(msgs[msgs.length - 3].content)).toBe(true)
  })

  it('marque la fin du dernier message, jamais le milieu', () => {
    const msgs = grosseConversation()
    msgs[msgs.length - 1].content = [
      { type: 'text', text: 'un' },
      { type: 'text', text: 'deux' },
    ]
    applyAnthropicCache('', msgs)
    const blocs = msgs[msgs.length - 1].content
    expect(blocs[0].cache_control).toBeUndefined()
    expect(blocs[1].cache_control).toEqual({ type: 'ephemeral' })
  })
})

describe('markCachePoint', () => {
  it('promeut une chaine en bloc de texte', () => {
    const m: any = { role: 'user', content: 'bonjour' }
    markCachePoint(m)
    expect(m.content).toEqual([
      { type: 'text', text: 'bonjour', cache_control: { type: 'ephemeral' } },
    ])
  })

  it('laisse un message vide tranquille', () => {
    // Anthropic refuse un tableau de contenu vide : mieux vaut ne pas marquer
    // que renvoyer une requete invalide.
    const vide: any = { role: 'user', content: '' }
    markCachePoint(vide)
    expect(vide.content).toBe('')

    const tableauVide: any = { role: 'user', content: [] }
    markCachePoint(tableauVide)
    expect(tableauVide.content).toEqual([])
  })
})

/**
 * Le cas du testeur : un seul prompt, sept appels, ~55 000 jetons de contexte
 * de base renvoyes a chaque etape. Mettre en cache cote fournisseur ne sert a
 * rien si l'utilisateur continue de payer le plein tarif.
 */
describe('facturation des jetons relus', () => {
  it('facture la part relue au tarif du cache', () => {
    const plein = computeCreditsConsumed('claude-haiku', 55_000, 40)
    const relu = computeCreditsConsumed('claude-haiku', 55_000, 40, 54_000)
    expect(relu).toBeLessThan(plein / 3)
  })

  it('reproduit la boucle de sept etapes', () => {
    const BASE = 55_000
    const sansCache = Array.from({ length: 7 }, () =>
      computeCreditsConsumed('claude-haiku', BASE, 40),
    ).reduce((a, b) => a + b, 0)
    // Premiere etape au plein tarif (ecriture), les six suivantes relues.
    const avecCache =
      computeCreditsConsumed('claude-haiku', BASE, 40) +
      Array.from({ length: 6 }, () =>
        computeCreditsConsumed('claude-haiku', BASE, 40, BASE),
      ).reduce((a, b) => a + b, 0)
    expect(avecCache).toBeLessThan(sansCache * 0.3)
  })

  it('ne compte jamais la part relue deux fois', () => {
    // `cachedInputTokens` est comprise dans `inputTokens`, pas en plus.
    expect(computeCreditsConsumed('claude-haiku', 1000, 0, 1000)).toBe(100)
    // Une valeur aberrante ne doit pas faire passer le total sous zero.
    expect(computeCreditsConsumed('claude-haiku', 1000, 0, 9_999_999)).toBe(100)
  })

  it('reste identique quand le fournisseur n a rien relu', () => {
    expect(computeCreditsConsumed('claude-sonnet', 1000, 500, 0)).toBe(
      computeCreditsConsumed('claude-sonnet', 1000, 500),
    )
  })

  it('applique le tarif reel de chaque fournisseur', () => {
    // Google relit a 0,25x, pas a 0,1x : rendre plus que l'economie reelle
    // reviendrait a offrir du quota.
    expect(cacheReadFactor('gemini-flash')).toBe(0.25)
    expect(cacheReadFactor('deepseek-chat')).toBe(0.1)
    expect(cacheReadFactor('claude-opus')).toBe(0.1)
    // Modele inconnu : aucune remise.
    expect(cacheReadFactor('inconnu')).toBe(1)
  })

  it('ne remise jamais la sortie', () => {
    const a = computeCreditsConsumed('claude-haiku', 0, 1000, 0)
    const b = computeCreditsConsumed('claude-haiku', 0, 1000, 1000)
    expect(a).toBe(b)
  })
})

describe('expectedBillableInput', () => {
  const gros = (n: number) => ({ role: 'user', content: 'x'.repeat(n) })

  it('compte plein tarif au premier appel d une conversation', () => {
    const msgs = [gros(40_000)]
    expect(expectedBillableInput('claude-haiku', msgs)).toBe(estimateTokens(msgs as any))
  })

  it('deduit le prefixe attendu dans une conversation en cours', () => {
    const msgs = [gros(40_000), { role: 'assistant', content: 'ok' }, gros(100)]
    const plein = estimateTokens(msgs as any)
    const attendu = expectedBillableInput('claude-haiku', msgs)
    expect(attendu).toBeLessThan(plein / 5)
  })

  it('ne deduit rien quand le prefixe est trop court pour etre cacheable', () => {
    const msgs = [gros(50), { role: 'assistant', content: 'ok' }, gros(50)]
    expect(expectedBillableInput('claude-haiku', msgs)).toBe(estimateTokens(msgs as any))
  })

  it('suit le tarif du fournisseur', () => {
    const msgs = [gros(40_000), { role: 'assistant', content: 'ok' }, gros(100)]
    // Google relit a 0,25x : il doit rester plus cher qu'Anthropic a 0,1x.
    expect(expectedBillableInput('gemini-flash', msgs)).toBeGreaterThan(
      expectedBillableInput('claude-haiku', msgs),
    )
  })

  it('ne descend jamais sous zero', () => {
    const msgs = [gros(40_000), { role: 'assistant', content: 'ok' }, gros(100)]
    expect(expectedBillableInput('claude-haiku', msgs)).toBeGreaterThan(0)
  })
})

describe('estimateTokens', () => {
  it('mesure le texte des messages multimodaux', () => {
    // Avant, `content.length` valait le nombre de parts : une capture d'ecran
    // passait pour un jeton et le controle de solde la laissait filer.
    const n = estimateTokens([
      { content: [{ type: 'text', text: 'x'.repeat(400) }] },
    ] as any)
    expect(n).toBe(100)
  })

  it('compte une image au forfait, pas a la longueur du base64', () => {
    const base64 = 'data:image/png;base64,' + 'A'.repeat(200_000)
    const n = estimateTokens([
      { content: [{ type: 'image_url', image_url: { url: base64 } }] },
    ] as any)
    // Ni ~1 jeton (l'ancien bug), ni 50 000 (la longueur du base64).
    expect(n).toBe(1600)
  })

  it('reste inchange sur une chaine simple', () => {
    expect(estimateTokens([{ content: 'x'.repeat(40) }] as any)).toBe(10)
  })

  it('tolere un contenu absent', () => {
    expect(estimateTokens([{}, { content: null }, { content: 42 }] as any)).toBe(0)
  })
})
