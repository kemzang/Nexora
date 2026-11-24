import { beforeEach, describe, expect, it, vi } from 'vitest'

// `auth-verify` construit son client Supabase au chargement du module : sans
// ce doublon, l'import echoue avec « supabaseUrl is required ». Meme motif
// que machineAccounts.test.ts.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({}) }),
}))

const { prolongerSiProche, RENOUVELER_SOUS_JOURS } = await import(
  './auth-verify'
)

/**
 * Une clef qui SERT ne doit jamais expirer sous les pieds de son porteur.
 *
 * Les clefs `nxr_` vivent 90 jours. Bonne regle pour une clef oubliee dans
 * un script, mauvaise pour celle que l'editeur de quelqu'un utilise toutes
 * les trente secondes : au 91e jour son autocompletion s'arrete, son chat
 * s'arrete, et rien ne lui dit pourquoi. Il n'a rien fait de mal, et on lui
 * demande d'aller se reconnecter.
 *
 * L'echeance glisse donc tant que la clef sert. Une clef abandonnee expire
 * comme avant ; une clef revoquee reste refusee, car `is_active` est
 * verifie a chaque appel et ne glisse pas.
 */
function base() {
  const appels: Array<Record<string, unknown>> = []
  const filtres: Array<[string, unknown]> = []
  const chaine: any = {
    update: (valeurs: Record<string, unknown>) => {
      appels.push(valeurs)
      return chaine
    },
    eq: (colonne: string, valeur: unknown) => {
      filtres.push([colonne, valeur])
      return chaine
    },
    then: (r: (v: unknown) => unknown) => Promise.resolve(null).then(r),
  }
  return { db: { from: () => chaine }, appels, filtres }
}

const jours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

describe('echeance glissante des clefs nxr_', () => {
  beforeEach(() => vi.clearAllMocks())

  it('repousse une clef proche de son terme', async () => {
    const { db, appels } = base()
    expect(await prolongerSiProche('h', jours(5), db)).toBe(true)
    expect(appels).toHaveLength(1)
    // La nouvelle echeance doit etre franchement plus loin que l'ancienne.
    const nouvelle = new Date(appels[0].expires_at as string).getTime()
    expect(nouvelle).toBeGreaterThan(Date.now() + 60 * 86_400_000)
  })

  it('ne touche pas a une clef encore loin du terme', async () => {
    // Sinon on ecrirait en base a chaque appel d'autocompletion.
    const { db, appels } = base()
    expect(
      await prolongerSiProche('h', jours(RENOUVELER_SOUS_JOURS + 10), db),
    ).toBe(false)
    expect(appels).toHaveLength(0)
  })

  it('ne prolonge jamais une clef revoquee', async () => {
    // Le garde-fou qui compte : la revocation doit rester immediate.
    const { db, filtres } = base()
    await prolongerSiProche('h', jours(1), db)
    expect(filtres).toContainEqual(['is_active', true])
    expect(filtres).toContainEqual(['key_hash', 'h'])
  })

  it('ne fait rien sans echeance connue', async () => {
    const { db, appels } = base()
    expect(await prolongerSiProche('h', null, db)).toBe(false)
    expect(appels).toHaveLength(0)
  })

  it('une panne de base ne casse pas l authentification', async () => {
    // L'appel est detache : son echec doit rester sans consequence.
    const db = {
      from: () => {
        throw new Error('base indisponible')
      },
    }
    expect(await prolongerSiProche('h', jours(1), db)).toBe(false)
  })
})
