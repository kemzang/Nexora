import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Deux invariants de la reponse aux tickets, verifies sur la source.
 *
 * Ils ne se testent pas en appelant la route : il faudrait simuler
 * Supabase ET Resend, et le simulacre finirait par decrire ce que le code
 * fait plutot que ce qu'il doit faire. Ici on verifie l'ORDRE des
 * operations, qui est precisement ce qui se perd lors d'un remaniement.
 *
 * 1. On enregistre avant d'envoyer. Si l'envoi echoue, le texte reste.
 * 2. On ne marque « answered » que si le courriel est parti. Sortir de la
 *    file un ticket dont la reponse n'a jamais ete remise, c'est abandonner
 *    quelqu'un sans s'en apercevoir.
 */
const source = readFileSync(join(process.cwd(), 'app/api/admin/support/route.ts'), 'utf8')

describe('POST /api/admin/support — ordre des operations', () => {
  it('enregistre la reponse avant de tenter l envoi', () => {
    // Repere tolerant a la mise en forme : ce qui compte est la position
    // de l'insertion dans le fichier, pas son indentation.
    const insertion = source.search(
      /from\('support_ticket_replies'\)\s*\.insert\(/,
    )
    const envoi = source.indexOf('await sendTicketReply(')
    expect(insertion, 'insertion de la reponse introuvable').toBeGreaterThan(-1)
    expect(envoi, 'appel a sendTicketReply introuvable').toBeGreaterThan(-1)
    expect(insertion).toBeLessThan(envoi)
  })

  it('ne passe le ticket a « answered » que si l envoi a reussi', () => {
    const garde = source.indexOf('if (envoi.ok) {')
    const marquage = source.indexOf("status: 'answered'")
    expect(garde, 'garde `if (envoi.ok)` introuvable').toBeGreaterThan(-1)
    expect(marquage, "mise a jour vers 'answered' introuvable").toBeGreaterThan(-1)
    expect(garde).toBeLessThan(marquage)

    // Et le bloc doit se refermer APRES le marquage : une garde placee
    // avant mais fermee avant lui ne protegerait rien.
    const fermeture = source.indexOf('\n  }\n', garde)
    expect(fermeture).toBeGreaterThan(marquage)
  })

  it('repond a l appelant si le courriel n est pas parti', () => {
    // Sans ce champ, l ecran afficherait un succes pour un message jamais
    // remis — exactement le cas qu on cherche a rendre visible.
    expect(source).toContain('emailSent:')
    expect(source).toContain('emailError:')
  })
})
