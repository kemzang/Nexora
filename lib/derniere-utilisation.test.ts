import { describe, expect, it, vi } from 'vitest'

// `auth-verify` construit son client Supabase au chargement du module : sans
// ce doublon, l'import echoue avec « supabaseUrl is required ». Meme motif
// que cle-glissante.test.ts.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({}) }),
}))

const { marquerUtilisation } = await import('./auth-verify')

/**
 * Le tableau de bord AFFICHE « derniere utilisation » pour chaque clef.
 *
 * Rien ne l'ecrivait : `last_used_at` gardait sa valeur de creation, donc la
 * colonne affichait la date de creation pour toutes les clefs, indefiniment.
 * Un utilisateur ne pouvait pas distinguer la clef que son editeur emploie
 * toutes les trente secondes de celle qu'il a oubliee dans un script l'an
 * dernier — exactement la question a laquelle cette colonne doit repondre.
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

describe('derniere utilisation', () => {
  it('horodate la clef employee', async () => {
    const { db, appels } = base()
    const avant = Date.now()
    await marquerUtilisation('empreinte-abc', db)

    expect(appels).toHaveLength(1)
    const ecrit = Date.parse(appels[0].last_used_at as string)
    expect(ecrit).toBeGreaterThanOrEqual(avant)
    expect(ecrit).toBeLessThanOrEqual(Date.now())
  })

  it("vise la bonne clef, et seulement si elle est active", async () => {
    const { db, filtres } = base()
    await marquerUtilisation('empreinte-abc', db)

    // Une clef revoquee ne doit pas etre horodatee : elle n'a rien servi.
    expect(filtres).toContainEqual(['key_hash', 'empreinte-abc'])
    expect(filtres).toContainEqual(['is_active', true])
  })

  it("n'ecrit que last_used_at", async () => {
    const { db, appels } = base()
    await marquerUtilisation('empreinte-abc', db)

    // Elargir ce patch ferait ecraser des colonnes depuis le chemin chaud de
    // l'autocompletion, ou l'ecriture est detachee et son echec silencieux.
    expect(Object.keys(appels[0])).toEqual(['last_used_at'])
  })

  it('reste silencieuse si la base refuse', async () => {
    const db = {
      from: () => {
        throw new Error('base indisponible')
      },
    }
    // L'appel est detache (`void`) sur le chemin chaud : une exception qui
    // remonte deviendrait un rejet non capture, pas une reponse d'erreur.
    await expect(marquerUtilisation('empreinte-abc', db)).resolves.toBeUndefined()
  })
})
