import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Le cache d'authentification doit etre partage, et ne rien divulguer.
 *
 * `verifyToken` ne gardait ses resultats qu'en memoire. Vercel demarre
 * sans cesse de nouvelles instances, chacune avec une Map vide :
 * l'autocompletion, qui part a chaque pause de frappe, tombait donc
 * presque toujours sur une instance neuve et repayait deux allers-retours
 * Supabase.
 *
 * Mesure du 24 novembre 2026 : 1822 ms pour cette seule fonction, quand
 * DeepSeek rendait son premier jeton en 360 ms. L'editeur annulait bien
 * avant, et aucune suggestion ne s'affichait jamais.
 *
 * Le piege en corrigeant : un cache partage est lisible ailleurs. La
 * clef doit etre le HACHAGE du jeton, jamais le jeton — sinon on y
 * trouverait de quoi se faire passer pour quelqu'un.
 */
const partage = new Map<string, unknown>()
let lecturesBase = 0

vi.mock('./upstash-cache', () => ({
  cacheGet: async (k: string) => (partage.has(k) ? partage.get(k) : null),
  cacheSet: async (k: string, v: unknown) => {
    partage.set(k, v)
  },
  cacheDel: async (...ks: string[]) => ks.forEach((k) => partage.delete(k)),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => {
              lecturesBase++
              return {
                data: {
                  user_id: 'u-42',
                  is_active: true,
                  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
                },
                error: null,
              }
            },
          }),
        }),
      }),
      update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { email_confirmed_at: new Date().toISOString() } },
          error: null,
        }),
      },
    },
  }),
}))

const JETON = 'nxr_0123456789abcdef0123456789abcdef01234567'

async function charger() {
  vi.resetModules()
  return await import('./auth-verify')
}

describe('cache du jeton', () => {
  beforeEach(() => {
    partage.clear()
    lecturesBase = 0
  })

  it('evite la base quand une AUTRE instance a deja verifie', async () => {
    const premiere = await charger()
    expect(await premiere.verifyToken(JETON)).toBe('u-42')
    expect(lecturesBase).toBe(1)

    // Instance neuve : memoire vide, mais cache partage chaud.
    const seconde = await charger()
    expect(await seconde.verifyToken(JETON)).toBe('u-42')
    expect(lecturesBase).toBe(1)
  })

  it('ne stocke jamais le jeton en clair', async () => {
    // Le point de securite. Un cache partage est lisible ailleurs.
    const m = await charger()
    await m.verifyToken(JETON)

    const tout = [...partage.keys(), ...partage.values().toString()].join('|')
    expect(tout).not.toContain(JETON)
    expect(tout).not.toContain(JETON.slice(4))
  })

  it('range bien quelque chose, sous une clef de hachage', async () => {
    // Garde-fou : sans lui, un cache qui n'ecrit rien passerait les
    // deux assertions precedentes.
    const m = await charger()
    await m.verifyToken(JETON)

    const clefs = [...partage.keys()]
    expect(clefs.some((k) => /^tok:[0-9a-f]{64}$/.test(k))).toBe(true)
  })
})
