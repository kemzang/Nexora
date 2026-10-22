import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isPasswordValid } from '@/lib/password'

const lire = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

/**
 * La reinitialisation est la porte derobee classique : on durcit
 * l'inscription, on oublie « mot de passe oublie », et il suffit de demander
 * un lien pour contourner l'exigence. Ce test garde les deux alignes.
 */
describe('politique appliquee aux formulaires', () => {
  it('exige la politique a l inscription', () => {
    expect(lire('app/auth/register/page.tsx')).toContain('passwordSchema()')
  })

  it('exige la MEME politique a la reinitialisation', () => {
    const src = lire('app/auth/reset-password/page.tsx')
    expect(src).toContain('passwordSchema()')
    // L'ancienne regle a six caracteres ne doit plus trainer nulle part.
    expect(src).not.toContain('min(6')
  })

  it('ne valide aucun format a la connexion', () => {
    // Les comptes anterieurs ont des mots de passe a six caracteres : les
    // refuser a la connexion enfermerait dehors des gens legitimes.
    const src = lire('app/auth/login/page.tsx')
    expect(src).not.toContain('passwordSchema()')
  })

  it('offre l oeil sur les trois formulaires', () => {
    for (const p of [
      'app/auth/register/page.tsx',
      'app/auth/reset-password/page.tsx',
      'app/auth/login/page.tsx',
    ]) {
      expect(lire(p), `${p} sans PasswordInput`).toContain('PasswordInput')
      expect(lire(p), `${p} a encore un champ brut`).not.toContain('type="password"')
    }
  })

  it('montre les regles la ou on choisit un mot de passe', () => {
    for (const p of [
      'app/auth/register/page.tsx',
      'app/auth/reset-password/page.tsx',
    ]) {
      expect(lire(p), `${p} sans PasswordRequirements`).toContain('PasswordRequirements')
    }
  })

  it('le mot de passe du testeur devrait encore passer', () => {
    // Garde-fou de bon sens : la politique doit rester tenable.
    expect(isPasswordValid('Nexora2026!')).toBe(true)
  })
})
