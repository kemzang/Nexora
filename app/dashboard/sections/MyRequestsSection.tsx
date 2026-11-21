'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown, CornerDownLeft, LifeBuoy, Loader2, Mail, Plus, Send,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { supabase } from '@/lib/supabase'
import { categoryById, reponseNonLue } from '@/lib/supportTickets'

/**
 * Les demandes de l'utilisateur, vues de son cote.
 *
 * Avant cet ecran, une demande envoyee disparaissait : la reference
 * n'etait montree qu'une fois, sur la page de confirmation. Onglet ferme
 * ou courriel egare, et l'utilisateur n'avait plus aucun moyen de savoir
 * ou en etait son dossier — ni meme de retrouver ce qu'il avait ecrit.
 *
 * On montre le fil complet, nos reponses comprises, pour qu'il n'ait pas
 * a retourner dans sa boite pour relire un echange.
 */
interface Ticket {
  id: string
  reference: string
  category: string
  subject: string
  message: string
  status: 'open' | 'answered' | 'closed'
  created_at: string
  user_seen_at: string | null
}

interface Reponse {
  id: string
  ticket_id: string
  direction: 'outbound' | 'inbound'
  body: string
  created_at: string
}

const ETATS: Record<Ticket['status'], { label: string; classe: string }> = {
  open: { label: 'Open', classe: 'text-amber-400 border-amber-400/40' },
  answered: { label: 'Answered', classe: 'text-emerald-400 border-emerald-400/40' },
  closed: { label: 'Closed', classe: 'text-muted-foreground border-border' },
}

export default function MyRequestsSection() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [reponses, setReponses] = useState<Record<string, Reponse[]>>({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [ouvert, setOuvert] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setErreur('Your session has expired. Please sign in again.')
        return
      }
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        setErreur('Your requests could not be loaded.')
        return
      }
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setReponses(data.replies ?? {})
    } catch {
      setErreur('Network error. Check your connection and try again.')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  async function ouvrir(t: Ticket) {
    const deplie = ouvert === t.id
    setOuvert(deplie ? null : t.id)
    if (deplie) return

    /*
     * Le marquage est optimiste : la pastille disparait tout de suite,
     * meme si l'appel echoue. Au pire elle revient au prochain
     * chargement — contre l'alternative, une pastille qui reste alors
     * qu'on vient de lire, et qui finit par etre ignoree.
     */
    const vu = new Date().toISOString()
    setTickets((liste) =>
      liste.map((x) => (x.id === t.id ? { ...x, user_seen_at: vu } : x)),
    )
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: t.id }),
      })
    } catch {
      // Sans consequence : la date sera posee a la prochaine ouverture.
    }
  }

  const nonLus = tickets.filter((t) =>
    reponseNonLue(t, reponses[t.id] ?? []),
  ).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LifeBuoy className="h-5 w-5 opacity-70" /> My requests
          </h1>
          <p className="text-muted-foreground mt-1 text-base">
            {nonLus > 0
              ? `${nonLus} request${nonLus > 1 ? 's have' : ' has'} a reply you have not read yet.`
              : 'Everything you have sent us, and everything we have replied.'}
          </p>
        </div>
        <Link href="/support">
          <Button className="h-10 px-4 text-base">
            <Plus className="mr-2 h-4 w-4" /> New request
          </Button>
        </Link>
      </div>

      {chargement ? (
        <p className="text-muted-foreground flex items-center gap-2 text-base">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : erreur ? (
        <GlassCard className="p-6">
          <p className="text-base text-amber-400">{erreur}</p>
          <Button variant="outline" className="mt-4" onClick={() => void charger()}>
            Try again
          </Button>
        </GlassCard>
      ) : tickets.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Mail className="text-muted-foreground/50 mx-auto mb-3 h-8 w-8" />
          <p className="text-base font-medium">You have not contacted us yet</p>
          <p className="text-muted-foreground mt-1 text-base">
            When you open a request, it appears here with our replies.
          </p>
          <Link href="/support">
            <Button variant="outline" className="mt-5 h-10 px-4 text-base">
              Open a request
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const deplie = ouvert === t.id
            const etat = ETATS[t.status] ?? ETATS.open
            const fil = reponses[t.id] ?? []
            const nouveau = reponseNonLue(t, fil)
            return (
              <GlassCard key={t.id} className="p-4">
                <button
                  type="button"
                  onClick={() => void ouvrir(t)}
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-base">{t.reference}</span>
                    {/* « New reply » passe AVANT l'etat : c'est la seule
                        chose qui demande une action de sa part. */}
                    {nouveau && (
                      <span className="rounded-md bg-sky-400/15 px-2 py-0.5 text-sm font-medium text-sky-300">
                        New reply
                      </span>
                    )}
                    <span
                      className={`rounded-md border border-solid px-2 py-0.5 text-sm ${etat.classe}`}
                    >
                      {etat.label}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {categoryById(t.category)?.title ?? t.category}
                    </span>
                    {/* Le compteur evite d'avoir a deplier pour savoir si
                        quelqu'un a repondu. */}
                    {fil.length > 0 && (
                      <span className="text-muted-foreground text-sm">
                        {fil.length} message{fil.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-sm">
                      {new Date(t.created_at).toLocaleDateString()}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${deplie ? 'rotate-180' : ''}`}
                      />
                    </span>
                  </div>
                  <p className="mt-1.5 font-medium">{t.subject}</p>
                </button>

                {deplie && (
                  <div className="mt-4 space-y-3">
                    <div className="border-border/60 rounded-lg border border-solid border-l-2 border-l-sky-400/70 p-3">
                      <p className="text-muted-foreground mb-1.5 text-sm">
                        You — {new Date(t.created_at).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap text-base">{t.message}</p>
                    </div>

                    {fil.map((r) => {
                      const deNous = r.direction === 'outbound'
                      return (
                        <div
                          key={r.id}
                          className={`border-border/60 rounded-lg border border-solid border-l-2 p-3 ${
                            deNous
                              ? 'border-l-emerald-400/60 bg-emerald-400/[0.04]'
                              : 'border-l-sky-400/70'
                          }`}
                        >
                          <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-sm">
                            {deNous ? (
                              <Send className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <CornerDownLeft className="h-3 w-3 text-sky-400" />
                            )}
                            {deNous ? 'Nexora support' : 'You'} —{' '}
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                          <p className="whitespace-pre-wrap text-base">{r.body}</p>
                        </div>
                      )
                    })}

                    {/* On ne propose pas d'ecrire ici : repondre au courriel
                        revient au meme et fonctionne meme sans etre
                        connecte. Le dire evite de chercher un bouton. */}
                    {t.status !== 'closed' && (
                      <p className="text-muted-foreground text-sm">
                        To add something, reply to our email — it lands in this
                        thread.
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
