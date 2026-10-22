import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const brut = readFileSync(join(process.cwd(), 'hooks/use-auth.tsx'), 'utf8')

/**
 * Les commentaires sont retires avant toute recherche : ils citent souvent
 * le code qu'ils expliquent — « setLoading(true) a ete retire » contient
 * litteralement ce qu'on veut interdire — et un test qui lit le texte brut
 * echoue alors sur sa propre documentation.
 */
const src = brut
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n')

/**
 * Les jetons Supabase expirent au bout d'une heure et sont renouvelés en
 * arrière-plan. Un écouteur qui ne traite que la connexion et la déconnexion
 * garde l'ancien jeton : toute section qui s'en sert pour appeler notre API
 * reçoit un 401 après une heure d'onglet ouvert — factures, abonnement,
 * historique. Le délai rendait le défaut difficile à reproduire.
 */
describe('contexte d authentification', () => {
  it('suit le renouvellement du jeton, pas seulement la connexion', () => {
    const ecouteur = src.slice(src.indexOf('onAuthStateChange'))
    // Une branche doit rafraichir le jeton hors SIGNED_IN / SIGNED_OUT.
    expect(ecouteur).toMatch(/else if \(session\?\.access_token\)/)
  })

  it('efface le jeton a la deconnexion', () => {
    expect(src).toContain("event === 'SIGNED_OUT'")
    expect(src).toMatch(/setToken\(null\)/)
  })

  it('ne fait pas attendre la deconnexion sur le reseau', () => {
    // L'etat local doit etre vide AVANT l'appel de revocation, sinon un appel
    // qui ne rend pas la main laisse l'ecran fige sur son rond de chargement.
    const bloc = src.slice(src.indexOf('const signOut'))
    const avantAppel = bloc.slice(0, bloc.indexOf('AuthService.signOut'))
    expect(avantAppel).toContain('setUser(null)')
    expect(avantAppel).toContain('setToken(null)')
    // Et il ne doit pas basculer l'interface en chargement pour partir.
    expect(avantAppel).not.toContain('setLoading(true)')
  })
})
