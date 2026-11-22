import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PLANS } from './models'

/**
 * Un seul endroit decide des prix.
 *
 * Le tableau de bord recopiait les offres au lieu de lire PLANS. Elles
 * ont derive : l'ecran d'abonnement annoncait un Enterprise a 80 $ pour
 * 100 M de credits, quand l'offre reelle est « a partir de 30 $ » pour
 * 40 M par siege. Deux prix pour la meme chose sur le meme site — et
 * celui affiche vendait justement le volume qu'un commentaire de
 * models.ts decrit comme mettant le plan en perte de 27 $.
 *
 * Personne n'avait menti : quelqu'un avait copie-colle, puis les prix
 * avaient bouge d'un cote seulement. C'est ce que ce test empeche.
 */
const RACINE = process.cwd()
const DOSSIERS = ['app', 'components', 'lib']

// Le fichier des offres, et lui seul, a le droit d'ecrire un prix.
const AUTORISES = new Set(['lib/models.ts'])

const PRIX_EN_DUR = /(['"`])\$\d[\d.,]*\1|>\s*\$\d[\d.,]*\s*</g

function fichiers(dossier: string): string[] {
  const trouves: string[] = []
  for (const entree of readdirSync(dossier)) {
    if (entree === 'node_modules' || entree.startsWith('.')) continue
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) {
      trouves.push(...fichiers(chemin))
    } else if (/\.(ts|tsx)$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      trouves.push(chemin)
    }
  }
  return trouves
}

describe('les prix ne vivent qu a un endroit', () => {
  it('aucun ecran n ecrit un prix en dur', () => {
    const coupables: string[] = []

    for (const dossier of DOSSIERS) {
      for (const chemin of fichiers(join(RACINE, dossier))) {
        const relatif = relative(RACINE, chemin)
        if (AUTORISES.has(relatif)) continue
        // Un `placeholder` est un EXEMPLE montre dans un champ vide, pas
        // un tarif : « Amount raised » suggere « $120,000 » sans rien
        // facturer. On le retire avant de chercher.
        const source = readFileSync(chemin, 'utf8').replace(
          /placeholder=(["'])(?:(?!\1).)*\1/g,
          '',
        )
        for (const trouve of source.match(PRIX_EN_DUR) ?? []) {
          coupables.push(`${relatif} → ${trouve}`)
        }
      }
    }

    expect(
      coupables,
      'Un prix ecrit ailleurs que dans lib/models.ts finira par ne plus ' +
        'correspondre a ce qui est facture. Lire PLANS[slug].priceLabel.',
    ).toEqual([])
  })

  it('Enterprise reste une offre par siege, pas un forfait', () => {
    /*
     * Le cas precis qui a derive. Un `priceLabel` sans « from » voudrait
     * dire prix unique, et l'ecran renverrait alors vers la caisse pour
     * un contrat a dix sieges minimum.
     */
    expect(PLANS.enterprise.priceLabel).toContain('from')
    expect(PLANS.enterprise.features.join(' ')).toContain('per seat')
    expect(PLANS.enterprise.features.join(' ')).toContain('seats minimum')
  })

  it('les credits annonces suivent tokensPerMonth', () => {
    // 100M avait ete ecrit a l'ecran pour une offre a 40M.
    expect(PLANS.enterprise.tokensPerMonth).toBe(40_000_000)
    expect(PLANS.business.tokensPerMonth).toBe(40_000_000)
    expect(PLANS.pro.tokensPerMonth).toBe(15_000_000)
  })
})
