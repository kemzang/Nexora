import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Les deux routes du proxy disent ou passe leur temps.
 *
 * La route FIM emet `Server-Timing` depuis le 24 novembre 2026, et
 * c'est grace a cette mesure qu'on a vu que 2,7 s sur 3 etaient a nous
 * et non au modele. `/chat/completions` ne l'emettait pas — or c'est
 * elle que prend tout modele sans FIM, celui que le selecteur de
 * l'extension marque « chat fallback ». Une lenteur signalee sur un
 * tel modele nous aurait laisses sans aucune mesure.
 *
 * L'extension lit cet en-tete et l'affiche dans son journal
 * d'autocompletion : le retirer d'un cote rendrait l'autre muet sans
 * qu'aucun test ne tombe.
 */
const RACINE = process.cwd()

const ROUTES = {
  FIM: 'app/api/proxy/model-proxy/v1/completions/route.ts',
  chat: 'app/api/proxy/model-proxy/v1/chat/completions/route.ts',
} as const

function source(chemin: string): string {
  return readFileSync(join(RACINE, chemin), 'utf8')
}

describe('Server-Timing du proxy', () => {
  it.each(Object.entries(ROUTES))('%s emet l en-tete', (_nom, chemin) => {
    expect(source(chemin)).toContain("'Server-Timing'")
  })

  it.each(Object.entries(ROUTES))(
    '%s porte les trois mesures attendues',
    (_nom, chemin) => {
      // L'extension ne retient que `auth`, `quota` et `model` : une
      // mesure renommee serait silencieusement ignoree cote client.
      const texte = source(chemin)
      for (const mesure of ['auth;dur=', 'quota;dur=', 'model;dur=']) {
        expect(texte).toContain(mesure)
      }
    },
  )

  it('ne divulgue aucune donnee utilisateur', () => {
    /*
     * Le garde-fou qui compte. Un en-tete est lisible par tout
     * intermediaire ; il ne doit porter que des durees.
     */
    const interdits = [
      'userId',
      'token',
      'prompt',
      'messages',
      'email',
      'key_hash',
    ]

    for (const chemin of Object.values(ROUTES)) {
      const texte = source(chemin)
      const debut = texte.indexOf("'Server-Timing'")
      expect(debut).toBeGreaterThan(-1)
      // Le bloc de l'en-tete : jusqu'a la fin de la liste jointe.
      const bloc = texte.slice(debut, texte.indexOf('].join(', debut))
      for (const interdit of interdits) {
        expect(bloc).not.toContain(interdit)
      }
    }
  })
})
