import { describe, expect, it } from 'vitest'

import { retourApresFournisseur } from './oauthRetour'

/**
 * Le retour d'un fournisseur doit ramener la ou l'on etait.
 *
 * La premiere version renvoyait vers /dashboard. Quelqu'un parti de VS
 * Code revenait donc sur le tableau de bord, bien connecte, pendant que
 * l'editeur attendait un jeton qui n'arriverait jamais — et rien nulle
 * part ne signalait d'erreur, puisque la connexion avait reussi.
 *
 * C'est exactement le genre de detail qu'une « simplification » efface :
 * `${origin}/dashboard` se lit plus clairement que la page courante,
 * et casse tout.
 */
describe('retourApresFournisseur', () => {
  it('garde le callback et le state d une connexion depuis un editeur', () => {
    const depart =
      'https://nexoracoding.com/auth/login?callback=vscode&state=abc123'
    expect(retourApresFournisseur(depart)).toBe(depart)
  })

  it('garde aussi le parametre redirect', () => {
    const depart = 'https://nexoracoding.com/auth/login?redirect=%2Fpricing'
    expect(retourApresFournisseur(depart)).toBe(depart)
  })

  it('ramene sur la page d inscription quand on en vient', () => {
    // S'inscrire avec un fournisseur ne doit pas atterrir sur la page de
    // connexion : l'effet qui rend le jeton a l'editeur vit sur chaque
    // page, et le parcours doit rester celui qu'on a commence.
    const depart = 'https://nexoracoding.com/auth/register?callback=vscode'
    expect(retourApresFournisseur(depart)).toBe(depart)
  })

  it('retire le fragment laisse par une tentative precedente', () => {
    /*
     * Supabase depose access_token et refresh_token dans le fragment. Le
     * renvoyer au fournisseur ferait revenir avec deux jeux de jetons
     * dans l'URL, dont un perime.
     */
    expect(
      retourApresFournisseur(
        'https://nexoracoding.com/auth/login?callback=vscode#access_token=xyz&refresh_token=abc',
      ),
    ).toBe('https://nexoracoding.com/auth/login?callback=vscode')
  })

  it('fonctionne sans aucun parametre', () => {
    expect(retourApresFournisseur('https://nexoracoding.com/auth/login')).toBe(
      'https://nexoracoding.com/auth/login',
    )
  })

  it('ne renvoie jamais vers le tableau de bord de son propre chef', () => {
    // Le defaut d'origine, formule a l'envers.
    const depart = 'https://nexoracoding.com/auth/login?callback=vscode'
    expect(retourApresFournisseur(depart)).not.toContain('/dashboard')
  })
})
