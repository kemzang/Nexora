/**
 * @file Validation d'adresse e-mail, en un seul endroit.
 *
 * `z.string().email()` fait deja l'essentiel : il refuse `a@b`,
 * `bryan@gmail`, `bryan@.com`, le double `@`. Ce qu'il ne fait pas, c'est
 * pardonner ce que les gens tapent vraiment.
 */
import { z } from 'zod'

/**
 * Normalise avant de valider.
 *
 * Deux cas qui se produisent tout le temps et n'ont rien d'une faute :
 *
 * Un copier-coller depuis un courriel ou un gestionnaire de mots de passe
 * embarque souvent une espace de part et d'autre. Sans nettoyage, l'adresse
 * est declaree invalide alors qu'elle est parfaitement correcte — et
 * l'utilisateur relit son adresse dix fois sans voir ce qui cloche.
 *
 * Les claviers de telephone mettent une majuscule a la premiere lettre.
 * `Bryan@gmail.com` et `bryan@gmail.com` sont la meme boite, mais stockees
 * telles quelles elles deviennent deux comptes : la personne s'inscrit, puis
 * ne se reconnecte plus parce qu'elle a tape son adresse autrement.
 *
 * Seul le domaine est insensible a la casse selon la norme ; en pratique
 * aucun fournisseur grand public ne distingue la partie locale, et les
 * traiter comme distinctes cree bien plus de comptes perdus que de conflits
 * evites.
 */
export function emailSchema(message = 'Enter a valid email address') {
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email(message)
}

/** Meme normalisation, hors formulaire (API, scripts). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}
