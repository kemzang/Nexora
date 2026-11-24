import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Un abonnement echu ne doit plus rien ouvrir.
 *
 * `status = 'active'` ne suffit pas : le statut ne bascule qu'au passage
 * d'un webhook, et il s'ecoule un delai — parfois long si le paiement
 * echoue ou si le fournisseur retarde sa notification. Pendant ce
 * delai, seule `current_period_end` dit la verite.
 *
 * Le 24 novembre 2026, trois routes filtraient sur le statut seul :
 * /proxy/chat, /model-proxy/v1/completions et /model-proxy/v1/models.
 * Consequence sur la premiere : `autocompleteIsFree = plan !== 'free'`
 * donnait l'autocompletion ILLIMITEE, sans decompte de credits, a un
 * abonnement termine. Cinq autres routes verifiaient correctement.
 *
 * C'est le propre d'une fonction recopiee — `getUserPlan` existait en
 * quatre exemplaires : on la corrige a un endroit, elle reste fausse
 * ailleurs. Elle vit desormais dans `lib/quota.ts`, et ce test interdit
 * d'en refaire une.
 */
const RACINE = process.cwd()
const DOSSIERS = ['app', 'lib']

// La marque d'une lecture qui decide des droits : elle joint le plan.
const LECTURE_DE_DROITS = "subscription_plans!inner(slug)"

/*
 * Lire le CODE, pas les commentaires.
 *
 * La premiere version de ce test cherchait `current_period_end` dans le
 * texte brut. Les commentaires qui EXPLIQUENT l'oubli contiennent ce
 * nom — le test se faisait donc berner par sa propre documentation et
 * declarait saine une route fautive. Verifie le 24 novembre 2026 par
 * injection : il ne voyait rien.
 */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

function fichiers(dossier: string): string[] {
  const trouves: string[] = []
  const parcourir = (d: string) => {
    for (const entree of readdirSync(d)) {
      if (entree === 'node_modules' || entree.startsWith('.')) continue
      const chemin = join(d, entree)
      if (statSync(chemin).isDirectory()) parcourir(chemin)
      else if (chemin.endsWith('.ts') && !chemin.endsWith('.test.ts')) {
        trouves.push(chemin)
      }
    }
  }
  parcourir(join(RACINE, dossier))
  return trouves
}

const lecteurs = DOSSIERS.flatMap(fichiers)
  .map((chemin) => ({
    chemin,
    source: sansCommentaires(readFileSync(chemin, 'utf8')),
  }))
  .filter(({ source }) => source.includes(LECTURE_DE_DROITS))

describe('abonnement echu', () => {
  it('au moins un fichier lit les droits (sinon ce test ne verifie rien)', () => {
    expect(lecteurs.length).toBeGreaterThan(3)
  })

  it('aucune lecture de droits n ignore la date de fin', () => {
    const fautifs = lecteurs
      .filter(({ source }) => !source.includes('current_period_end'))
      .map(({ chemin }) => relative(RACINE, chemin))

    expect(fautifs).toEqual([])
  })

  it('aucune copie de getUserPlan ne reinterroge la base', () => {
    /*
     * Le vrai risque n'est pas le NOM de la fonction, c'est qu'elle
     * refasse la requete pour son compte : c'est la copie qui derive,
     * pas l'appel. Une delegation d'une ligne vers `lib/quota.ts` —
     * comme `getUserPlan` de chat/completions, qui rend simplement le
     * plan de `getUserPlanWindow` — est parfaitement saine.
     *
     * On n'interdit donc que les corps qui interrogent eux-memes
     * `user_subscriptions`.
     */
    const fautifs: string[] = []

    for (const chemin of DOSSIERS.flatMap(fichiers)) {
      if (chemin.endsWith('lib/quota.ts')) continue
      const source = sansCommentaires(readFileSync(chemin, 'utf8'))
      const debut = source.search(/async function getUserPlan\s*\(/)
      if (debut === -1) continue

      // Le corps va jusqu'a la premiere accolade fermante en colonne 0.
      const reste = source.slice(debut)
      const fin = reste.search(/\n\}/)
      const corps = fin === -1 ? reste : reste.slice(0, fin)

      if (corps.includes("from('user_subscriptions')")) {
        fautifs.push(relative(RACINE, chemin))
      }
    }

    expect(fautifs).toEqual([])
  })
})
