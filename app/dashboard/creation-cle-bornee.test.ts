import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * La creation d'une cle API ne peut plus attendre indefiniment.
 *
 * `fetch` n'a aucune expiration par defaut. Sur une liaison qui decroche,
 * la promesse ne se resout jamais : le bouton restait sur « Creating… »
 * sans fin, sans message, et il devenait impossible de distinguer « c'est
 * lent » de « c'est mort ». Constate le 23 novembre 2026, ou une requete
 * sur trois vers cette route n'aboutissait pas tandis que les autres
 * repondaient en 1 a 4 secondes.
 *
 * Le piege, en corrigeant : cette requete n'est PAS idempotente. Une
 * expiration ne dit pas que rien n'a ete cree, seulement qu'on n'a pas
 * recu la reponse. Le serveur a peut-etre insere la cle, dont le jeton
 * n'est montre qu'une fois — un second envoi automatique laisserait donc
 * une cle fantome, inutilisable et deroutante. D'ou l'interdiction de
 * reessayer tout seul, et l'obligation de rafraichir la liste.
 */
const SOURCE = readFileSync(
  join(process.cwd(), 'app/dashboard/sections/ApiKeysSection.tsx'),
  'utf8',
)

// Le corps de `handleCreate`, du nom de la fonction jusqu'a la suivante.
const HANDLE_CREATE = SOURCE.slice(
  SOURCE.indexOf('const handleCreate'),
  SOURCE.indexOf('const handleCopy'),
)

describe('creation d une cle API', () => {
  it('borne l attente', () => {
    expect(HANDLE_CREATE).toContain('AbortSignal.timeout')
  })

  it('appelle bien la route de creation dans cette fonction', () => {
    // Garde-fou : si la fonction est renommee ou deplacee, les assertions
    // ci-dessus porteraient sur un texte vide et passeraient sans rien
    // verifier.
    expect(HANDLE_CREATE).toContain("'/api/keys/create'")
    expect(HANDLE_CREATE.length).toBeGreaterThan(400)
  })

  it('distingue une expiration d une autre panne', () => {
    // Les deux cas n'appellent pas la meme reaction : apres une
    // expiration la cle existe peut-etre, apres une erreur reseau non.
    expect(HANDLE_CREATE).toContain('TimeoutError')
  })

  it('previent que la cle a pu etre creee quand meme', () => {
    expect(HANDLE_CREATE).toMatch(/may have been created/i)
  })

  it('rafraichit la liste apres un echec', () => {
    // Sans ce rafraichissement, une cle creee pendant l'expiration reste
    // invisible et la personne en recree une autre par-dessus.
    const echec = HANDLE_CREATE.slice(HANDLE_CREATE.indexOf('} catch'))
    expect(echec).toContain('fetchKeys')
  })

  it('ne reessaie jamais tout seul', () => {
    // Le point le plus important : la requete n'est pas idempotente.
    const echec = HANDLE_CREATE.slice(HANDLE_CREATE.indexOf('} catch'))
    expect(echec).not.toContain("fetch('/api/keys/create'")
  })

  it('laisse un message a l ecran, pas seulement un toast fugace', () => {
    expect(SOURCE).toContain('setCreateError')
    expect(SOURCE).toContain('role="alert"')
  })
})
