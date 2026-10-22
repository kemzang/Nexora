import { describe, expect, it } from 'vitest'
import { isOrgActive, orgCreditLimit, slugify } from './organizations'

const base = { status: 'active' as const, contractEndsAt: null as string | null }
const dans = (j: number) => new Date(Date.now() + j * 86_400_000).toISOString()

describe('acces d une organisation', () => {
  it('ouvre l acces a un contrat en cours', () => {
    expect(isOrgActive({ ...base, contractEndsAt: dans(30) })).toBe(true)
  })

  it('ferme l acces des que le contrat est echu', () => {
    // C'etait le trou : une equipe gardait son quota indefiniment, et on ne
    // s'en apercevait qu'en lisant la facture des fournisseurs.
    expect(isOrgActive({ ...base, contractEndsAt: dans(-1) })).toBe(false)
  })

  it('laisse ouvert un contrat sans echeance', () => {
    // Duree indeterminee, et organisations creees avant la colonne : on ne
    // coupe pas retroactivement l'acces de quelqu'un.
    expect(isOrgActive(base)).toBe(true)
  })

  it('respecte une suspension meme si le contrat court encore', () => {
    expect(
      isOrgActive({ status: 'suspended', contractEndsAt: dans(90) }),
    ).toBe(false)
    expect(
      isOrgActive({ status: 'cancelled', contractEndsAt: dans(90) }),
    ).toBe(false)
  })

  it('ne coupe pas sur une date illisible', () => {
    // Mieux vaut un acces ouvert a tort qu'une equipe qui paie coupee par
    // une donnee abimee.
    expect(isOrgActive({ ...base, contractEndsAt: 'pas-une-date' })).toBe(true)
  })
})

describe('pot commun', () => {
  it('multiplie les sieges par les credits de chacun', () => {
    expect(orgCreditLimit({ seats: 3, creditsPerSeat: 40_000_000 })).toBe(120_000_000)
  })
})

describe('identifiant lisible', () => {
  it('retire accents et ponctuation', () => {
    expect(slugify('Société Générale & Co')).toMatch(/^societe-generale-co-[0-9a-f]{6}$/)
  })

  it('ajoute un suffixe pour que deux homonymes coexistent', () => {
    // Deux entreprises peuvent porter le meme nom ; boucler sur les
    // collisions sous contrainte unique ouvre une course entre deux
    // creations simultanees.
    expect(slugify('Acme')).not.toBe(slugify('Acme'))
  })
})
