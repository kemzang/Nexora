import { describe, expect, it } from 'vitest'

import { lireNoms } from './nomUtilisateur'

/**
 * Les noms arrivent sous quatre formes selon le chemin d'inscription.
 *
 * Notre formulaire range dans `first_name`/`last_name`. Google envoie
 * `given_name`/`family_name` et `full_name`. GitHub envoie `name` — ou
 * seulement un pseudo, car on peut masquer son nom reel. Le resultat
 * sans reconciliation : « ? » en initiales et « Bonjour,  » sans nom.
 */
describe('lireNoms', () => {
  it('prefere ce que notre propre formulaire a enregistre', () => {
    expect(
      lireNoms({ first_name: 'Bryan', last_name: 'Kemzang', full_name: 'Autre Chose' }),
    ).toEqual({ firstName: 'Bryan', lastName: 'Kemzang' })
  })

  it('utilise le decoupage de Google plutot que de couper soi-meme', () => {
    // Google sait ou s'arrete le prenom ; nous le devinons.
    expect(
      lireNoms({
        given_name: 'Bryan',
        family_name: 'Kemzang Teumena',
        full_name: 'Bryan Kemzang Teumena',
      }),
    ).toEqual({ firstName: 'Bryan', lastName: 'Kemzang Teumena' })
  })

  it('coupe un nom complet quand c est tout ce qu on a', () => {
    expect(lireNoms({ full_name: 'Bryan Kemzang' })).toEqual({
      firstName: 'Bryan',
      lastName: 'Kemzang',
    })
    expect(lireNoms({ name: 'Bryan Kemzang' })).toEqual({
      firstName: 'Bryan',
      lastName: 'Kemzang',
    })
  })

  it('garde un nom de famille en plusieurs mots entier', () => {
    // « Kemzang Teumena Stephane » ne doit pas perdre ses deux derniers
    // morceaux.
    expect(lireNoms({ name: 'Bryan Kemzang Teumena Stephane' })).toEqual({
      firstName: 'Bryan',
      lastName: 'Kemzang Teumena Stephane',
    })
  })

  it('accepte un prenom seul, sans inventer de nom', () => {
    expect(lireNoms({ name: 'Bryan' })).toEqual({ firstName: 'Bryan', lastName: null })
  })

  it('retombe sur le pseudo GitHub quand le nom est masque', () => {
    // Un compte GitHub peut n'avoir aucun nom public.
    expect(lireNoms({ user_name: 'kemzang' })).toEqual({
      firstName: 'kemzang',
      lastName: null,
    })
    expect(lireNoms({ preferred_username: 'kemzang' })).toEqual({
      firstName: 'kemzang',
      lastName: null,
    })
  })

  it('retombe enfin sur l adresse, plutot que sur rien', () => {
    /*
     * Ce n'est pas son prenom, et ce n'est pas grave : une initiale
     * juste vaut mieux qu'un point d'interrogation, et la personne peut
     * corriger dans ses parametres.
     */
    expect(lireNoms({}, 'kemzangbryan@gmail.com')).toEqual({
      firstName: 'Kemzangbryan',
      lastName: null,
    })
    expect(lireNoms({}, 'bryan.kemzang@gmail.com')).toEqual({
      firstName: 'Bryan kemzang',
      lastName: null,
    })
  })

  it('rend null plutot que de planter sur des entrees vides', () => {
    expect(lireNoms(null)).toEqual({ firstName: null, lastName: null })
    expect(lireNoms(undefined, '')).toEqual({ firstName: null, lastName: null })
    expect(lireNoms({ first_name: '   ', name: '   ' }, '')).toEqual({
      firstName: null,
      lastName: null,
    })
  })

  it('ignore les valeurs qui ne sont pas du texte', () => {
    // Les metadonnees viennent d'un fournisseur : on ne controle pas
    // leur forme.
    expect(lireNoms({ first_name: 42, name: ['Bryan'] } as never, 'a@b.com')).toEqual({
      firstName: 'A',
      lastName: null,
    })
  })

  it('un prenom seul chez nous n invente pas de nom de famille', () => {
    expect(lireNoms({ first_name: 'Bryan', last_name: '' })).toEqual({
      firstName: 'Bryan',
      lastName: null,
    })
  })
})
