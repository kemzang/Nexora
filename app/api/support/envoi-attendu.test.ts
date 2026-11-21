import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Les courriels d'un ticket doivent etre ATTENDUS.
 *
 * Ce defaut a vraiment eu lieu, le 21 novembre 2026. Les deux envois
 * etaient lances sans `await`, pour ne pas ralentir la reponse. Mais
 * Vercel gele la fonction des que la reponse part : les deux couraient
 * contre l'horloge, le premier passait, le second etait tue. Le client
 * recevait sa confirmation, et personne n'etait prevenu du ticket.
 *
 * Rien dans le code ne le signale — pas d'erreur, pas de log, la reponse
 * est un succes. C'est precisement pourquoi ca merite un test : le defaut
 * est invisible, et `void` se reecrit tout seul sous les doigts de qui
 * cherche a gagner trois cents millisecondes.
 */
const source = readFileSync(
  join(process.cwd(), 'app/api/support/tickets/route.ts'),
  'utf8',
)

describe('POST /api/support/tickets — les courriels sont attendus', () => {
  it('n abandonne aucun envoi sans l attendre', () => {
    // `void quelqueChose(` sur une fonction d'envoi : le motif exact du
    // defaut. Les `void` sur un cache ou une purge sont sans consequence,
    // c'est bien aux envois qu'on s'interesse.
    const abandonnes = source.match(/void\s+(send|notify)\w*\(/g)
    expect(abandonnes, 'un envoi est lance sans await').toBeNull()
  })

  it('attend les deux envois avant de repondre', () => {
    const attente = source.search(/await Promise\.allSettled\(/)
    const reponse = source.indexOf('return NextResponse.json({ success: true, reference })')
    expect(attente, 'aucune attente des envois').toBeGreaterThan(-1)
    expect(reponse).toBeGreaterThan(-1)
    expect(attente).toBeLessThan(reponse)
  })

  it('envoie bien les DEUX messages', () => {
    /*
     * La confirmation au client et la notification a l'equipe. Perdre la
     * seconde est le cas le plus traitre : l'utilisateur voit « demande
     * enregistree », et sa demande dort.
     */
    expect(source).toContain('sendTicketConfirmation(')
    expect(source).toContain('notifySupportTicket(')
  })
})
