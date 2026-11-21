import { waitUntil } from '@vercel/functions'

/**
 * Un travail qui ne doit pas retarder la reponse, mais qui doit aboutir.
 *
 * Le motif `void quelqueChose()` semble faire cela, et ne le fait pas :
 * Vercel gele la fonction des que la reponse part, et tue ce qui est
 * encore en vol. C'est ainsi qu'un ticket de support sur deux ne
 * prevenait personne — le defaut est invisible, puisque la reponse est un
 * succes et qu'aucune erreur n'est levee.
 *
 * `waitUntil` dit a la plateforme de garder la fonction vivante jusqu'a
 * ce que la promesse se termine, sans faire attendre l'appelant. C'est la
 * difference entre « je n'attends pas » et « j'abandonne ».
 *
 * A n'employer que pour ce qui est VRAIMENT accessoire a la reponse :
 * comptage d'usage, purge, mise en cache. Quand le resultat conditionne
 * ce qu'on repond, il faut l'attendre pour de bon.
 */
export function enArrierePlan(travail: PromiseLike<unknown>, etiquette: string): void {
  // Le filet est pose AVANT waitUntil : une promesse rejetee sans
  // gestionnaire fait tomber le processus sur certaines versions de Node.
  const protege = Promise.resolve(travail).then(
    () => undefined,
    (e: unknown) => {
      console.error(`[arriere-plan] ${etiquette}:`, e)
    },
  )

  try {
    waitUntil(protege)
  } catch {
    /*
     * Hors d'une requete Vercel — developpement local, tests — il n'y a
     * pas de contexte et `waitUntil` leve. Ce n'est pas grave : la ou il
     * n'y a pas de plateforme pour geler la fonction, le processus vit
     * assez longtemps pour que la promesse aboutisse seule.
     */
    void protege
  }
}
