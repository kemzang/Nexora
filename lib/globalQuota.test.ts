import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Le plafond mensuel global.
 *
 * Les limites par utilisateur empechent un compte d'abuser ; elles
 * n'empechent pas la somme de tous les comptes de depasser le quota offert
 * par Tavily. Trente-quatre comptes gratuits epuisant chacun leurs trente
 * recherches suffisent a franchir le millier de credits — apres quoi, « Pay
 * as you go » etant actif, la consommation se facture au lieu de s'arreter.
 *
 * Ces tests fixent les deux proprietes qui comptent : on compte bien sur le
 * mois CALENDAIRE (la fenetre du fournisseur, pas celle de nos abonnements),
 * et un plafond nul ou negatif ne bloque rien.
 */

const compteur = { valeur: 0, filtres: {} as Record<string, unknown> }

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (colonne: string, valeur: unknown) => {
          compteur.filtres[colonne] = valeur
          return {
            gte: (colonne2: string, valeur2: unknown) => {
              compteur.filtres[colonne2] = valeur2
              return Promise.resolve({ count: compteur.valeur })
            },
          }
        },
      }),
    }),
    auth: { admin: { getUserById: async () => ({ data: null }) } },
  }),
}))

vi.mock('./upstash-cache', () => ({
  cacheGet: async () => null,
  cacheSet: async () => undefined,
}))

const { getGlobalMonthlyCallCount, isGlobalCallLimitReached } = await import(
  './quota'
)

beforeEach(() => {
  compteur.valeur = 0
  compteur.filtres = {}
  vi.useRealTimers()
})

describe('plafond global mensuel', () => {
  it('compte depuis le premier jour du mois calendaire UTC', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T05:00:00Z'))
    compteur.valeur = 42

    await getGlobalMonthlyCallCount('web_search')

    expect(compteur.filtres['session_type']).toBe('web_search')
    expect(compteur.filtres['started_at']).toBe('2026-11-01T00:00:00.000Z')
  })

  it('bloque une fois le plafond atteint', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T06:00:00Z'))
    compteur.valeur = 800

    expect(await isGlobalCallLimitReached('web_search', 800)).toBe(true)
  })

  it('laisse passer en dessous', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T07:00:00Z'))
    compteur.valeur = 799

    expect(await isGlobalCallLimitReached('web_search', 800)).toBe(false)
  })

  it('un plafond nul signifie « pas de plafond »', async () => {
    // Le jour ou le compte fournisseur est paye et bride de son cote, on
    // veut pouvoir desactiver le garde-fou sans toucher au code.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-18T08:00:00Z'))
    compteur.valeur = 999_999

    expect(await isGlobalCallLimitReached('web_search', 0)).toBe(false)
  })
})
