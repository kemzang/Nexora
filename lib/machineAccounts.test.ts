import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Le drapeau « plus de quota gratuit », et son cache.
 *
 * Le comptage des comptes par machine se fait UNE fois, a l'activation de
 * l'extension ; les routes ne font que lire un booleen. Mais elles le
 * lisent a chaque appel — y compris l'autocompletion, qui part a chaque
 * pause de frappe. Sans cache, c'etait un aller-retour de base
 * supplementaire la ou la latence se voit le plus.
 *
 * Deux proprietes a tenir, opposees : ne pas interroger la base a chaque
 * fois, et ne pas laisser un compte garder son quota apres qu'on le lui a
 * retire.
 */

const lectures = { compte: 0, bloque: false, erreur: false }
const cachePartage = new Map<string, unknown>()

vi.mock('./upstash-cache', () => ({
  cacheGet: async (k: string) =>
    cachePartage.has(k) ? cachePartage.get(k) : null,
  cacheSet: async (k: string, v: unknown) => {
    cachePartage.set(k, v)
  },
  cacheDel: async (...ks: string[]) => {
    ks.forEach((k) => cachePartage.delete(k))
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            lectures.compte++
            if (lectures.erreur) return { data: null, error: new Error('hs') }
            return { data: { free_quota_blocked: lectures.bloque }, error: null }
          },
        }),
      }),
    }),
  }),
}))

async function charger() {
  vi.resetModules()
  cachePartage.clear()
  return import('./machineAccounts')
}

beforeEach(() => {
  lectures.compte = 0
  lectures.bloque = false
  lectures.erreur = false
})

describe('lecture du blocage', () => {
  it('ne lit la base qu une fois pour des appels rapproches', async () => {
    const { isFreeQuotaBlocked } = await charger()

    await isFreeQuotaBlocked(null, 'u1')
    await isFreeQuotaBlocked(null, 'u1')
    await isFreeQuotaBlocked(null, 'u1')

    expect(lectures.compte).toBe(1)
  })

  it('distingue les utilisateurs', async () => {
    // Un cache indexe par utilisateur, sinon le blocage de l'un priverait
    // l'autre de son quota.
    const { isFreeQuotaBlocked } = await charger()
    lectures.bloque = true
    expect(await isFreeQuotaBlocked(null, 'u1')).toBe(true)
    lectures.bloque = false
    expect(await isFreeQuotaBlocked(null, 'u2')).toBe(false)
  })

  it('ne met pas une erreur de lecture en cache', async () => {
    /*
     * Une panne de base ne doit priver personne de son quota, et surtout
     * pas pendant une minute : on repond « non bloque » et on redemande au
     * prochain appel.
     */
    const { isFreeQuotaBlocked } = await charger()
    lectures.erreur = true

    expect(await isFreeQuotaBlocked(null, 'u3')).toBe(false)
    expect(await isFreeQuotaBlocked(null, 'u3')).toBe(false)

    expect(lectures.compte).toBe(2)
  })
})
