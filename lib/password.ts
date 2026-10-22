/**
 * @file Regles de mot de passe, en un seul endroit.
 *
 * Inscription et reinitialisation doivent exiger la meme chose. Quand chaque
 * formulaire porte sa propre regle, elles divergent : on durcit l'inscription
 * et on oublie la reinitialisation, qui devient alors la porte derobee — il
 * suffit de « mot de passe oublie » pour contourner l'exigence.
 *
 * La connexion, elle, ne valide RIEN. Les comptes crees avant ces regles ont
 * des mots de passe a six caracteres : les refuser a la connexion enfermerait
 * dehors des gens qui n'ont rien fait de mal. La regle s'applique aux
 * nouveaux mots de passe, pas aux anciens.
 */
import { z } from 'zod'

export interface PasswordRule {
  id: string
  /** Formule au present, affichee telle quelle sous le champ. */
  label: string
  test: (value: string) => boolean
}

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (v) => /[A-Z]/.test(v),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (v) => /[a-z]/.test(v),
  },
  {
    id: 'digit',
    label: 'One number',
    test: (v) => /[0-9]/.test(v),
  },
  {
    id: 'special',
    label: 'One special character',
    // Tout ce qui n'est ni lettre ni chiffre ni espace. Enumerer une liste
    // fermee rejetait des caracteres parfaitement valables — les claviers
    // azerty, qwertz et les dispositions non latines n'ont pas les memes.
    test: (v) => /[^A-Za-z0-9\s]/.test(v),
  },
]

/** Les regles non satisfaites, dans l'ordre d'affichage. */
export function failedPasswordRules(value: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(value))
}

export function isPasswordValid(value: string): boolean {
  return failedPasswordRules(value).length === 0
}

/**
 * Le message d'erreur nomme ce qui manque plutot que de reciter la regle
 * entiere : « Add one number » est actionnable, « must contain 8 characters,
 * one uppercase... » oblige a comparer soi-meme.
 */
export function passwordSchema() {
  return z.string().superRefine((value, ctx) => {
    const failed = failedPasswordRules(value)
    if (failed.length === 0) return
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Missing: ${failed.map((r) => r.label.toLowerCase()).join(', ')}`,
    })
  })
}
