'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  TextField, SelectField, TextArea, CheckGroup, Honeypot,
} from '@/components/patterns/lead-form-fields'

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
const REQ_OPTIONS = [
  { value: 'sso', label: 'SSO / SAML' },
  { value: 'sla', label: 'Contractual SLA' },
  { value: 'invoicing', label: 'Invoice & PO billing' },
  { value: 'residency', label: 'Data residency' },
  { value: 'onprem', label: 'Self-hosted' },
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
  const toggle = (list: string[], setList: (v: string[]) => void) => (v: string) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setState('sending')
    try {
      const res = await fetch('/api/leads/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, ides, requirements: reqs, website_url: trap }),
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
          <TextField label="Country" required value={f.country}
            onChange={(e) => set('country')(e.target.value)} placeholder="Germany" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Your name" required value={f.contactName}
            onChange={(e) => set('contactName')(e.target.value)} />
          <TextField label="Your role" value={f.contactRole}
            onChange={(e) => set('contactRole')(e.target.value)} placeholder="Head of Engineering" />
          <TextField label="Work email" type="email" required value={f.workEmail}
            hint="Your company address — personal mailboxes are not accepted."
            onChange={(e) => set('workEmail')(e.target.value)} placeholder="you@acme.com" />
          <TextField label="Phone" value={f.phone}
            onChange={(e) => set('phone')(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Developers to equip" type="number" min={1} value={f.developers}
            onChange={(e) => set('developers')(e.target.value)} placeholder="25" />
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
