'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle, CornerDownLeft, Loader2, LifeBuoy, RefreshCw,
  Send,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { supabase } from '@/lib/supabase'
import { MAX_REPONSE, categoryById } from '@/lib/supportTickets'

/**
 * Revue des tickets de support.
 *
 * Trois vues, et aucune suppression : fermer un ticket pose un etat et une
 * date, la ligne reste consultable dans « Closed ». Un ticket qu'on peut
 * effacer d'un clic est un ticket qu'on effacera un jour par erreur — et
 * c'est souvent le genant qu'on efface.
 */
interface Ticket {
  id: string
  reference: string
  email: string
  category: string
  subject: string
  message: string
  context: Record<string, unknown>
  status: 'open' | 'answered' | 'closed'
  admin_notes: string | null
  handled_by: string | null
  handled_at: string | null
  created_at: string
}

interface Reponse {
  id: string
  ticket_id: string
  direction: 'outbound' | 'inbound'
  author: string
  body: string
  email_sent: boolean
  email_error: string | null
  created_at: string
}

const VUES = [
  { id: 'open', label: 'Open' },
  { id: 'answered', label: 'Answered' },
  { id: 'closed', label: 'Closed' },
] as const

export default function SupportSection() {
  const [vue, setVue] = useState<(typeof VUES)[number]['id']>('open')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [compteurs, setCompteurs] = useState<Record<string, number>>({})
  const [reponses, setReponses] = useState<Record<string, Reponse[]>>({})
  const [chargement, setChargement] = useState(true)
  const [ouvert, setOuvert] = useState<string | null>(null)
  // Un brouillon par ticket : replier une carte ne doit pas jeter ce qui
  // vient d'etre ecrit.
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null)
  const [erreurEnvoi, setErreurEnvoi] = useState<Record<string, string>>({})

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/admin/support?status=${vue}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setTickets(data.tickets ?? [])
      setCompteurs(data.counts ?? {})
      setReponses(data.replies ?? {})
    } finally {
      setChargement(false)
    }
  }, [vue])

  useEffect(() => {
    void charger()
  }, [charger])

  async function changerEtat(id: string, status: Ticket['status']) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/admin/support', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, status }),
    })
    await charger()
  }

  async function repondre(ticket: Ticket) {
    const texte = (brouillons[ticket.id] ?? '').trim()
    if (!texte || envoiEnCours) return

    setEnvoiEnCours(ticket.id)
    setErreurEnvoi((e) => ({ ...e, [ticket.id]: '' }))
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: ticket.id, body: texte }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErreurEnvoi((e) => ({
          ...e,
          [ticket.id]: data.error || 'The reply could not be saved.',
        }))
        return
      }

      // Le brouillon n'est vide que si la reponse est enregistree : un
      // echec ne doit pas faire disparaitre ce qui a ete ecrit.
      setBrouillons((b) => ({ ...b, [ticket.id]: '' }))
      if (!data.emailSent) {
        setErreurEnvoi((e) => ({
          ...e,
          [ticket.id]:
            `Reply saved, but the email did not go out: ${data.emailError ?? 'unknown error'}. ` +
            'The ticket stays open.',
        }))
      }
      await charger()
    } catch {
      setErreurEnvoi((e) => ({
        ...e,
        [ticket.id]: 'Network error. Nothing was sent.',
      }))
    } finally {
      setEnvoiEnCours(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <LifeBuoy className="h-5 w-5 opacity-70" /> Support
        </h2>
        <Button variant="ghost" size="sm" onClick={() => void charger()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {VUES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVue(v.id)}
            className={`rounded-lg border border-solid px-3 py-1.5 text-sm transition-colors ${
              vue === v.id
                ? 'border-foreground/30 bg-foreground/[0.06]'
                : 'border-border/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.label}
            {/* Le compteur evite de croire qu'un onglet non ouvert est vide. */}
            {compteurs[v.id] ? (
              <span className="text-muted-foreground ml-2 text-xs">
                {compteurs[v.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {chargement ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : tickets.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nothing here. {vue === 'open' ? 'No request is waiting.' : ''}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const deplie = ouvert === t.id
            return (
              <GlassCard key={t.id} className="p-4">
                <button
                  type="button"
                  onClick={() => setOuvert(deplie ? null : t.id)}
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-sm">{t.reference}</span>
                    <span className="text-muted-foreground text-xs">
                      {categoryById(t.category)?.title ?? t.category}
                    </span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{t.subject}</p>
                  <p className="text-muted-foreground text-sm">{t.email}</p>
                </button>

                {deplie && (
                  <div className="mt-4 space-y-4">
                    <p className="whitespace-pre-wrap text-sm">{t.message}</p>

                    {Object.keys(t.context ?? {}).length > 0 && (
                      <div className="border-border/60 rounded-lg border border-solid p-3">
                        <p className="text-muted-foreground mb-2 text-xs">
                          Context collected automatically
                        </p>
                        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
                          {Object.entries(t.context).map(([k, v]) => (
                            <div key={k} className="contents">
                              <dt className="text-muted-foreground">{k}</dt>
                              <dd className="break-all">{String(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {t.handled_by && (
                      <p className="text-muted-foreground text-xs">
                        Last handled by {t.handled_by}
                        {t.handled_at
                          ? ` on ${new Date(t.handled_at).toLocaleString()}`
                          : ''}
                      </p>
                    )}

                    {/* Le fil des reponses deja envoyees. Voir ce qu'on a
                        repondu evite de repondre deux fois, et de se
                        contredire. */}
                    {(reponses[t.id] ?? []).map((r) => {
                      const entrant = r.direction === 'inbound'
                      return (
                        <div
                          key={r.id}
                          className={`border-border/60 rounded-lg border border-solid border-l-2 p-3 ${
                            entrant
                              ? 'border-l-sky-400/70 bg-sky-400/[0.04]'
                              : 'border-l-emerald-400/60'
                          }`}
                        >
                          <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs">
                            {entrant ? (
                              <CornerDownLeft className="h-3 w-3 text-sky-400" />
                            ) : (
                              <Send className="h-3 w-3 text-emerald-400" />
                            )}
                            {entrant ? 'From' : 'Sent by'} {r.author} —{' '}
                            {new Date(r.created_at).toLocaleString()}
                          </p>
                          <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                          {/* `email_sent` ne veut rien dire pour un message
                              entrant : il est arrive, par definition. */}
                          {!entrant && !r.email_sent && (
                            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400">
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                              Not delivered
                              {r.email_error ? `: ${r.email_error}` : ''}
                            </p>
                          )}
                        </div>
                      )
                    })}

                    {/* Repondre depuis le panneau plutot que par `mailto:` :
                        le message part de l'adresse du service, et il reste
                        a cote du ticket. */}
                    <div className="space-y-2">
                      <textarea
                        value={brouillons[t.id] ?? ''}
                        onChange={(e) =>
                          setBrouillons((b) => ({ ...b, [t.id]: e.target.value }))
                        }
                        maxLength={MAX_REPONSE}
                        rows={5}
                        placeholder={`Reply to ${t.email}…`}
                        className="border-border/60 placeholder:text-muted-foreground/60 focus:border-foreground/30 w-full resize-y rounded-lg border border-solid bg-transparent p-3 text-sm outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => void repondre(t)}
                          disabled={
                            envoiEnCours === t.id ||
                            (brouillons[t.id] ?? '').trim() === ''
                          }
                        >
                          {envoiEnCours === t.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-3.5 w-3.5" />
                          )}
                          Send reply
                        </Button>
                        <span className="text-muted-foreground text-xs">
                          Sent to {t.email}. Marks the ticket as answered.
                        </span>
                      </div>
                      {erreurEnvoi[t.id] && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {erreurEnvoi[t.id]}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {t.status !== 'answered' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void changerEtat(t.id, 'answered')}
                        >
                          Mark as answered
                        </Button>
                      )}
                      {t.status !== 'closed' ? (
                        <Button
                          size="sm"
                          onClick={() => void changerEtat(t.id, 'closed')}
                        >
                          <CheckCircle className="mr-2 h-3.5 w-3.5" /> Close
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void changerEtat(t.id, 'open')}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
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
