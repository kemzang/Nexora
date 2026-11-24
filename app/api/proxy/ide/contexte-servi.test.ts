import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * L'assistant heberge doit servir les fournisseurs `@`.
 *
 * `core/config/default.ts` en declare sept — mais ce fichier ne vaut que
 * pour le profil local, un reliquat de Continue que personne n'utilise en
 * production. La configuration reellement recue par les utilisateurs
 * connectes vient d'ici, et ce champ valait `[]`.
 *
 * Consequence constatee le 23 novembre 2026 : aucun utilisateur n'avait
 * jamais vu `@web`, dont la cle Tavily est payee et le point d'entree
 * (/api/proxy/web) deploye depuis des semaines. Le menu `@` n'offrait que
 * les huit fournisseurs charges d'office par le coeur.
 */
const SOURCE = readFileSync(
  join(process.cwd(), 'app/api/proxy/ide/list-assistants/route.ts'),
  'utf8',
)

describe('fournisseurs de contexte servis', () => {
  it('n en sert plus une liste vide', () => {
    expect(SOURCE).not.toMatch(/context:\s*\[\s*\]/)
  })

  it('sert la recherche web, qui est payee', () => {
    expect(SOURCE).toContain("{ provider: 'web' }")
  })

  it.each(['folder', 'open', 'url', 'search', 'tree'])(
    'sert %s',
    (nom) => {
      expect(SOURCE).toContain(`{ provider: '${nom}' }`)
    },
  )

  it('laisse codebase de cote tant qu aucun modele d embeddings n est servi', () => {
    // Le garde-fou. `codebase` sans modele `embed` dans la meme liste
    // echoue a l'usage, et il declenche l'indexation du depot de chaque
    // utilisateur : c'est une decision separee, pas un oubli.
    const sertUnEmbedder = /roles[^\n]*\bembed\b/.test(SOURCE)
    const sertCodebase = SOURCE.includes("{ provider: 'codebase' }")
    expect(sertCodebase).toBe(sertUnEmbedder)
  })

  it('affiche dans le YAML ce qui est reellement applique', () => {
    // La regle que le fichier pose deja pour les roles : ce que
    // l'utilisateur lit doit correspondre a la config appliquee.
    expect(SOURCE).toContain('`context:`')
    expect(SOURCE).toContain('context.map')
  })
})
