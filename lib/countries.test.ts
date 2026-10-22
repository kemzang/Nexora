import { describe, expect, it } from 'vitest'
import { COUNTRIES, checkPhone, findCountry, toE164 } from './countries'

describe('liste des pays', () => {
  it('couvre le monde sans doublon', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200)
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length)
  })

  it('donne un nom, un indicatif et un drapeau a chacun', () => {
    for (const c of COUNTRIES) {
      expect(c.name, c.code).toBeTruthy()
      expect(c.dial, c.code).toMatch(/^\d+$/)
      expect([...c.flag].length, c.code).toBe(2) // deux indicateurs regionaux
    }
  })

  it('contient le Cameroun avec le bon indicatif', () => {
    expect(findCountry('CM')).toMatchObject({ name: 'Cameroon', dial: '237' })
  })
})

describe('verification du numero', () => {
  it('accepte un numero camerounais bien forme, avec ou sans indicatif', () => {
    expect(checkPhone('691234567', 'CM').ok).toBe(true)
    expect(checkPhone('+237 691 234 567', 'CM').ok).toBe(true)
  })

  it('refuse un numero trop court ou trop long pour le pays', () => {
    // La France a neuf chiffres : huit ou dix sont une faute de frappe.
    expect(checkPhone('12345678', 'FR').ok).toBe(false)
    expect(checkPhone('1234567890', 'FR').ok).toBe(false)
    expect(checkPhone('123456789', 'FR').ok).toBe(true)
  })

  it('dit ce qui ne va pas plutot que « invalide »', () => {
    const r = checkPhone('12345678', 'FR')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('9 digits')
  })

  it('laisse passer un pays dont la longueur nous est inconnue', () => {
    // Mieux vaut ne rien verifier que refuser un numero valable sur une
    // regle inventee.
    expect(checkPhone('12345678', 'AF').ok).toBe(true)
  })

  it('reste facultatif', () => {
    expect(checkPhone('', 'CM').ok).toBe(true)
  })

  it('exige un pays avant de juger', () => {
    expect(checkPhone('691234567', '').ok).toBe(false)
  })

  it('refuse ce qui depasse la limite E.164 de quinze chiffres', () => {
    expect(checkPhone('1'.repeat(20), 'AF').ok).toBe(false)
  })
})

describe('mise au format international', () => {
  it('ajoute l indicatif absent', () => {
    expect(toE164('691234567', 'CM')).toBe('+237691234567')
  })

  it('ne le double pas quand il est deja la', () => {
    expect(toE164('+237 691 234 567', 'CM')).toBe('+237691234567')
    // « 00 » est la forme composee depuis un fixe en Europe et en Afrique.
    expect(toE164('00237691234567', 'CM')).toBe('+237691234567')
  })

  it('retire les separateurs de saisie', () => {
    expect(toE164('06 91 23 45 67', 'CM')).toMatch(/^\+237\d+$/)
  })

  it('rend une chaine vide quand il n y a pas de numero', () => {
    expect(toE164('', 'CM')).toBe('')
  })
})
