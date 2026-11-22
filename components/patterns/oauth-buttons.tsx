'use client'

import { useState } from 'react'

import { useAuth } from '@/hooks/use-auth'

/**
 * « Continuer avec Google » et « Continuer avec GitHub ».
 *
 * Le meme bloc sur la connexion et sur l'inscription : avec un
 * fournisseur, les deux sont le MEME geste. Quelqu'un qui clique
 * « Continuer avec Google » sans compte en obtient un ; avec un compte,
 * il se connecte. Lui demander de choisir la bonne page avant de savoir
 * s'il a deja un compte n'a pas de sens.
 *
 * Chaque bouton n'apparait que si son fournisseur est actif. Montrer un
 * bouton qui repondra « provider is not enabled » est pire que de ne pas
 * le montrer : on essaie, on echoue, et on doute du reste.
 */
const GOOGLE_ACTIF = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'
const GITHUB_ACTIF = process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED === 'true'

/** La marque Google, dans ses quatre couleurs officielles. */
function MarqueGoogle() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  )
}

/** La marque GitHub, monochrome comme leurs regles l'imposent. */
function MarqueGitHub() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}

const FOURNISSEURS = [
  { id: 'google' as const, nom: 'Google', actif: GOOGLE_ACTIF, Marque: MarqueGoogle },
  { id: 'github' as const, nom: 'GitHub', actif: GITHUB_ACTIF, Marque: MarqueGitHub },
].filter((f) => f.actif)

export function OAuthButtons({ onError }: { onError: (message: string) => void }) {
  const { signInWithProvider } = useAuth()
  const [enCours, setEnCours] = useState<string | null>(null)

  if (FOURNISSEURS.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-sm text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-2">
        {FOURNISSEURS.map(({ id, nom, Marque }) => (
          <button
            key={id}
            type="button"
            disabled={enCours !== null}
            onClick={async () => {
              setEnCours(id)
              onError('')
              const { error } = await signInWithProvider(id)
              if (error) {
                onError(error)
                setEnCours(null)
              }
              /*
               * Pas de remise a zero en cas de succes : le navigateur
               * part chez le fournisseur. Laisser le bouton desactive
               * evite un second clic pendant que la page s'en va.
               */
            }}
            className="flex w-full items-center justify-center gap-2.5 h-11 rounded-xl border border-white/15 bg-white/5 text-base font-medium text-foreground transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            <Marque />
            {enCours === id ? `Opening ${nom}…` : `Continue with ${nom}`}
          </button>
        ))}
      </div>
    </>
  )
}
