'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Champ de mot de passe avec bouton d'affichage.
 *
 * Les utilisateurs se plaignaient de ne pas relire ce qu'ils tapaient. Un
 * mot de passe qu'on ne peut pas verifier se tape deux fois de travers, et
 * c'est encore plus vrai pour la confirmation : sans relecture possible, le
 * seul retour est « les mots de passe ne correspondent pas », sans dire
 * lequel des deux est faux.
 *
 * `pr-10` reserve la place du bouton pour que le texte ne passe jamais
 * dessous, et le placeholder par defaut devient de vrais caracteres plutot
 * que des puces — une ligne de puces grises ressemble a un champ deja
 * rempli.
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'>
>(({ className, placeholder, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder ?? 'Enter your password'}
        className={cn('pr-10', className)}
      />
      <button
        type="button"
        // tabIndex -1 : la tabulation doit mener du mot de passe a la
        // confirmation, pas s'arreter sur un bouton d'affichage.
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
