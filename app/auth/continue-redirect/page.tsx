'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { VSCODE_EXTENSION_ID } from '@/lib/editorDeepLink'
import { LoadingScreen } from '@/components/patterns/loading-screen'

export const dynamic = 'force-dynamic'

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return

    const handleAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const urlParams = new URLSearchParams(window.location.search)
        const state = urlParams.get('state')
        const error = urlParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`Erreur d'authentification: ${error}`)
          return
        }

        // getSession() lit la session localement. getUser() faisait un aller-retour
        // reseau sous verrou : quand il ne rendait pas la main, la page restait
        // bloquee sur « Authentification en cours… » indefiniment, sans erreur.
        // getSession() peut lui aussi rester bloque (verrou navigator.locks
        // partage entre onglets du meme navigateur, vecu avec plusieurs onglets
        // ouverts sur le site) : meme filet de securite que pour l'appel reseau
        // plus bas, sinon le spinner tourne indefiniment sans jamais d'erreur.
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 8000),
          ),
        ])
        const { data: { session } } = sessionResult
        if (!session?.access_token) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.href)}`
          return
        }

        /*
         * Borne de temps, puis un reessai.
         *
         * Sans borne, une requete qui ne repond pas laisse l'utilisateur
         * devant un spinner sans fin. Mais quinze secondes etaient trop
         * courtes : la fonction serverless demarre a froid, et la premiere
         * requete apres une periode d'inactivite met couramment plusieurs
         * secondes rien qu'a se reveiller. L'utilisateur voyait une erreur
         * alors que le serveur travaillait encore.
         *
         * Le reessai regle justement ce cas : la seconde tentative tombe sur
         * une fonction deja chaude et aboutit en une seconde. Emettre deux
         * codes est sans consequence — ils expirent en dix minutes et le
         * premier reste inutilise.
         */
        const appeler = async (): Promise<Response> => {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 30000)
          try {
            return await fetch('/api/auth/generate-auth-code', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // L'identite est prouvee par le jeton ; le serveur ignore tout
                // userId qu'on lui passerait.
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ state }),
              signal: controller.signal,
            })
          } finally {
            clearTimeout(timeout)
          }
        }

        let response: Response
        try {
          try {
            response = await appeler()
          } catch {
            setMessage('Still working — retrying…')
            response = await appeler()
          }
        } catch (fetchError) {
          setStatus('error')
          setMessage(
            (fetchError as Error)?.name === 'AbortError'
              ? 'The server did not respond in time. Check your connection and try again.'
              : 'Could not reach the authentication server.',
          )
          return
        }

        if (response.status === 401) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.href)}`
          return
        }

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success) {
          setStatus('error')
          setMessage(data.error || 'Failed to generate the code')
          return
        }

        // Le CLI n'a pas de gestionnaire d'URI : il ouvre un petit serveur sur
        // la boucle locale et nous passe son adresse. On lui renvoie le code
        // directement, ce qui lui evite de demander un copier-coller.
        //
        // La cible est restreinte a la boucle locale (RFC 8252). Accepter une
        // adresse quelconque ferait de cette page une redirection ouverte : un
        // lien piege renverrait le code d'authentification a un tiers, qui
        // n'aurait plus qu'a l'echanger contre un jeton du compte.
        const rawRedirect = urlParams.get('redirect_uri')
        if (rawRedirect) {
          let loopback: URL | null = null
          try {
            const candidate = new URL(rawRedirect)
            const isLoopback =
              candidate.protocol === 'http:' &&
              ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(candidate.hostname)
            if (isLoopback) loopback = candidate
          } catch {
            loopback = null
          }

          if (!loopback) {
            setStatus('error')
            setMessage("Redirect address refused: only the local loopback is allowed.")
            return
          }

          loopback.searchParams.set('code', data.code)
          if (state) loopback.searchParams.set('state', state)
          setStatus('success')
          setMessage('Signed in. You can return to your terminal.')
          window.location.href = loopback.toString()
          return
        }

        /*
         * Les editeurs qui savent recevoir un lien profond.
         *
         * Un editeur absent de cette liste n'est pas refuse : il bascule sur
         * la page qui affiche la clef a copier. Mais c'est un detour, et il
         * suffit d'un nom manquant pour l'imposer a tout un editeur — `kiro`
         * y etait, alors qu'il gere les liens `kiro://` comme les autres
         * forks de VS Code.
         */
        const ALLOWED_SCHEMES = [
          'vscode',
          'vscode-insiders',
          'vscodium',
          'cursor',
          'windsurf',
          'code-oss',
          'trae',
          'kiro',
          'positron',
          'firebase-studio',
        ]
        const rawScheme = urlParams.get('uriScheme') || 'vscode'

        if (!ALLOWED_SCHEMES.includes(rawScheme)) {
          // Pas de gestionnaire d'URI personnalise pour cet editeur (JetBrains,
          // CLI...) : impossible de le relancer via un deep link. On envoie
          // plutot vers la page qui affiche la cle a copier-coller.
          const onboarding = urlParams.get('onboarding') === 'true'
          const target = new URL(`${window.location.origin}/tokens/${onboarding ? 'onboarding-' : ''}callback`)
          target.searchParams.set('code', data.code)
          if (state) target.searchParams.set('state', state)
          window.location.href = target.toString()
          return
        }

        const editorUrl = new URL(`${rawScheme}://${VSCODE_EXTENSION_ID}/auth`)
        editorUrl.searchParams.set('code', data.code)
        if (state) editorUrl.searchParams.set('state', state)

        setStatus('success')
        setMessage('Signed in. Redirecting to your editor…')

        // Le lien vscode:// passe la main a l'editeur mais laisse l'onglet
        // ouvert sur cette page, qui n'a plus rien a montrer. On enchaine sur
        // le dashboard : l'utilisateur atterrit sur quelque chose d'utile
        // plutot que sur un ecran de transition fige.
        setTimeout(() => {
          window.location.href = editorUrl.toString()
          setTimeout(() => { window.location.href = '/dashboard' }, 2000)
        }, 1500)
      } catch (err) {
        console.error('Auth error:', err)
        setStatus('error')
        setMessage(
          `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    handleAuth()
  }, [mounted])

  if (!mounted) {
    return (
      <LoadingScreen message="Taking you back to your editor…" />
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-foreground/[0.03] blur-[120px] rounded-full" />

      <div className="glass rounded-2xl p-8 max-w-md w-full text-center relative z-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Authenticating your editor</h1>
          <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="relative inline-flex">
              <div className="w-8 h-8 border-2 border-foreground/30 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-foreground/20 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
            </div>
            <p className="text-muted-foreground">Authenticating…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">{message}</p>
            <p className="text-muted-foreground text-sm">
              If your editor does not open, you can close this window.
              Otherwise you will be redirected to your dashboard.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 font-medium">{message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-muted-foreground text-sm">Nexora — Editor extension</p>
        </div>
      </div>
    </div>
  )
}
