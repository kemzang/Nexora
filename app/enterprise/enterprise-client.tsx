'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  TextField, SelectField, TextArea, CheckGroup, Honeypot, PhoneField,
} from '@/components/patterns/lead-form-fields'
import { COUNTRIES, checkPhone, toE164 } from '@/lib/countries'

const SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-1000', label: '201–1000' },
  { value: '1000+', label: 'More than 1000' },
]
const TIMELINE = [
  { value: 'immediate', label: 'Right away' },
  { value: '1-3m', label: 'Within 1–3 months' },
  { value: '3-6m', label: 'Within 3–6 months' },
  { value: 'exploring', label: 'Just exploring' },
]
const IDE_OPTIONS = [
  { value: 'vscode', label: 'VS Code' },
  { value: 'jetbrains', label: 'JetBrains IDEs' },
  { value: 'cli', label: 'Command line' },
]
/*
 * Chaque exigence dit ce qu'elle engage concretement.
 *
 * « SSO / SAML » ou « Data residency » sont du jargon de decideur technique.
 * Quelqu'un qui remplit le formulaire sans savoir ce qu'ils recouvrent coche
 * au hasard ou ne coche rien — et la demande arrive moins exploitable.
 */
const REQ_OPTIONS = [
  {
    value: 'sso',
    label: 'SSO / SAML',
    desc: 'Your team signs in with your company identity provider (Okta, Entra ID, Google Workspace) instead of a separate Nexora password. New hires get access automatically, departures lose it.',
  },
  {
    value: 'sla',
    label: 'Contractual SLA',
    desc: 'A written uptime and support-response commitment, with agreed consequences if we miss it.',
  },
  {
    value: 'invoicing',
    label: 'Invoice & PO billing',
    desc: 'Pay by bank transfer against an invoice and a purchase order, instead of a card charged monthly.',
  },
  {
    value: 'residency',
    label: 'Data residency',
    desc: 'Your requests are processed in a region you choose — typically the EU — rather than wherever capacity is available.',
  },
  {
    value: 'onprem',
    label: 'Self-hosted',
    desc: 'Nexora runs inside your own infrastructure, so no code or prompt leaves your network.',
  },
]

export function EnterpriseForm() {
  const [f, setF] = useState({
    companyName: '', companyWebsite: '', companySize: '', country: '',
    contactName: '', contactRole: '', workEmail: '', phone: '',
    developers: '', timeline: '', message: '',
  })
  const [ides, setIdes] = useState<string[]>([])
  const [reqs, setReqs] = useState<string[]>([])
  const [trap, setTrap] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  // Le numero n'est verifie qu'une fois le pays choisi : sans lui on ne sait
  // ni quel indicatif attendre, ni combien de chiffres.
  const phone = f.country ? checkPhone(f.phone, f.country) : { ok: true as const }
  const phoneError = phone.ok ? null : phone.reason
  const toggle = (list: string[], setList: (v: string[]) => void) => (v: string) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (phoneError) {
      setError(phoneError)
      return
    }
    setState('sending')
    try {
      const res = await fetch('/api/leads/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          // Enregistre au format international : un numero sans indicatif
          // n'est rappelable que depuis le pays d'origine.
          phone: toE164(f.phone, f.country),
          ides,
          requirements: reqs,
          website_url: trap,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setState('idle')
        return
      }
      setState('sent')
    } catch {
      setError('Network error. Please try again.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <GlassCard className="p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20
                        flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Thank you — we have your request</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We reply within one business day, from a real person who has read what you wrote.
          Check your spam folder if nothing arrives.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6 sm:p-8">
      <form onSubmit={submit} className="relative space-y-6">
        <Honeypot value={trap} onChange={setTrap} />

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Company name" required value={f.companyName}
            onChange={(e) => set('companyName')(e.target.value)} placeholder="Acme Inc." />
          <TextField label="Company website" required value={f.companyWebsite}
            onChange={(e) => set('companyWebsite')(e.target.value)} placeholder="acme.com" />
          <SelectField label="Company size" required value={f.companySize}
            onChange={set('companySize')} options={SIZES} />
          {/* Liste fermee : en champ libre on recevait « cameroun »,
              « Cameroun » et « CMR » pour un meme endroit. On stocke le code
              ISO, jamais le nom saisi. */}
          <SelectField label="Country" required value={f.country}
            onChange={set('country')}
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` }))} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Your name" required value={f.contactName}
            onChange={(e) => set('contactName')(e.target.value)} />
          <TextField label="Your role" value={f.contactRole}
            onChange={(e) => set('contactRole')(e.target.value)} placeholder="Head of Engineering" />
          <TextField label="Work email" type="email" required value={f.workEmail}
            hint="Your company address — personal mailboxes are not accepted."
            onChange={(e) => set('workEmail')(e.target.value)} placeholder="you@acme.com" />
          <PhoneField country={f.country} value={f.phone}
            onChange={set('phone')} error={phoneError} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* `min` n'est qu'une indication : le navigateur laisse taper -87,
              et les fleches du champ descendent sous zero. On filtre donc la
              saisie plutot que de faire confiance a l'attribut. */}
          <TextField label="Developers to equip" type="number" min={1} step={1} value={f.developers}
            onChange={(e) => {
              const n = e.target.value.replace(/[^0-9]/g, '')
              set('developers')(n.replace(/^0+(?=\d)/, ''))
            }}
            placeholder="25" />
          <SelectField label="Timeline" value={f.timeline}
            onChange={set('timeline')} options={TIMELINE} />
        </div>

        <CheckGroup label="Which editors does your team use?" options={IDE_OPTIONS}
          selected={ides} onToggle={toggle(ides, setIdes)} />
        <CheckGroup label="Any specific requirements?" options={REQ_OPTIONS}
          selected={reqs} onToggle={toggle(reqs, setReqs)} />

        <TextArea label="Anything else we should know?" value={f.message}
          onChange={set('message')}
          placeholder="Your current setup, what you are trying to solve, constraints…" />

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20
                        rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={state === 'sending'}>
          {state === 'sending'
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
            : <>Talk to us <ArrowRight className="w-4 h-4 ml-1.5" /></>}
        </Button>
      </form>
    </GlassCard>
  )
}
