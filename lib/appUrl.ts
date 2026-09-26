/**
 * Adresse publique du site, source unique.
 *
 * Cinq fichiers reprenaient `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`.
 * Ce repli n'est pas neutre : quand la variable n'est pas definie sur
 * l'hebergeur — ce qui etait le cas — l'adresse locale part reellement chez
 * l'utilisateur. Un lien de reinitialisation de mot de passe menait a « site
 * inaccessible », et le retour de paiement pointait vers une machine qui
 * n'existe pas pour l'acheteur.
 *
 * Le repli est donc l'adresse de production. Une erreur de configuration
 * dégrade alors vers quelque chose de juste, au lieu de casser silencieusement.
 *
 * À changer ici lors du passage au domaine definitif — comme
 * `DEFAULT_SITE_URL` cote extensions (core/nexora/urls.ts et NexoraUrls.kt).
 */
const PRODUCTION_URL = 'https://nexoracoding.com'

/**
 * Adresse du site, sans barre oblique finale.
 *
 * Deux noms de variable coexistaient dans le code — NEXT_PUBLIC_APP_URL et
 * NEXT_PUBLIC_SITE_URL — selon les fichiers. Les deux sont acceptes ici pour
 * qu'aucune configuration existante ne se retrouve ignoree au passage a cette
 * source unique.
 */
export const APP_URL: string = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  PRODUCTION_URL
).replace(/\/+$/, '')

/**
 * Adresse a utiliser dans une route d'API.
 *
 * L'origine de la requete est preferee quand elle est disponible : elle est
 * toujours juste, y compris sur une preview Vercel ou un domaine fraichement
 * branche, sans dependre d'une variable d'environnement.
 */
export function appUrlFromRequest(req: {
  headers: { get(name: string): string | null }
  nextUrl?: { origin: string }
}): string {
  if (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL) {
    return APP_URL
  }
  const origin = req.headers.get('origin') ?? req.nextUrl?.origin
  return (origin ?? PRODUCTION_URL).replace(/\/+$/, '')
}
