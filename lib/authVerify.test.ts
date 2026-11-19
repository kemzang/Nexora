import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Une adresse confirmee, ou rien.
 *
 * Deux comptes ont ete crees le 19 novembre depuis un domaine de boites
 * jetables — adresses generees au hasard, courrier redirige vers un service
 * temporaire. Sans cette verification, fabriquer un compte ne coute rien :
 * une adresse inventee suffit a consommer des jetons modeles, qui nous sont
 * factures.
 *
 * Ces tests fixent les trois proprietes qui comptent : on bloque sans
 * confirmation, on laisse passer avec, et l'interrupteur de secours
 * fonctionne — car des comptes anterieurs pourraient n'avoir jamais
 * confirme, et les bloquer du jour au lendemain serait pire que le mal.
 */

const panne = { actif: false }

const utilisateur = {
  id: 'u1',
  email: 'bryan@example.com',
  email_confirmed_at: null as string | null,
  confirmed_at: null as string | null,
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: utilisateur }, error: null }),
      admin: {
        getUserById: async () => {
          if (panne.actif) throw new Error('supabase injoignable')
          return { data: { user: utilisateur }, error: null }
        },
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: { user_id: 'u1', expires_at: null, is_active: true },
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}))

async function verifier(token: string) {
  // Import a chaud : le module lit REQUIRE_CONFIRMED_EMAIL au chargement de
  // ses caches, et garde un cache par jeton — un module frais par cas.
  vi.resetModules()
  const { verifyToken } = await import('./auth-verify')
  return verifyToken(token)
}

beforeEach(() => {
  utilisateur.email_confirmed_at = null
  utilisateur.confirmed_at = null
  delete process.env.REQUIRE_CONFIRMED_EMAIL
  panne.actif = false
})

describe('adresse confirmee', () => {
  it('refuse une session dont l adresse n est pas confirmee', async () => {
    expect(await verifier('jeton-supabase-1')).toBeNull()
  })

  it('accepte une fois l adresse confirmee', async () => {
    utilisateur.email_confirmed_at = '2026-11-19T06:00:00Z'
    expect(await verifier('jeton-supabase-2')).toBe('u1')
  })

  it('accepte une confirmation venue d un fournisseur externe', async () => {
    // Connexion GitHub : `email_confirmed_at` peut rester vide alors que le
    // compte est bel et bien confirme. S'en tenir au premier champ
    // bloquerait ces utilisateurs-la.
    utilisateur.confirmed_at = '2026-11-19T06:00:00Z'
    expect(await verifier('jeton-supabase-3')).toBe('u1')
  })

  it('refuse une clef nxr_ dont le compte n est pas confirme', async () => {
    // Une clef survit a son porteur : on verifie le compte, pas la clef.
    expect(await verifier('nxr_abcdef0123456789')).toBeNull()
  })

  it('laisse passer quand la verification elle-meme tombe en panne', async () => {
    /*
     * Traiter « Supabase n'a pas repondu » comme « non confirme » bloquerait
     * l'utilisateur sur une coupure d'une seconde — et, le resultat etant
     * mis en cache, pendant dix minutes. Le risque inverse est sans commune
     * mesure : cette verification ne protege pas l'acces, le jeton a deja
     * ete valide.
     */
    panne.actif = true
    expect(await verifier('nxr_abcdef0123456789')).toBe('u1')
  })

  it('laisse tout passer quand l interrupteur est baisse', async () => {
    // Filet de secours si des comptes anterieurs n ont jamais confirme.
    process.env.REQUIRE_CONFIRMED_EMAIL = 'false'
    expect(await verifier('jeton-supabase-4')).toBe('u1')
  })
})
