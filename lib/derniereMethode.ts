/**
 * Par quoi cette personne s'est-elle connectee la derniere fois ?
 *
 * Quelqu'un qui s'est inscrit avec Google six mois plus tot ne s'en
 * souvient pas. Il essaie son mot de passe habituel, echoue, demande une
 * reinitialisation — et se retrouve avec deux facons d'entrer dans le
 * meme compte, ou pire, croit ne pas en avoir.
 *
 * Un simple rappel « Last used » supprime cette hesitation.
 *
 * C'est une COMMODITE, pas une donnee de compte : elle vit dans le
 * navigateur et nulle part ailleurs. Sur un autre appareil il n'y a rien
 * a afficher, et c'est normal. La mettre cote serveur reviendrait a
 * conserver, pour chaque personne, la trace de ses habitudes de
 * connexion — pour un gain de confort que localStorage donne deja.
 */
export type MethodeConnexion = 'password' | 'google' | 'github'

const CLEF = 'nxr-derniere-methode'

const VALIDES: readonly string[] = ['password', 'google', 'github']

/**
 * Retenir la methode employee.
 *
 * Pour un fournisseur, l'appel doit avoir lieu AVANT la redirection : la
 * page part, et rien ne s'executera au retour.
 */
export function noterMethode(methode: MethodeConnexion): void {
  try {
    window.localStorage.setItem(CLEF, methode)
  } catch {
    // Navigation privee, stockage refuse, quota plein : sans
    // consequence. Le rappel disparait, la connexion fonctionne.
  }
}

/** La derniere methode connue, ou `null` si on ne sait pas. */
export function lireMethode(): MethodeConnexion | null {
  try {
    const brut = window.localStorage.getItem(CLEF)
    // On verifie la valeur : le stockage est modifiable a la main, et
    // une valeur inventee ne doit pas faire apparaitre de pastille
    // ailleurs qu'a sa place.
    return VALIDES.includes(brut ?? '') ? (brut as MethodeConnexion) : null
  } catch {
    return null
  }
}
