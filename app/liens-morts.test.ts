import { describe, expect, it } from 'vitest'
import { execSync } from 'child_process'

/**
 * Un lien mort sur le site se decouvre par un utilisateur qui tombe sur une
 * page d'erreur, jamais par nous. C'est arrive deux fois : les liens du hub
 * d'un tiers, puis ceux du depot GitHub — prive, donc en 404 pour tout le
 * monde sauf nous, qui sommes connectes et ne voyons jamais le probleme.
 *
 * Ce test ne visite pas le reseau : il serait lent et rouge des qu'un site
 * tiers tousse. Il verifie seulement qu'aucun lien ne pointe vers des
 * domaines dont on sait qu'ils ne nous servent pas.
 */
const liens = (): string[] => {
  const out = execSync(
    `grep -rhoE "https?://[^\\"'\\\`) ]+" app components --include=*.tsx || true`,
    { encoding: 'utf8', cwd: process.cwd() },
  )
  return [...new Set(out.split('\n').map((l) => l.replace(/[.,;]$/, '')).filter(Boolean))]
}

describe('liens du site', () => {
  it('ne renvoie vers aucun depot prive', () => {
    // Le depot est prive : chaque lien vers lui repond 404 au public.
    const morts = liens().filter((u) => /github\.com\/kemzang|raw\.githubusercontent\.com\/kemzang/i.test(u))
    expect(morts, `liens vers un depot prive : ${morts.join(', ')}`).toEqual([])
  })

  it('ne renvoie plus vers le hub d un tiers', () => {
    const morts = liens().filter((u) => /continue\.dev/i.test(u))
    expect(morts, `liens vers un tiers : ${morts.join(', ')}`).toEqual([])
  })

  it('installe le CLI par un canal reellement public', () => {
    // La commande documentee tirait un script depuis le depot prive : elle
    // repondait 404 a quiconque suivait la documentation.
    const src = execSync('cat app/docs/page.tsx', { encoding: 'utf8', cwd: process.cwd() })
    expect(src).toContain('npm install -g @nexoracoding/cli')
    expect(src).not.toContain('raw.githubusercontent.com')
  })

  it('ne laisse trainer aucune URL de preversion Vercel', () => {
    // Elles meurent au deploiement suivant.
    const morts = liens().filter((u) => /vercel\.app/i.test(u))
    expect(morts, `URL de preversion : ${morts.join(', ')}`).toEqual([])
  })
})
