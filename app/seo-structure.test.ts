import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Deux defauts qui ne se voient pas a l'ecran et qu'aucun test ne couvrait.
 *
 * Ils ont ete trouves en cherchant pourquoi Google comprend mal le site et
 * met en avant une autre entreprise au nom voisin. On ne peut rien contre le
 * concurrent ; on peut au moins ne pas brouiller sa propre page.
 */

const RACINE = path.resolve(__dirname, '..')
const lire = (f: string) => fs.readFileSync(path.join(RACINE, f), 'utf8')

const PAGES = [
  'app/about/page.tsx',
  'app/pricing/pricing-client.tsx',
  'app/page.tsx',
]

describe('structure des titres', () => {
  it('PageHeader rend un titre de section, pas de page', () => {
    // Il rendait un <h1> alors qu'il est utilise deux fois par page, sous un
    // <h1> deja present : /about et /pricing en comptaient trois chacune.
    const src = lire('components/patterns/page-header.tsx')
    expect(src).toContain('level = 2')
    expect(src).not.toMatch(/<h1 className/)
  })

  it('aucune page ne declare plus d un titre principal', () => {
    for (const f of PAGES) {
      const n = (lire(f).match(/<h1[\s>]/g) || []).length
      expect(n, `${f} contient ${n} <h1>`).toBeLessThanOrEqual(1)
    }
  })
})

describe('langue du contenu', () => {
  /** Les accents francais ne survivent pas a une traduction oubliee. */
  const ACCENTS = /[àâäéèêëîïôöùûüçÀÂÉÈÊËÎÏÔÙÛÇ]/

  it('les pages publiques sont en anglais', () => {
    /*
     * /about etait entierement en francais alors que <html lang="en">, que
     * l'accueil et Pricing sont en anglais, et que le produit parle anglais.
     * Declarer une langue et en servir une autre demande a Google de se
     * tromper de public.
     *
     * On ne regarde que les chaines affichees : les commentaires restent en
     * francais, c'est la convention du depot.
     */
    for (const f of PAGES) {
      const lignes = lire(f).split('\n')
      const fautives = lignes
        .map((l, i) => ({ l: l.trim(), i: i + 1 }))
        .filter(
          ({ l }) =>
            ACCENTS.test(l) &&
            !l.startsWith('//') &&
            !l.startsWith('*') &&
            !l.startsWith('/*'),
        )
        .map(({ l, i }) => `${f}:${i} ${l.slice(0, 60)}`)
      expect(fautives, fautives.join('\n')).toEqual([])
    }
  })
})
