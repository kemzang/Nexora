import { describe, expect, it } from 'vitest'

import { buildAnthropicMessages } from './anthropicMessages'

/**
 * La traduction OpenAI -> Anthropic, et ce qu'Anthropic refuse.
 *
 * Observe en production le 16 novembre :
 *
 *   messages.2.content.3: each tool_use must have a single result.
 *   Found multiple `tool_result` blocks with id: toolu_01GdGWGPNX4n6BNPLijQvv8R
 *
 * Un seul doublon fait refuser TOUTE la requete. Et comme l'historique
 * repart identique a chaque tentative, la conversation ne redemarre jamais :
 * l'utilisateur reessaie, echoue, et conclut que le produit est casse.
 *
 * Le proxy repare donc ce qu'il peut plutot que de transmettre tel quel.
 * Cette couche protege aussi les versions deja installees, qui ne seront pas
 * mises a jour avant longtemps.
 */

const appelOutil = (id: string, nom = 'readFile') => ({
  id,
  type: 'function',
  function: { name: nom, arguments: '{}' },
})

describe('buildAnthropicMessages', () => {
  it('ne laisse pas deux resultats pour un meme appel', () => {
    const msgs = buildAnthropicMessages([
      { role: 'user', content: 'lis ces fichiers' },
      { role: 'assistant', content: '', tool_calls: [appelOutil('toolu_A')] },
      { role: 'tool', tool_call_id: 'toolu_A', content: 'contenu' },
      { role: 'tool', tool_call_id: 'toolu_A', content: 'contenu (bis)' },
    ])

    const resultats = msgs[2].content.filter((c: any) => c.type === 'tool_result')
    expect(resultats).toHaveLength(1)
    // Le premier, pas le dernier : c'est celui que le modele a deja vu si la
    // conversation s'est poursuivie.
    expect(resultats[0].content).toBe('contenu')
  })

  it('ecarte un resultat sans appel correspondant', () => {
    // L'autre forme du meme refus : « each tool_result block must have a
    // corresponding tool_use block in the previous message ».
    const msgs = buildAnthropicMessages([
      { role: 'user', content: 'vas-y' },
      { role: 'assistant', content: '', tool_calls: [appelOutil('toolu_A')] },
      { role: 'tool', tool_call_id: 'toolu_A', content: 'ok' },
      { role: 'tool', tool_call_id: 'toolu_ORPHELIN', content: 'perdu' },
    ])

    const ids = msgs[2].content.map((c: any) => c.tool_use_id)
    expect(ids).toEqual(['toolu_A'])
  })

  it('garde les appels paralleles distincts', () => {
    // La reparation ne doit pas devenir une mutilation : quatre outils
    // appeles en parallele donnent bien quatre resultats.
    const msgs = buildAnthropicMessages([
      { role: 'user', content: 'lis tout' },
      {
        role: 'assistant',
        content: '',
        tool_calls: ['A', 'B', 'C', 'D'].map((n) => appelOutil(`toolu_${n}`)),
      },
      ...['A', 'B', 'C', 'D'].map((n) => ({
        role: 'tool',
        tool_call_id: `toolu_${n}`,
        content: `contenu ${n}`,
      })),
    ])

    expect(msgs[2].content).toHaveLength(4)
    expect(msgs[2].content.map((c: any) => c.tool_use_id)).toEqual([
      'toolu_A',
      'toolu_B',
      'toolu_C',
      'toolu_D',
    ])
  })

  it('ne produit pas de message vide', () => {
    // Un message utilisateur sans contenu est refuse lui aussi : si tous les
    // resultats sont ecartes, il ne doit rester aucun message.
    const msgs = buildAnthropicMessages([
      { role: 'user', content: 'bonjour' },
      { role: 'assistant', content: 'je reflechis' },
      { role: 'tool', tool_call_id: 'toolu_PERDU', content: 'sans appel' },
    ])

    expect(msgs).toHaveLength(2)
    expect(msgs.every((m: any) => m.content !== '' && m.content?.length > 0)).toBe(true)
  })

  it('supporte un message assistant dont le contenu est une chaine', () => {
    // Le message precedent n'est pas toujours un tableau de blocs : lire
    // ses tool_use sans verifier ferait tomber la requete sur un TypeError,
    // soit une panne pire que celle qu'on corrige.
    expect(() =>
      buildAnthropicMessages([
        { role: 'user', content: 'salut' },
        { role: 'assistant', content: 'texte simple' },
        { role: 'tool', tool_call_id: 'toolu_A', content: 'x' },
      ]),
    ).not.toThrow()
  })
})
