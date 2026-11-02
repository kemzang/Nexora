import { describe, expect, it, vi } from 'vitest'

import {
  countSeatsInUse,
  getOrgRemainingCredits,
  getUserOrg,
  orgCreditLimit,
  type UserOrg,
} from './organizations'

/**
 * Ces fonctions parlent a la base. Elles n'avaient aucun test parce que la
 * table `organizations` est restee vide : le parcours equipe n'a jamais
 * tourne, ni en production ni ici. Un faux client suffit a verifier ce qui
 * compte — le decompte des sieges, le pot commun et son repli.
 */

/** Imite le chainage `.from().select().eq()...` de supabase-js. */
function fausseRequete(resultat: unknown) {
  const chaine: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'gt', 'lt', 'not']) {
    chaine[m] = vi.fn(() => chaine)
  }
  chaine.maybeSingle = vi.fn(async () => resultat)
  chaine.then = undefined
  return { chaine, resultat }
}

function clientAvecTables(parTable: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      const res = parTable[table]
      const chaine: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'gt']) {
        chaine[m] = vi.fn(() => chaine)
      }
      chaine.maybeSingle = vi.fn(async () => res)
      // Les comptages sont attendus (`await`) sans appel terminal.
      ;(chaine as { then?: unknown }).then = (r: (v: unknown) => unknown) =>
        Promise.resolve(res).then(r)
      return chaine
    }),
    rpc: vi.fn(),
  } as never
}

const orgDeBase: UserOrg = {
  orgId: 'org-1',
  name: 'Equipe',
  slug: 'equipe',
  role: 'member',
  seats: 3,
  creditsPerSeat: 40_000_000,
  status: 'active',
  contractEndsAt: null,
}

describe('sieges occupes', () => {
  it('compte les membres et les invitations encore valables', async () => {
    const db = clientAvecTables({
      organization_members: { count: 4 },
      organization_invites: { count: 2 },
    })
    expect(await countSeatsInUse(db, 'org-1')).toBe(6)
  })

  it('ne tombe pas quand une table ne renvoie aucun compte', async () => {
    // Un compte nul doit valoir zero, pas NaN : la soustraction qui suit
    // decide si un siege reste libre.
    const db = clientAvecTables({
      organization_members: { count: null },
      organization_invites: { count: null },
    })
    expect(await countSeatsInUse(db, 'org-1')).toBe(0)
  })
})

describe('pot commun', () => {
  it('soustrait la consommation du plafond vendu', async () => {
    const db = {
      rpc: vi.fn(async () => ({ data: 20_000_000, error: null })),
    } as never
    expect(await getOrgRemainingCredits(db, orgDeBase)).toBe(100_000_000)
  })

  it('ne descend jamais sous zero', async () => {
    // Une equipe qui a trop consomme doit lire zero, pas un nombre negatif
    // que l'appelant comparerait a tort a un cout.
    const db = {
      rpc: vi.fn(async () => ({ data: 999_000_000, error: null })),
    } as never
    expect(await getOrgRemainingCredits(db, orgDeBase)).toBe(0)
  })

  it('retombe sur le plafond vendu quand le calcul echoue', async () => {
    // Le commentaire du code l'exige : une panne ne doit ni couper une
    // equipe qui paie, ni ouvrir un robinet sans fin.
    const db = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'boom' } })),
    } as never
    const restant = await getOrgRemainingCredits(db, orgDeBase)
    expect(restant).toBe(orgCreditLimit(orgDeBase))
    expect(restant).not.toBe(Infinity)
  })
})

describe('organisation d un utilisateur', () => {
  function clientMembre(ligne: unknown) {
    const chaine: Record<string, unknown> = {}
    for (const m of ['select', 'eq']) chaine[m] = vi.fn(() => chaine)
    chaine.maybeSingle = vi.fn(async () => ({ data: ligne, error: null }))
    return { from: vi.fn(() => chaine) } as never
  }

  const ligne = (sup: Record<string, unknown> = {}) => ({
    role: 'admin',
    organizations: {
      id: 'org-1',
      name: 'Equipe',
      slug: 'equipe',
      seats: 3,
      credits_per_seat: 40_000_000,
      status: 'active',
      contract_ends_at: null,
      ...sup,
    },
  })

  it('rend l organisation et le role du membre', async () => {
    const org = await getUserOrg(clientMembre(ligne()), 'u1')
    expect(org?.orgId).toBe('org-1')
    expect(org?.role).toBe('admin')
    expect(org?.seats).toBe(3)
  })

  it('rend null quand l utilisateur n appartient a aucune equipe', async () => {
    expect(await getUserOrg(clientMembre(null), 'u1')).toBeNull()
  })

  it('rend null quand le contrat est echu', async () => {
    // Le membre existe toujours en base : c'est l echeance qui ferme l acces,
    // et elle doit le faire ici, pas plus loin dans la chaine d appel.
    const hier = new Date(Date.now() - 86_400_000).toISOString()
    expect(
      await getUserOrg(clientMembre(ligne({ contract_ends_at: hier })), 'u1'),
    ).toBeNull()
  })

  it('rend null quand l organisation est suspendue', async () => {
    expect(
      await getUserOrg(clientMembre(ligne({ status: 'suspended' })), 'u1'),
    ).toBeNull()
  })
})
