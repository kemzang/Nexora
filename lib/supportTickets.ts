/**
 * Les types de demande, et la validation d'un ticket.
 *
 * Le choix du type se fait sur un ecran de cartes, comme les modeles
 * d'issue de GitHub : on voit tout d'un coup d'oeil, et chaque type demande
 * ce qu'il faut pour CE probleme — pas un formulaire unique ou l'on redemande
 * tout a tout le monde.
 *
 * `other` est indispensable : sans elle, celui dont le besoin n'entre dans
 * aucune case choisit au hasard, et les tickets arrivent mal classes.
 */

/**
 * Delai de reponse annonce. Tenable, donc tenu.
 *
 * Il vit ICI et non dans supportEmails : ce module-la construit un client
 * Resend des son chargement. Importe depuis un composant client, il
 * s'executait dans le navigateur sans clef d'API et faisait tomber toute la
 * page — le serveur rendait le titre, et plus rien en dessous.
 */
export const SUPPORT_SLA = 'within 2 business days'

export type SupportCategoryId =
  | 'billing'
  | 'bug'
  | 'model'
  | 'account'
  | 'feature'
  | 'other'

export interface SupportField {
  /** Clef stockee dans `context`. */
  name: string
  label: string
  /** `select` rend une liste, `textarea` un pave, le reste une ligne. */
  type: 'text' | 'textarea' | 'select'
  required: boolean
  options?: string[]
  placeholder?: string
  /** Rempli tout seul quand l'utilisateur est connecte. */
  autofill?: 'client' | 'version' | 'os' | 'plan'
}

