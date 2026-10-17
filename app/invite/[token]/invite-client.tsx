'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Users, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'

/**
 * Page d'acceptation d'une invitation.
 *
 * Le visiteur n'a souvent pas encore de compte : on affiche d'abord le nom de
 * l'equipe et l'adresse concernee, puis on l'envoie s'inscrire en gardant le
 * lien de retour. Sans cet apercu, il arriverait sur un ecran de connexion
 * nu, sans savoir de quoi il s'agit.
 */

type Preview = {
  email: string
  role: string
  orgName?: string
  expired: boolean
  used: boolean
}

export default function InviteClient({ token }: { token: string }) {
  const router = useRouter()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `/api/organizations/invites/accept?token=${encodeURIComponent(token)}`,
        )
        const body = await res.json()
        if (!res.ok) setError(body.error ?? 'This invitation is not valid')
        else setPreview(body)
      } catch {
        setError('Could not load this invitation')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const accept = useCallback(async () => {
    setJoining(true)
    setError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        // On garde le lien pour revenir ici une fois connecte.
        router.push(`/auth/login?next=${encodeURIComponent(`/invite/${token}`)}`)
        return
      }

      const res = await fetch('/api/organizations/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Could not accept this invitation')
        return
      }
      setDone(body.orgName ?? 'your team')
      setTimeout(() => router.push('/dashboard'), 1800)
    } catch {
      setError('Could not accept this invitation')
    } finally {
      setJoining(false)
    }
  }, [router, token])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-5">
            {done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            ) : (
              <Users className="w-5 h-5 text-foreground/70" />
            )}
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your invitation…
            </p>
          )}

          {done && (
            <>
              <h1 className="text-xl font-bold mb-2">You are in</h1>
              <p className="text-sm text-muted-foreground">
                Welcome to {done}. Taking you to your dashboard…
              </p>
            </>
          )}

          {!loading && !done && error && (
            <>
              <h1 className="text-xl font-bold mb-2">Invitation unavailable</h1>
              <p className="text-sm text-muted-foreground mb-5">{error}</p>
              <Button variant="outline" onClick={() => router.push('/')}>
                Back to Nexora
              </Button>
            </>
          )}

          {!loading && !done && !error && preview && (
            <>
              <h1 className="text-xl font-bold mb-2">
                Join {preview.orgName ?? 'the team'}
              </h1>
              <p className="text-sm text-muted-foreground mb-1">
                This invitation was sent to{' '}
                <span className="text-foreground">{preview.email}</span>
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                You will join as {preview.role === 'admin' ? 'an administrator' : 'a member'} and share the team&apos;s pool of credits.
              </p>

              {preview.used ? (
                <p className="text-sm text-amber-400">
                  This invitation has already been used.
                </p>
              ) : preview.expired ? (
                <p className="text-sm text-amber-400">
                  This invitation has expired. Ask for a new one.
                </p>
              ) : (
                <Button onClick={accept} disabled={joining} className="w-full">
                  {joining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Joining…
                    </>
                  ) : (
                    'Accept the invitation'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
