import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Pas d'emoji dans l'interface.
 *
 * Retour de Bryan le 28 novembre 2026 : « il y a tes emojis là qui
 * montrent que c'est IA et c'est pas présentable ». Douze occurrences
 * dans sept fichiers, dont un « Bonjour {prénom} 👋 » en premiere page
 * du tableau de bord.
 *
 * Ce n'etait pas un parti pris : le site utilise `lucide-react` dans
 * plus de cinquante fichiers. Ces emojis etaient des oublis.
 *
 * Trois raisons objectives, au-dela du gout : un emoji se dessine
 * differemment sur chaque systeme, il ne suit ni la couleur du texte
 * ni le theme sombre, et il ne s'aligne pas sur la ligne de base.
 */
const RACINE = process.cwd()
const DOSSIERS = ['app', 'components']

const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u

/*
 * Lire le CODE, pas les commentaires.
 *
 * Le commentaire qui EXPLIQUE un emoji retire en contient forcement
 * un. Un test qui lit le texte brut se ferait donc berner par sa
 * propre documentation — l'erreur commise le 24 novembre sur la
 * verification des abonnements echus.
 */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

function fichiers(dossier: string): string[] {
  const trouves: string[] = []
  const parcourir = (d: string) => {
    for (const entree of readdirSync(d)) {
      if (entree === 'node_modules' || entree.startsWith('.')) continue
      const chemin = join(d, entree)
      if (statSync(chemin).isDirectory()) parcourir(chemin)
      else if (/\.(tsx|ts)$/.test(chemin) && !chemin.endsWith('.test.ts')) {
        trouves.push(chemin)
      }
    }
  }
  parcourir(join(RACINE, dossier))
  return trouves
}

const SOURCES = DOSSIERS.flatMap(fichiers).map((chemin) => ({
  chemin: relative(RACINE, chemin),
  code: sansCommentaires(readFileSync(chemin, 'utf8')),
}))

describe('interface sans emoji', () => {
  it('parcourt bien le site', () => {
    // Garde-fou : un parcours casse rendrait l'assertion suivante vide
    // et toujours verte.
    expect(SOURCES.length).toBeGreaterThan(50)
  })

  it('detecte reellement un emoji', () => {
    // Le second garde-fou : une expression trop permissive ne verrait
    // jamais rien.
    expect(EMOJI.test('Bonjour \u{1F44B}')).toBe(true)
    expect(EMOJI.test('Welcome back')).toBe(false)
  })

  it('aucun emoji dans le code rendu', () => {
    const fautifs = SOURCES.filter(({ code }) => EMOJI.test(code)).map(
      ({ chemin }) => chemin,
    )
    expect(fautifs).toEqual([])
  })
})