export interface SupportCategory {
  id: SupportCategoryId
  title: string
  description: string
  /** Affiche le diagnostic d'abonnement avant le formulaire. */
  showsPaymentCheck?: boolean
  fields: SupportField[]
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'billing',
    title: 'Billing & subscription',
    description:
      'You paid but nothing was activated, an unexpected charge, a refund, or cancelling your plan.',
    // Le cas le plus frequent se resout sans nous : on relit l'abonnement
    // chez Paddle avant de proposer d'ecrire.
    showsPaymentCheck: true,
    fields: [
      {
        name: 'payment_date',
        label: 'Date of the payment',
        type: 'text',
        required: false,
        placeholder: 'e.g. 16 November 2026',
      },
      {
        name: 'paddle_reference',
        label: 'Paddle receipt or transaction reference',
        type: 'text',
        required: false,
        placeholder: 'From the email Paddle sent you',
      },
      {
        name: 'message',
        label: 'What happened?',
        type: 'textarea',
        required: true,
        placeholder: 'What you expected, and what you got instead.',
      },
    ],
  },
  {
    id: 'bug',
    title: 'Bug in the extension or CLI',
    description:
      'Something crashes, does nothing, or behaves differently from what you expected.',
    fields: [
      {
        name: 'client',
        label: 'Where does it happen?',
        type: 'select',
        required: true,
        options: ['VS Code', 'Cursor / Windsurf / VSCodium', 'JetBrains', 'CLI'],
        autofill: 'client',
      },
      {
        name: 'version',
        label: 'Version',
        type: 'text',
        required: false,
        placeholder: 'e.g. 2.1.2',
        autofill: 'version',
      },
      {
        name: 'os',
        label: 'Operating system',
        type: 'text',
        required: false,
        placeholder: 'e.g. Windows 11, macOS 15, Ubuntu 24.04',
        autofill: 'os',
      },
      {
        name: 'steps',
        label: 'What did you do, step by step?',
        type: 'textarea',
        required: false,
        placeholder: '1. Opened a file\n2. Typed…\n3. Clicked…',
      },
      {
        name: 'message',
        label: 'What happened, and what did you expect?',
        type: 'textarea',
        required: true,
      },
    ],
  },
  {
    id: 'model',
    title: 'Model or response issue',
    description:
      'The model answers poorly, stops halfway, ignores your code, or picks the wrong tool.',
    fields: [
      {
        name: 'model',
        label: 'Which model?',
        type: 'text',
        required: false,
        placeholder: 'e.g. Claude Sonnet, Gemini Flash',
      },
      {
        name: 'mode',
        label: 'Which mode?',
        type: 'select',
        required: false,
        options: ['Chat', 'Agent', 'Plan', 'Autocomplete'],
      },
      {
        name: 'message',
        label: 'What did the model do?',
        type: 'textarea',
        required: true,
        placeholder: 'What you asked, and what came back.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & access',
    description:
      'You cannot sign in, you need to change your email address, or you want your account deleted.',
    fields: [
      {
        name: 'account_email',
        label: 'Email address of the account concerned',
        type: 'text',
        required: true,
        placeholder: 'If it differs from the one you are writing from',
      },
      {
        name: 'message',
        label: 'What is blocking you?',
        type: 'textarea',
        required: true,
      },
    ],
  },
  {
    id: 'feature',
    title: 'Feature request',
    description: 'Something is missing, or could work better.',
    fields: [
      {
        name: 'message',
        label: 'What would you like?',
        type: 'textarea',
        required: true,
        placeholder: 'What you want, why, and how you work around it today.',
      },
    ],
  },
  {
    id: 'other',
    title: 'Something else',
    description: 'Anything that does not fit the categories above.',
    fields: [
      {
        name: 'message',
        label: 'How can we help?',
        type: 'textarea',
        required: true,
      },
    ],
  },
]

export function categoryById(id: string): SupportCategory | undefined {
  return SUPPORT_CATEGORIES.find((c) => c.id === id)
}

/**
 * Reference lisible a voix haute.
 *
 * L'utilisateur la citera en nous reecrivant, parfois par telephone. Un UUID
 * serait illisible ; l'alphabet exclut donc I, O, 0 et 1, qu'on confond en
 * lisant comme en dictant.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateReference(
  random: () => number = Math.random,
): string {
  let suffixe = ''
  for (let i = 0; i < 5; i++) {
    suffixe += ALPHABET[Math.floor(random() * ALPHABET.length)]
  }
  return `NX-${suffixe}`
}

export const MAX_SUBJECT = 150
export const MAX_MESSAGE = 5000
export const MAX_FIELD = 500
export const MAX_REPONSE = 10000

/**
 * Les etats dans lesquels une demande accepte encore un message.
 *
 * Un dossier ferme ne reprend pas vie tout seul : ecrire a propos d'un
 * probleme regle il y a trois mois doit ouvrir une nouvelle demande, pas
 * ressusciter l'ancienne.
 */
export const ETATS_VIVANTS = ['open', 'answered'] as const

/**
 * L'objet du courriel envoye a l'equipe.
 *
 * Quand l'utilisateur ne saisit pas d'objet, validerTicket retombe sur
 * le nom de la categorie. L'objet affichait alors deux fois la meme
 * chose : « [NX-NFTAN] Billing & subscription — Billing & subscription ».
 */
export function objetNotification(
  reference: string,
  categorie: string,
  sujet: string,
): string {
  return sujet.trim() === categorie.trim()
    ? `[${reference}] ${categorie}`
    : `[${reference}] ${categorie} — ${sujet}`
}

/**
 * Ce dossier a-t-il une reponse que l'utilisateur n'a pas encore vue ?
 *
 * On compare la derniere reponse SORTANTE a la derniere consultation.
 * Les messages entrants ne comptent pas : ce sont les siens, il les a
 * forcement lus.
 *
 * Jamais consulte mais deja repondu : non lu. C'est le cas du dossier
 * ouvert depuis un courriel, puis consulte pour la premiere fois alors
 * que la reponse est deja la.
 */
export function reponseNonLue(
  ticket: { user_seen_at?: string | null },
  fil: { direction: string; created_at: string }[],
): boolean {
  const sorties = fil.filter((r) => r.direction === 'outbound')
  if (sorties.length === 0) return false

  const derniere = sorties.reduce((recente, r) =>
    new Date(r.created_at) > new Date(recente.created_at) ? r : recente,
  )
  if (!ticket.user_seen_at) return true

  return new Date(derniere.created_at) > new Date(ticket.user_seen_at)
}

export interface TicketExistant {
  id: string
  reference: string
  category: string
  status: string
  created_at: string
}

/**
 * Le dossier qui doit absorber une nouvelle demande, s'il y en a un.
 *
 * La regle : meme categorie, dossier encore vivant, et le PLUS ANCIEN
 * l'emporte. Repondre deux fois au meme probleme, c'est se contredire ;
 * et du point de vue de celui qui a ecrit cinq fois, un support qui
 * repond sur un seul des cinq en ignore quatre.
 *
 * La categorie est la limite volontaire de cette regle. Quelqu'un peut
 * tres bien avoir une question de facturation ET un bogue en meme
 * temps : ce sont deux conversations, pas une. Fusionner au-dela de la
 * categorie melangerait des sujets sans rapport dans un meme fil.
 */
export function dossierAbsorbant(
  existants: TicketExistant[],
  categorie: string,
): TicketExistant | null {
  const candidats = existants.filter(
    (t) =>
      t.category === categorie &&
      (ETATS_VIVANTS as readonly string[]).includes(t.status),
  )
  if (candidats.length === 0) return null

  return candidats.reduce((plusAncien, t) =>
    new Date(t.created_at) < new Date(plusAncien.created_at) ? t : plusAncien,
  )
}

/**
 * Une reponse d'administrateur avant enregistrement.
 *
 * Deux refus, pour deux degats differents. Vide : le ticket passerait a
 * « answered » sans que rien n'ait ete dit, et on cesserait de le voir dans
 * la file. Trop longue : la colonne accepterait tout, mais le courriel
 * serait tronque chez le destinataire sans que l'ecran l'annonce.
 */
export function validerReponse(brut: unknown):
  | { ok: true; body: string }
  | { ok: false; error: string } {
  const body = typeof brut === 'string' ? brut.trim() : ''
  if (body.length === 0) {
    return { ok: false, error: 'The reply is empty' }
  }
  if (body.length > MAX_REPONSE) {
    return { ok: false, error: 'The reply is too long' }
  }
  return { ok: true, body }
}

export interface TicketInput {
  category?: unknown
  email?: unknown
  subject?: unknown
  message?: unknown
  fields?: unknown
  /** Champ piege : rempli, c'est un robot. */
  website?: unknown
}

export interface TicketValide {
  category: SupportCategoryId
  email: string
  subject: string
  message: string
  fields: Record<string, string>
}

export type Validation =
  | { ok: true; ticket: TicketValide }
  | { ok: false; error: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Valide une demande avant toute ecriture.
 *
 * Deux routes de ce site ont deja du etre supprimees pour avoir accepte
 * n'importe quoi : on borne donc les longueurs, on refuse les types
 * inconnus, et on ne garde que les champs declares par le type choisi — un
 * client modifie ne peut pas gonfler `context` avec ce qu'il veut.
 */
export function validerTicket(input: TicketInput): Validation {
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    // Champ invisible pour un humain : seul un robot le remplit. On refuse
    // sans expliquer pourquoi.
    return { ok: false, error: 'Invalid submission' }
  }

  const categorie = categoryById(String(input.category ?? ''))
  if (!categorie) {
    return { ok: false, error: 'Unknown request type' }
  }

  const email = String(input.email ?? '').trim().toLowerCase()
  if (!EMAIL.test(email) || email.length > 320) {
    return { ok: false, error: 'A valid email address is required' }
  }

  const message = String(input.message ?? '').trim()
  if (message.length < 10) {
    return { ok: false, error: 'Please describe your request in a few words' }
  }
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: 'Your message is too long' }
  }

  const subject = String(input.subject ?? '').trim() || categorie.title
  if (subject.length > MAX_SUBJECT) {
    return { ok: false, error: 'Subject is too long' }
  }

  // Seuls les champs declares par le type sont conserves.
  const recus =
    input.fields && typeof input.fields === 'object'
      ? (input.fields as Record<string, unknown>)
      : {}
  const fields: Record<string, string> = {}
  for (const champ of categorie.fields) {
    if (champ.name === 'message') continue
    const brut = String(recus[champ.name] ?? '').trim()
    if (!brut) {
      if (champ.required) {
        return { ok: false, error: `${champ.label} is required` }
      }
      continue
    }
    fields[champ.name] = brut.slice(0, MAX_FIELD)
  }

  return {
    ok: true,
    ticket: { category: categorie.id, email, subject, message, fields },
  }
}
