/**
 * Validation partagee des formulaires Enterprise et start-up.
 *
 * Le filtre qui compte est le domaine du courriel : une entreprise ecrit
 * depuis le sien. Exiger des documents des le premier contact ferait fuir les
 * bons prospects autant que les curieux — la verification d'entite a sa place
 * au moment du contrat, pas de la prise de contact. Le programme start-up fait
 * exception : on y accorde une remise, donc une preuve est legitime.
 */

/** Domaines grand public : refuses comme « courriel professionnel ». */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.fr', 'ymail.com',
  'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.com',
  'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.fr', 'mail.com',
  'yandex.com', 'zoho.com', 'tutanota.com', 'fastmail.com',
  'orange.fr', 'free.fr', 'laposte.net', 'sfr.fr', 'wanadoo.fr',
  'qq.com', '163.com', '126.com',
])

/** Domaines jetables les plus courants. */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'trashmail.com', 'getnada.com',
  'sharklasers.com', 'temp-mail.org', 'dispostable.com',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export type EmailVerdict =
  | { ok: true; domain: string }
  | { ok: false; reason: 'invalid' | 'free' | 'disposable' }

export function checkWorkEmail(raw: string): EmailVerdict {
  const email = raw.trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'invalid' }
  const domain = email.split('@')[1]
  if (DISPOSABLE_DOMAINS.has(domain)) return { ok: false, reason: 'disposable' }
  if (FREE_EMAIL_DOMAINS.has(domain)) return { ok: false, reason: 'free' }
  return { ok: true, domain }
}

/** Normalise une adresse de site et en extrait le domaine comparable. */
export function siteDomain(raw: string): string | null {
  try {
    const url = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`)
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

/**
 * Le courriel vient-il du domaine declare ?
 *
 * Non bloquant : une entreprise peut legitimement ecrire depuis un sous-domaine
 * ou une marque differente. C'est un signal pour la revue, pas un refus.
 */
export function emailMatchesSite(email: string, website: string): boolean {
  const e = checkWorkEmail(email)
  const s = siteDomain(website)
  if (!e.ok || !s) return false
  return e.domain === s || e.domain.endsWith(`.${s}`) || s.endsWith(`.${e.domain}`)
}

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const
export const TIMELINES = ['immediate', '1-3m', '3-6m', 'exploring'] as const
export const REQUIREMENTS = ['sso', 'sla', 'invoicing', 'residency', 'onprem'] as const
export const IDES = ['vscode', 'jetbrains', 'cli'] as const
export const FUNDING_STAGES = ['bootstrapped', 'pre-seed', 'seed', 'series-a+'] as const
export const PROOF_TYPES = ['registration', 'accelerator', 'funding', 'other'] as const

/** Conditions publiees du programme start-up. Une seule source de verite. */
export const STARTUP_PROGRAM = {
  // 20 % et non 30 : a 30 %, un client Business tombait a 21 $ pour un cout
  // d'API pouvant atteindre 21,82 $ — la remise rendait le forfait
  // deficitaire au pire cas, et Pro ne gardait que 22 centimes de marge.
  // A 20 %, la remise reste substantielle (2,40 $ sur Pro, 6 $ sur Business)
  // et la marge demeure positive quelle que soit la consommation.
  discountPercent: 20,
  durationMonths: 12,
  eligiblePlans: ['pro', 'business'] as const,
  maxAgeYears: 3,
  maxTeamSize: 10,
  maxFundingUsd: 500_000,
} as const

export type StartupEligibility = { eligible: boolean; reasons: string[] }

/** Verifie les criteres annonces. Informatif : la decision reste humaine. */
export function checkStartupEligibility(input: {
  foundedYear: number
  teamSize: number
  fundingStage: string
}): StartupEligibility {
  const reasons: string[] = []
  const age = new Date().getFullYear() - input.foundedYear
  if (age > STARTUP_PROGRAM.maxAgeYears) {
    reasons.push(`Founded ${age} years ago (limit: ${STARTUP_PROGRAM.maxAgeYears})`)
  }
  if (input.teamSize > STARTUP_PROGRAM.maxTeamSize) {
    reasons.push(`${input.teamSize} developers (limit: ${STARTUP_PROGRAM.maxTeamSize})`)
  }
  if (input.fundingStage === 'series-a+') {
    reasons.push('Series A or beyond')
  }
  return { eligible: reasons.length === 0, reasons }
}
