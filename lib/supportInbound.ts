/**
 * Rattacher un courriel entrant au ticket dont il est la suite.
 *
 * Tout repose sur une adresse par ticket. Quand nous repondons a NX-7F3K2,
 * le `Reply-To` du message est `nx-7f3k2@reply.nexoracoding.com` : la
 * reference voyage dans l'enveloppe, la ou le client ne peut pas l'effacer
 * par accident. Le sujet, lui, se fait reecrire — « Re: Re: Fwd: » et les
 * clients qui traduisent ou tronquent — c'est pourquoi il n'est qu'un
 * recours.
 *
 * Ces fonctions sont pures : elles ne touchent ni au reseau ni a la base,
 * precisement pour qu'on puisse les eprouver sur des cas tordus sans
 * simuler Resend.
 */

/**
 * Le domaine qui recoit les reponses.
 *
 * nexoracoding.com porte deja les MX de la redirection Porkbun qui amene
 * support@ dans une boite. Poser ceux de Resend a cote les ferait
 * concourir — Resend l'ecrit : sans la priorite la plus basse, la remise
 * devient imprevisible. D'ou un sous-domaine dedie, qui ne perturbe rien.
 *
 * Vide tant que le MX n'est pas pose : l'adresse par ticket n'est alors pas
 * utilisee, et l'on continue de repondre avec support@ en `Reply-To`. Le
 * code peut donc partir en production avant la configuration DNS.
 */
export const REPLY_DOMAIN = (process.env.SUPPORT_REPLY_DOMAIN || '').trim().toLowerCase()

/** Une reference telle que generateReference la produit : NX + 5 caracteres. */
const REFERENCE = /NX-[A-HJ-NP-Z2-9]{5}/i

/**
 * L'adresse a mettre en `Reply-To` pour un ticket donne.
 *
 * `null` tant que le domaine de reception n'est pas configure : l'appelant
 * retombe alors sur la boite generique plutot que d'envoyer les clients
 * vers un domaine qui ne recoit rien.
 */
export function adresseDeReponse(reference: string): string | null {
  if (!REPLY_DOMAIN) return null
  if (!REFERENCE.test(reference)) return null
  return `${reference.toLowerCase()}@${REPLY_DOMAIN}`
}

/** La partie locale d'une adresse, sans nom d'affichage ni chevrons. */
function partieLocale(adresse: string): string {
  const brut = adresse.includes('<')
    ? adresse.slice(adresse.lastIndexOf('<') + 1, adresse.lastIndexOf('>'))
    : adresse
  const arobase = brut.lastIndexOf('@')
  return (arobase === -1 ? brut : brut.slice(0, arobase)).trim()
}

/**
 * La reference portee par les destinataires.
 *
 * On regarde `to`, `cc` et `bcc` : un client qui met la conversation en
 * copie, ou un systeme qui redirige, peut deplacer notre adresse hors du
 * champ `to`.
 */
export function referenceDepuisDestinataires(
  listes: (string[] | null | undefined)[],
): string | null {
  for (const liste of listes) {
    for (const adresse of liste ?? []) {
      // Certains relais ajoutent un suffixe : nx-7f3k2+suivi@…
      const locale = partieLocale(String(adresse)).split('+')[0]
      if (REFERENCE.test(locale) && locale.length === 8) {
        return locale.toUpperCase()
      }
    }
  }
  return null
}

/** La reference citee dans le sujet, en dernier recours. */
export function referenceDepuisSujet(sujet: string | null | undefined): string | null {
  const trouve = String(sujet ?? '').match(REFERENCE)
  return trouve ? trouve[0].toUpperCase() : null
}

export function extraireReference(courriel: {
  to?: string[] | null
  cc?: string[] | null
  bcc?: string[] | null
  subject?: string | null
}): string | null {
  return (
    referenceDepuisDestinataires([courriel.to, courriel.cc, courriel.bcc]) ??
    referenceDepuisSujet(courriel.subject)
  )
}

/**
 * Les marqueurs qui ouvrent la citation du message precedent.
 *
 * Sans cette coupe, chaque reponse rapporte tout l'echange : au troisieme
 * aller-retour, le panneau devient illisible et le vrai message est enfoui
 * sous vingt lignes deja lues.
 */
const DEBUTS_DE_CITATION = [
  /^\s*-{2,}\s*(original message|message d'origine|forwarded message)\s*-{2,}/i,
  /^\s*(on|le)\b.{0,200}\b(wrote|a écrit|a ecrit)\s*:\s*$/i,
  /^\s*_{10,}\s*$/,
  /^\s*De\s*:\s.+$/,
  /^\s*From\s*:\s.+$/,
]

/**
 * Le texte utile d'une reponse, sans l'echange recopie dessous.
 *
 * Conservateur par construction : si la coupe ne laissait rien, on rend le
 * texte entier. Mieux vaut un message verbeux qu'un message vide — un
 * support qui affiche une reponse blanche fait croire que le client n'a
 * rien dit.
 */
export function nettoyerCitation(texte: string): string {
  const lignes = texte.replace(/\r\n/g, '\n').split('\n')
  const gardees: string[] = []

  for (const ligne of lignes) {
    if (DEBUTS_DE_CITATION.some((motif) => motif.test(ligne))) break
    gardees.push(ligne)
  }

  // Les lignes « > … » en fin de bloc appartiennent encore a la citation.
  while (gardees.length > 0 && /^\s*(>|$)/.test(gardees[gardees.length - 1])) {
    gardees.pop()
  }

  const propre = gardees.join('\n').trim()
  return propre.length > 0 ? propre : texte.trim()
}

/** Un HTML de courriel ramene a du texte lisible. */
export function htmlVersTexte(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Limite de ce qu'on enregistre en clair : au-dela, on tronque en le disant. */
export const MAX_CORPS_ENTRANT = 50000

/**
 * Le corps exploitable d'un courriel recu.
 *
 * `text` d'abord : c'est ce que l'expediteur a reellement tape. On ne
 * retombe sur le HTML que lorsqu'il n'y a pas d'alternative texte, ce qui
 * arrive avec certains clients.
 */
export function corpsDuCourriel(courriel: {
  text?: string | null
  html?: string | null
}): { propre: string; brut: string } {
  const brutComplet = (courriel.text?.trim() || '') || htmlVersTexte(courriel.html || '')
  const brut = brutComplet.slice(0, MAX_CORPS_ENTRANT)
  return { propre: nettoyerCitation(brut).slice(0, MAX_CORPS_ENTRANT), brut }
}
