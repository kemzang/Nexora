'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Loader2,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  Honeypot,
  SelectField,
  TextArea,
  TextField,
} from '@/components/patterns/lead-form-fields'
import { supabase } from '@/lib/supabase'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_SLA,
  type SupportCategory,
} from '@/lib/supportTickets'

/**
 * Le parcours tient en trois ecrans, comme la creation d'une issue GitHub :
 * on choisit un type, on remplit ce qui concerne CE type, on repart avec une
 * reference. A aucun moment on ne tombe sur un formulaire vide ou l'on
 * redemande tout a tout le monde.
 */
type Etape = 'choix' | 'formulaire' | 'envoye'

interface Diagnostic {
  state: string
  plan: string | null
  message: string
}

export function SupportClient() {
  const [etape, setEtape] = useState<Etape>('choix')
  const [categorie, setCategorie] = useState<SupportCategory | null>(null)
  const [valeurs, setValeurs] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [piege, setPiege] = useState('')
  const [reference, setReference] = useState('')
  // Le message a rejoint une demande deja ouverte : la reference
  // affichee n'est pas neuve, et il faut le dire.
  const [fusionne, setFusionne] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [connecte, setConnecte] = useState(false)

  // Diagnostic d'abonnement (type « billing » uniquement).
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null)
  const [verification, setVerification] = useState(false)

  // L'adresse de l'utilisateur connecte, pre-remplie : il n'a pas a retaper
  // ce que nous savons deja.
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email)
        setConnecte(true)
      }
    })
  }, [])

  async function jeton(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  function choisir(c: SupportCategory) {
    setCategorie(c)
    setValeurs({})
    setSujet('')
    setMessage('')
    setErreur(null)
    setDiagnostic(null)
    setEtape('formulaire')
    if (c.showsPaymentCheck && connecte) void verifierPaiement()
  }

  /**
   * « J'ai paye et rien ne s'est active » se resout presque toujours sans
   * nous : le paiement a eu lieu, seule la synchronisation a manque. On
   * relit donc l'etat chez Paddle avant de proposer d'ecrire.
   */
  async function verifierPaiement() {
    setVerification(true)
    setDiagnostic(null)
    try {
      const token = await jeton()
      if (!token) return
      const res = await fetch('/api/support/subscription-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setDiagnostic(await res.json())
    } catch {
      // Silencieux : le formulaire reste disponible, c'est l'essentiel.
    } finally {
      setVerification(false)
    }
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (!categorie) return
    setErreur(null)
    setEnvoi(true)
    try {
      const token = await jeton()
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category: categorie.id,
          email,
          subject: sujet,
          message,
          fields: valeurs,
          website: piege,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErreur(data.error ?? 'Could not send your request.')
        return
      }
      setReference(data.reference)
      setFusionne(data.merged ? (data.mergedOpenedAt ?? '') : null)
      setEtape('envoye')
    } catch {
      setErreur('Could not reach the server. Please try again.')
    } finally {
      setEnvoi(false)
    }
  }

  if (etape === 'envoye') {
    return (
      <GlassCard className="mx-auto max-w-2xl p-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
        <h2 className="mb-2 text-xl font-semibold">
          {fusionne === null
            ? 'Your request is recorded'
            : 'Added to your open request'}
        </h2>
        <p className="mb-6 text-base text-muted-foreground">
          {fusionne === null
            ? 'Keep this reference — quoting it lets us find your request straight away.'
            : 'You already had a request open about this, so we put your message in the same thread.'}
        </p>
        <p className="mb-6 font-mono text-3xl font-bold tracking-wider">
          {reference}
        </p>
        {fusionne !== null && (
          /*
           * Dire POURQUOI la reference n'est pas neuve. Sans cette phrase,
           * quelqu'un qui attend un nouveau numero croit s'etre trompe et
           * renvoie le formulaire — ce qui produit exactement l'empilement
           * qu'on cherche a eviter.
           */
          <p className="mx-auto mb-6 max-w-md rounded-lg border border-solid border-border bg-muted/30 p-4 text-base text-muted-foreground">
            Opened{' '}
            {fusionne
              ? `on ${new Date(fusionne).toLocaleDateString('en-GB')}`
              : 'earlier'}
            . Keeping everything in one thread means nothing is answered
            twice, and nothing is forgotten. If this is about something else
            entirely, say so in your reply and we will split it out.
          </p>
        )}
        <p className="text-base text-muted-foreground">
          We reply {SUPPORT_SLA}, at <strong>{email}</strong>. A confirmation
          is on its way.
        </p>
      </GlassCard>
    )
  }

  if (etape === 'choix') {
    return (
      /*
       * Trois par ligne, bordures franches, texte lisible.
       *
       * Les cartes etaient bordees d'un trait a 60 % d'opacite et decrites
       * en `text-muted-foreground` : sur fond sombre, on devinait les
       * contours et on plissait les yeux pour lire. Quelqu'un qui arrive
       * ici a deja un probleme — lui en ajouter un de lecture est le
       * dernier moment pour faire des economies de contraste.
       */
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => choisir(c)}
            className="border-foreground/20 hover:border-foreground/60 hover:bg-foreground/[0.06] flex h-full flex-col rounded-xl border-2 border-solid p-5 text-left transition-colors"
          >
            <span className="mb-2 block text-base font-semibold">
              {c.title}
            </span>
            <span className="text-foreground/75 block text-sm leading-relaxed">
              {c.description}
            </span>
          </button>
        ))}
      </div>
    )
  }

  const c = categorie!
  return (
    <form onSubmit={envoyer} className="mx-auto max-w-2xl space-y-5">
      <button
        type="button"
        onClick={() => setEtape('choix')}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All request types
      </button>

      <div>
        <h2 className="text-lg font-semibold">{c.title}</h2>
        <p className="text-muted-foreground text-sm">{c.description}</p>
      </div>

      {c.showsPaymentCheck && (
        <GlassCard className="p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
            <div className="flex-1">
              <p className="mb-1 text-sm font-medium">Check your payment first</p>
              {!connecte ? (
                <p className="text-muted-foreground text-sm">
                  Sign in and we can look your payment up automatically.
                </p>
              ) : verification ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up
                  your subscription…
                </p>
              ) : diagnostic ? (
                <p
                  className={`text-sm ${
                    diagnostic.state === 'fixed' || diagnostic.state === 'ok'
                      ? 'text-emerald-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  {diagnostic.message}
                </p>
              ) : null}
              {connecte && !verification && (
                <button
                  type="button"
                  onClick={() => void verifierPaiement()}
                  className="text-foreground/70 hover:text-foreground mt-2 flex items-center gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" /> Re-check my payment
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      <TextField
        label="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        type="email"
        placeholder="you@example.com"
      />

      {c.fields
        .filter((f) => f.name !== 'message')
        .map((f) =>
          f.type === 'select' ? (
            <SelectField
              key={f.name}
              label={f.label}
              value={valeurs[f.name] ?? ''}
              onChange={(v: string) => setValeurs({ ...valeurs, [f.name]: v })}
              required={f.required}
              options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
            />
          ) : f.type === 'textarea' ? (
            <TextArea
              key={f.name}
              label={f.label}
              value={valeurs[f.name] ?? ''}
              onChange={(v: string) => setValeurs({ ...valeurs, [f.name]: v })}
              required={f.required}
              placeholder={f.placeholder}
            />
          ) : (
            <TextField
              key={f.name}
              label={f.label}
              value={valeurs[f.name] ?? ''}
              onChange={(e) =>
                setValeurs({ ...valeurs, [f.name]: e.target.value })
              }
              required={f.required}
              placeholder={f.placeholder}
            />
          ),
        )}

      <TextField
        label="Subject"
        value={sujet}
        onChange={(e) => setSujet(e.target.value)}
        placeholder={c.title}
      />

      <TextArea
        label={c.fields.find((f) => f.name === 'message')?.label ?? 'Message'}
        value={message}
        onChange={setMessage}
        required
        placeholder={c.fields.find((f) => f.name === 'message')?.placeholder}
      />

      <Honeypot value={piege} onChange={setPiege} />

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={envoi}>
          {envoi ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
            </>
          ) : (
            'Send request'
          )}
        </Button>
        <span className="text-muted-foreground text-xs">
          We reply {SUPPORT_SLA}.
        </span>
      </div>
    </form>
  )
}
