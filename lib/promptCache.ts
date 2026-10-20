/**
 * @file Mise en cache du prefixe de prompt chez les fournisseurs.
 *
 * Une boucle d'agent renvoie toute la conversation a chaque etape. Un
 * testeur a brule 72 % du quota gratuit sur UN seul prompt : sept appels,
 * un contexte de base de ~55 000 jetons repaye integralement a chacun.
 *
 * Les trois fournisseurs y repondent differemment :
 *
 *  - **Anthropic** demande des points de cache explicites (`cache_control`).
 *    C'est le seul qui ait quelque chose a construire ici, et c'est aussi le
 *    plus cher — donc le gros du gain.
 *  - **DeepSeek** met le contexte en cache tout seul, cote serveur. Rien a
 *    envoyer ; seul le decompte des jetons relus remonte, et il faut le
 *    demander (`stream_options.include_usage`) pour pouvoir le repercuter.
 *  - **Google** fait de la mise en cache implicite sur les modeles recents.
 *    Rien a envoyer non plus, a une condition : ne pas casser la stabilite du
 *    prefixe (meme `systemInstruction`, meme debut de `contents`).
 *
 * Mettre en cache ne suffit pas : il faut aussi que l'utilisateur en
 * beneficie. La remise est appliquee au decompte des credits dans
 * `computeCreditsConsumed` — sinon on paierait moins cher pour lui facturer
 * la meme chose.
 *
 * Note : la duree de vie des entrees reste celle par defaut (cinq minutes).
 * Anthropic propose `ttl: '1h'`, interessant pour une session de code ou les
 * tours sont espaces de plusieurs minutes — l'ecriture coute 2x au lieu de
 * 1,25x mais devient gagnante des trois relectures. A n'activer qu'apres
 * verification sur un vrai appel : un parametre refuse renvoie un 400, et un
 * 400 n'est pas reessaye ailleurs, donc toutes les requetes Claude
 * tomberaient d'un coup.
 */
import { cacheReadFactor, estimateTokens } from './models'

/**
 * En dessous de ce volume, marquer ne sert a rien : le minimum cacheable
 * depend du modele (de 512 a 4096 jetons) et un prefixe trop court est
 * ignore en silence. En dessous il n'y a de toute facon ni ecriture ni
 * surcout — le seuil evite surtout d'alourdir les petites requetes.
 */
export const MIN_CACHEABLE_CHARS = 8000

/** Approximation deja utilisee par estimateTokens(). */
const CHARS_PER_TOKEN = 4

/**
 * Pose un point de cache sur le dernier bloc d'un message Anthropic.
 *
 * `cache_control` se met sur un bloc de contenu, pas sur le message : un
 * contenu encore sous forme de chaine est donc promu en tableau. Un message
 * vide est laisse tel quel — Anthropic refuse un tableau de contenu vide.
 */
export function markCachePoint(msg: any): void {
  if (!msg) return
  if (typeof msg.content === 'string') {
    if (!msg.content) return
    msg.content = [{ type: 'text', text: msg.content }]
  }
  if (!Array.isArray(msg.content) || msg.content.length === 0) return
  const i = msg.content.length - 1
  const last = msg.content[i]
  if (!last || typeof last !== 'object') return
  // Copie au lieu de muter : un bloc image deja au format Anthropic traverse
  // la traduction par reference, donc il est partage avec le corps de requete
  // d'origine. Y ecrire `cache_control` le ferait fuir dans la tentative
  // suivante si le fournisseur bascule vers Gemini.
  msg.content[i] = { ...last, cache_control: { type: 'ephemeral' } }
}

/**
 * Place les points de cache d'une requete Anthropic et renvoie le champ
 * `system` a envoyer. **Modifie `msgs` sur place.**
 *
 * Le cache est une correspondance de prefixe : l'ordre de rendu est
 * `tools` -> `system` -> `messages`, et un seul octet qui change invalide
 * tout ce qui suit. On pose donc au plus trois points (la limite est de
 * quatre) sur les frontieres stables :
 *
 *  1. fin du prompt systeme — couvre d'un coup les outils et le systeme, qui
 *     ne bougent pas d'un tour a l'autre ;
 *  2. l'avant-dernier tour — c'est lui que la requete suivante relira ;
 *  3. le dernier message — ecrit l'entree que le tour suivant relira.
 *
 * Le point (2) n'est pas redondant : la recherche d'une entree de cache ne
 * remonte que de vingt blocs de contenu. Un tour d'agent qui ajoute beaucoup
 * de blocs d'un coup (appels d'outils en parallele) pousse le point du tour
 * precedent hors de portee, et le prefixe repasse au plein tarif. Un point
 * intermediaire garde une prise.
 */
export function applyAnthropicCache(system: string, msgs: any[]): string | any[] {
  const cacheable =
    system.length + JSON.stringify(msgs).length >= MIN_CACHEABLE_CHARS

  if (!cacheable) return system

  if (msgs.length >= 4) markCachePoint(msgs[msgs.length - 3])
  if (msgs.length >= 1) markCachePoint(msgs[msgs.length - 1])

  if (!system) return system
  return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
}

/**
 * Estimation des jetons d'entree *facturables*, remise de cache attendue
 * deduite.
 *
 * Le controle de solde fait avant l'appel ne peut pas connaitre le taux de
 * relecture reel — il n'a pas encore appele le fournisseur. Mais il doit
 * estimer la meme chose que la facturation, sinon il se trompe dans le sens
 * qui penalise : avec un prefixe de 55 000 jetons deja en cache, une requete
 * facturee ~6 000 credits etait evaluee a 55 000. Resultat, l'utilisateur se
 * voyait basculer sur un modele moins cher et sa reponse tronquee alors qu'il
 * avait largement de quoi payer.
 *
 * Le pari n'est pris que lorsqu'il est raisonnable : une conversation d'au
 * moins trois messages (donc deja un aller-retour) dont le prefixe est assez
 * gros pour etre cacheable. Au premier appel d'une conversation on compte
 * plein tarif, comme avant.
 *
 * S'il se revele faux, on a sous-estime d'un prefixe : la requete passe un
 * peu au-dela du solde, et le decompte reel — lui, exact — rattrape l'ecart
 * au tour suivant. Le refus a zero credit, lui, n'est pas touche.
 */
export function expectedBillableInput(modelId: string, messages: any[]): number {
  const total = estimateTokens(messages)
  if (messages.length < 3) return total

  const prefix = estimateTokens(messages.slice(0, -1))
  if (prefix * CHARS_PER_TOKEN < MIN_CACHEABLE_CHARS) return total

  const fresh = Math.max(0, total - prefix)
  return Math.ceil(fresh + prefix * cacheReadFactor(modelId))
}
