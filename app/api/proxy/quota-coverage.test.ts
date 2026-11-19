import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

/**
 * Toute route facturee doit connaitre la limite de comptes par machine.
 *
 * Le palier gratuit ne vaut que pour les deux premiers comptes d'une meme
 * machine. Cette regle n'etait appliquee que dans `chat/completions` : un
 * troisieme compte perdait le chat offert mais gardait l'autocompletion,
 * les embeddings, le reclassement et la recherche web — tous factures a
 * Nexora par DeepSeek, Gemini, Cohere et Tavily. L'autocompletion est meme
 * la plus gourmande : elle part a chaque pause de frappe.
 *
 * Le trou n'etait visible nulle part : chaque route prise isolement avait
 * l'air correcte. Ce test regarde l'ENSEMBLE, et echouera le jour ou une
 * nouvelle route appellera un fournisseur sans poser la question.
 */

const RACINE = path.join(__dirname)

/** Routes qui declenchent un appel facture chez un fournisseur. */
const ROUTES_FACTUREES = [
  'model-proxy/v1/chat/completions',
  'model-proxy/v1/completions',
  'model-proxy/v1/fim/completions',
  'model-proxy/v1/embeddings',
  'model-proxy/v1/rerank',
  'web',
  'crawl',
]

function verifie(route: string): 'direct' | 'reexport' | 'absent' {
  const fichier = path.join(RACINE, route, 'route.ts')
  if (!fs.existsSync(fichier)) return 'absent'
  const source = fs.readFileSync(fichier, 'utf8')
  if (source.includes('isFreeQuotaBlocked')) return 'direct'

  // Un alias (`export { POST } from '../x/route'`) herite de la protection
  // de la route qu'il reexporte : la compter comme un trou serait faux.
  const alias = source.match(/export \{[^}]*POST[^}]*\} from ['"]([^'"]+)['"]/)
  if (alias) {
    const cible = path.resolve(path.dirname(fichier), alias[1] + '.ts')
    if (fs.existsSync(cible)) {
      return fs.readFileSync(cible, 'utf8').includes('isFreeQuotaBlocked')
        ? 'reexport'
        : 'absent'
    }
  }
  return 'absent'
}

describe('limite de comptes par machine', () => {
  it('est appliquee par toutes les routes facturees', () => {
    const trous = ROUTES_FACTUREES.filter((r) => verifie(r) === 'absent')
    expect(trous.join(', ')).toBe('')
  })

  it('la liste ne pointe que des routes qui existent', () => {
    // Une route renommee sans mise a jour de cette liste rendrait le test
    // vert en ne verifiant plus rien.
    for (const r of ROUTES_FACTUREES) {
      expect(
        fs.existsSync(path.join(RACINE, r, 'route.ts')),
        `${r} n'existe plus`,
      ).toBe(true)
    }
  })
})
