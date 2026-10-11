'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { TextField, SelectField, TextArea, Honeypot } from '@/components/patterns/lead-form-fields'
import { STARTUP_PROGRAM, checkStartupEligibility } from '@/lib/leads'

const STAGES = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'pre-seed', label: 'Pre-seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a+', label: 'Series A or beyond' },
]
const PLANS = [
  { value: 'pro', label: 'Pro — $12/month' },
  { value: 'business', label: 'Business — $30/month' },
]
const PROOFS = [
  { value: 'registration', label: 'Company registration certificate' },
  { value: 'accelerator', label: 'Accelerator or incubator membership' },
  { value: 'funding', label: 'Public funding announcement' },
  { value: 'other', label: 'Something else' },
]

export function StartupForm() {
  const [f, setF] = useState({
    companyName: '', companyWebsite: '', country: '',
    foundedYear: '', teamSize: '', fundingStage: '', fundingAmount: '',
    contactName: '', contactRole: '', workEmail: '',
    requestedPlan: '', proofType: '', proofUrl: '', message: '',
  })
  const [trap, setTrap] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  // Avertissement immediat plutot qu'un refus apres coup : si les criteres ne
  // sont pas remplis, autant que la personne le sache avant d'ecrire.
  const year = Number(f.foundedYear)
  const team = Number(f.teamSize)
  const preview =
    year && team && f.fundingStage
      ? checkStartupEligibility({ foundedYear: year, teamSize: team, fundingStage: f.fundingStage })
      : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setState('sending')
    try {
      const res = await fetch('/api/leads/startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, website_url: trap }),
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
        <h3 className="text-lg font-semibold mb-2">Application received</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We review applications within two business days and reply either way.
          If approved, you will get a code applying {STARTUP_PROGRAM.discountPercent}% off
          for {STARTUP_PROGRAM.durationMonths} months.
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
            onChange={(e) => set('companyName')(e.target.value)} />
          <TextField label="Company website" required value={f.companyWebsite}
            onChange={(e) => set('companyWebsite')(e.target.value)} placeholder="yourstartup.com" />
          <TextField label="Country" required value={f.country}
            onChange={(e) => set('country')(e.target.value)} placeholder="Cameroon" />
          <TextField label="Year founded" type="number" required min={1900} value={f.foundedYear}
            onChange={(e) => set('foundedYear')(e.target.value)} placeholder="2024" />
          <TextField label="Developers in the team" type="number" required min={1} value={f.teamSize}
            onChange={(e) => set('teamSize')(e.target.value)} placeholder="4" />
          <SelectField label="Funding stage" required value={f.fundingStage}
            onChange={set('fundingStage')} options={STAGES} />
        </div>

        {preview && !preview.eligible && (
          <div className="flex gap-2.5 text-sm bg-amber-500/10 border border-amber-500/20
                          rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              <strong className="text-foreground/90">Outside the published criteria:</strong>{' '}
              {preview.reasons.join('; ')}. You can still apply — tell us your situation below
              and we will look at it.
            </div>
          </div>
        )}

        <TextField label="Amount raised, if any" value={f.fundingAmount}
          onChange={(e) => set('fundingAmount')(e.target.value)} placeholder="$120,000" />

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Your name" required value={f.contactName}
            onChange={(e) => set('contactName')(e.target.value)} />
          <TextField label="Your role" value={f.contactRole}
            onChange={(e) => set('contactRole')(e.target.value)} placeholder="Co-founder, CTO" />
        </div>

        <TextField label="Company email" type="email" required value={f.workEmail}
          hint="Your company address — personal mailboxes are not accepted."
          onChange={(e) => set('workEmail')(e.target.value)} />

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label="Plan you want" required value={f.requestedPlan}
            onChange={set('requestedPlan')} options={PLANS} />
          <SelectField label="Proof you can provide" required value={f.proofType}
            onChange={set('proofType')} options={PROOFS} />
        </div>

        <TextField label="Link to your proof" value={f.proofUrl}
          hint="A public link, or a shared document. We will ask by email if you prefer."
          onChange={(e) => set('proofUrl')(e.target.value)} />

        <TextArea label="Tell us what you are building" value={f.message}
          onChange={set('message')}
          placeholder="What your product does, where you are, how Nexora would help." />

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20
                        rounded-lg px-3 py-2">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={state === 'sending'}>
          {state === 'sending'
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
            : <>Apply <ArrowRight className="w-4 h-4 ml-1.5" /></>}
        </Button>
      </form>
    </GlassCard>
  )
}
