import { describe, expect, it } from 'vitest'
import { emailSchema, normalizeEmail } from './email'

const parse = (v: string) => emailSchema().safeParse(v)

describe('validation d email', () => {
  it('pardonne les espaces du copier-coller', () => {
    // Coller depuis un gestionnaire de mots de passe embarque souvent une
    // espace. L'adresse etait declaree invalide alors qu'elle est correcte,
    // et on relit son adresse dix fois sans voir ce qui cloche.
    const r = parse('  bryan@gmail.com  ')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('bryan@gmail.com')
  })

  it('ramene la casse a minuscules', () => {
    // Le clavier des telephones met une majuscule a la premiere lettre.
    // Stockees telles quelles, Bryan@ et bryan@ deviennent deux comptes.
    const r = parse('Bryan@Gmail.COM')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('bryan@gmail.com')
  })

  it('refuse toujours ce qui n est pas une adresse', () => {
    for (const v of ['a@b', 'bryan@gmail', 'bryan@.com', 'bryan@@gmail.com', 'bryan']) {
      expect(parse(v).success, `${v} ne devrait pas passer`).toBe(false)
    }
  })

  it('accepte les adresses legitimes qu on rejette souvent a tort', () => {
    for (const v of ['bryan+facture@gmail.com', 'b.k@sous.domaine.co.uk', "o'neil@example.com"]) {
      expect(parse(v).success, `${v} devrait passer`).toBe(true)
    }
  })

  it('distingue le champ vide de l adresse malformee', () => {
    const r = parse('   ')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Email is required')
  })

  it('parle anglais, comme le reste du produit', () => {
    const r = parse('pas-une-adresse')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe('Enter a valid email address')
  })

  it('expose la meme normalisation hors formulaire', () => {
    expect(normalizeEmail('  Bryan@Gmail.COM ')).toBe('bryan@gmail.com')
  })
})
