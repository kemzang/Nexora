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
        placeholder: 'e.g. 1.0.21',
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
