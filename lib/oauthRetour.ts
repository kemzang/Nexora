/**
 * Ou le fournisseur doit nous ramener.
 *
 * Sur la page courante, parametres compris. Ce detail porte toute la
 * connexion depuis un editeur : /auth/login?callback=…&state=… contient
 * de quoi rendre son jeton a VS Code, et l'effet deja en place sur cette
 * page s'en charge des que la session apparait.
 *
 * La premiere version renvoyait vers /dashboard. Un utilisateur parti de
 * VS Code revenait donc sur le tableau de bord, bien connecte, pendant
 * que l'editeur attendait un jeton qui n'arriverait jamais — sans erreur
 * nulle part, puisque la connexion avait reussi.
 */
export function retourApresFournisseur(href: string): string {
  const ici = new URL(href)

  /*
   * Le fragment porte les restes d'une tentative precedente : Supabase y
   * depose access_token et refresh_token. Le garder ferait revenir avec
   * deux jeux de jetons dans l'URL, dont un perime.
   */
  ici.hash = ''

  return ici.toString()
}
