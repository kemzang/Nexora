import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { lireMethode, noterMethode } from './derniereMethode'

/**
 * Le rappel « Last used ».
 *
 * Il doit se taire plutot que de mentir. Une pastille posee sur la
 * mauvaise methode est pire que pas de pastille : elle envoie quelqu'un
 * essayer un mot de passe qu'il n'a jamais defini.
 */
function faireStockage() {
  const donnees = new Map<string, string>()
  return {
    getItem: (k: string) => donnees.get(k) ?? null,
    setItem: (k: string, v: string) => void donnees.set(k, v),
    removeItem: (k: string) => void donnees.delete(k),
    clear: () => donnees.clear(),
    donnees,
  }
}

let stockage: ReturnType<typeof faireStockage>

beforeEach(() => {
  stockage = faireStockage()
  vi.stubGlobal('window', { localStorage: stockage })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('derniereMethode', () => {
  it('rend null quand rien n a jamais ete note', () => {
    // Premiere visite : aucune pastille, et surtout pas celle du mot de
    // passe « par defaut ».
    expect(lireMethode()).toBeNull()
  })

  it('retient et relit les trois methodes', () => {
    for (const m of ['password', 'google', 'github'] as const) {
      noterMethode(m)
      expect(lireMethode()).toBe(m)
    }
  })

  it('remplace la precedente plutot que de l empiler', () => {
    noterMethode('google')
    noterMethode('password')
    expect(lireMethode()).toBe('password')
  })

  it('ignore une valeur inventee a la main', () => {
    /*
     * localStorage se modifie depuis la console du navigateur. Une
     * valeur fantaisiste ne doit pas faire apparaitre de pastille
     * ailleurs qu'a sa place.
     */
    stockage.donnees.set('nxr-derniere-methode', 'facebook')
    expect(lireMethode()).toBeNull()

    stockage.donnees.set('nxr-derniere-methode', '')
    expect(lireMethode()).toBeNull()
  })

  it('ne jette pas quand le stockage est refuse', () => {
    // Navigation privee, cookies bloques, quota plein : la connexion
    // doit fonctionner, seul le rappel disparait.
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('refuse')
        },
        setItem: () => {
          throw new Error('refuse')
        },
      },
    })

    expect(() => noterMethode('google')).not.toThrow()
    expect(lireMethode()).toBeNull()
  })
})
