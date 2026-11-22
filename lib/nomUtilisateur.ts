/**
 * Le prenom et le nom, quel que soit le chemin d'inscription.
 *
 * Le formulaire demande les deux et les range dans `first_name` et
 * `last_name`. Un fournisseur ne connait pas ces noms-la : Google envoie
 * `given_name`/`family_name` et `full_name`, GitHub envoie `name` — ou
 * rien du tout, car on peut masquer son nom et n'avoir qu'un pseudo.
 *
 * Sans cette reconciliation, un compte cree par Google affichait « ? »
 * comme initiales et « Bonjour,  » sans nom. Rien de casse, mais
 * l'impression immediate d'un produit qui ne vous reconnait pas.
 */
export interface NomsLus {
  firstName: string | null
  lastName: string | null
}

/** Coupe « Bryan Kemzang » en prenom et nom. Un seul mot : pas de nom. */
function couper(complet: string): NomsLus {
  const morceaux = complet.trim().split(/\s+/).filter(Boolean)
  if (morceaux.length === 0) return { firstName: null, lastName: null }
  if (morceaux.length === 1) return { firstName: morceaux[0], lastName: null }
  return {
    firstName: morceaux[0],
    // Tout le reste : « Kemzang Teumena » doit rester entier.
    lastName: morceaux.slice(1).join(' '),
  }
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : ''
}

/**
 * La derniere chance : la partie locale de l'adresse.
 *
 * « kemzangbryan@gmail.com » donne « Kemzangbryan ». Ce n'est pas son
 * prenom, mais une initiale juste vaut mieux qu'un point d'interrogation,
 * et la personne peut corriger dans ses parametres.
 */
function depuisAdresse(email: string): string | null {
  const locale = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
  if (!locale) return null
  return locale.charAt(0).toUpperCase() + locale.slice(1)
}

export function lireNoms(
  metadata: Record<string, unknown> | null | undefined,
  email?: string | null,
): NomsLus {
  const m = metadata ?? {}

  // 1. Ce que notre propre formulaire a enregistre.
  const prenom = texte(m.first_name)
  const nom = texte(m.last_name)
  if (prenom || nom) {
    return { firstName: prenom || null, lastName: nom || null }
  }

  // 2. Google decoupe deja pour nous : c'est plus sur que de couper
  //    nous-memes un nom complet.
  const donne = texte(m.given_name)
  const famille = texte(m.family_name)
  if (donne || famille) {
    return { firstName: donne || null, lastName: famille || null }
  }

  // 3. Un nom complet, a couper. GitHub remplit `name`, Google
  //    `full_name` ; les deux peuvent etre vides.
  const complet = texte(m.full_name) || texte(m.name)
  if (complet) return couper(complet)

  // 4. Le pseudo GitHub, quand le nom reel est masque.
  const pseudo = texte(m.user_name) || texte(m.preferred_username)
  if (pseudo) return { firstName: pseudo, lastName: null }

  // 5. L'adresse, plutot que rien.
  return { firstName: depuisAdresse(texte(email)), lastName: null }
}
