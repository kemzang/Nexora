'use client'

import { Check, X } from 'lucide-react'

import { PASSWORD_RULES } from '@/lib/password'
import { cn } from '@/lib/utils'

/**
 * Liste vivante des regles, sous le champ.
 *
 * Annoncer les regles seulement dans le message d'erreur oblige a soumettre
 * pour les decouvrir, puis a recommencer. Les montrer des la frappe
 * transforme la contrainte en progression : on voit ce qu'il reste a faire.
 *
 * Rien ne s'affiche tant que le champ est vide — une liste rouge devant un
 * champ auquel on n'a pas touche accuse sans raison.
 */
export function PasswordRequirements({ value }: { value: string }) {
  if (!value) return null

  return (
    <ul className="mt-1.5 grid gap-0.5 text-xs" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value)
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-1.5',
              ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
            )}
          >
            {ok ? (
              <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
            )}
            {/* Le lecteur d'ecran doit entendre l'etat, pas seulement le
                texte de la regle : l'icone seule ne lui dit rien. */}
            <span className="sr-only">{ok ? 'Met: ' : 'Not met: '}</span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
