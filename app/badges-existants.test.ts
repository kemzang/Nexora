import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Une classe `badge-*` inexistante ne casse rien : elle rend juste un texte
 * nu, sans pastille, sans couleur. Rien ne le signale — ni TypeScript, ni
 * Tailwind, ni les tests. Le 28 novembre 2026, un `badge-danger` a failli
 * partir en production alors que la classe s'appelle `badge-error`.
 */
function fichiers(racine: string, suffixes: string[]): string[] {
  const sortie: string[] = []
  for (const nom of readdirSync(racine)) {
    if (nom === 'node_modules' || nom === '.next' || nom.startsWith('.')) continue
    const chemin = join(racine, nom)
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin, suffixes))
    else if (suffixes.some((s) => nom.endsWith(s))) sortie.push(chemin)
  }
  return sortie
}

describe('classes de pastille', () => {
  it('chaque badge-* utilisé existe dans globals.css', () => {
    const css = readFileSync('app/globals.css', 'utf8')
    const definies = new Set(
      [...css.matchAll(/\.(badge-[a-z]+)\s*\{/g)].map((m) => m[1]),
    )
    expect(definies.size).toBeGreaterThan(0)

    const manquantes: string[] = []
    for (const f of [...fichiers('app', ['.tsx']), ...fichiers('components', ['.tsx'])]) {
      const source = readFileSync(f, 'utf8')
      for (const m of source.matchAll(/["'`](badge-[a-z]+)["'`\s]/g)) {
        if (!definies.has(m[1])) manquantes.push(`${f} → ${m[1]}`)
      }
    }
    expect(manquantes, `classes inexistantes :\n${manquantes.join('\n')}`).toEqual([])
  })
})
