import { describe, expect, it } from 'vitest'
import {
  failedPasswordRules,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  passwordSchema,
} from './password'

const SOLIDE = 'Nexora2026!'

describe('regles de mot de passe', () => {
  it('accepte un mot de passe qui coche tout', () => {
    expect(isPasswordValid(SOLIDE)).toBe(true)
    expect(passwordSchema().safeParse(SOLIDE).success).toBe(true)
  })

  it('refuse ce que l ancienne regle laissait passer', () => {
    // La regle precedente se contentait de six caracteres : « motdepasse »
    // passait, « abcdef » aussi.
    expect(isPasswordValid('abcdef')).toBe(false)
    expect(isPasswordValid('motdepasse')).toBe(false)
  })

  it('exige chaque critere separement', () => {
    const cas: Array<[string, string]> = [
      ['Court1!', 'length'],
      ['nexora2026!', 'uppercase'],
      ['NEXORA2026!', 'lowercase'],
      ['NexoraCode!', 'digit'],
      ['Nexora2026', 'special'],
    ]
    for (const [valeur, manquant] of cas) {
      const ids = failedPasswordRules(valeur).map((r) => r.id)
      expect(ids, `${valeur} devrait manquer ${manquant}`).toContain(manquant)
    }
  })

  it('nomme ce qui manque plutot que de reciter la regle', () => {
    // « Missing: one number » est actionnable ; reciter toute la regle
    // oblige l'utilisateur a comparer lui-meme.
    const res = passwordSchema().safeParse('Nexoraaa!')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message.toLowerCase()).toContain('one number')
    }
  })

  it('accepte les caracteres speciaux de tous les claviers', () => {
    // Une liste fermee rejetait des caracteres valables : les dispositions
    // azerty, qwertz et non latines n'ont pas les memes touches.
    for (const c of ['!', '@', '#', '§', '€', 'µ', '«', '¡']) {
      expect(isPasswordValid(`Nexora20${c}`), `${c} devrait passer`).toBe(true)
    }
  })

  it('ne compte pas un espace comme caractere special', () => {
    // Sinon « Nexora 2026 » passerait, ce qui n'ajoute aucune entropie utile
    // et se tape de travers.
    expect(isPasswordValid('Nexora 2026')).toBe(false)
  })

  it('exige au moins huit caracteres', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(isPasswordValid('Nexo26!')).toBe(false)
    expect(isPasswordValid('Nexor26!')).toBe(true)
  })
})
