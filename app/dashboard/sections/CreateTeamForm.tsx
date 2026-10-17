'use client'

import { useState } from 'react'
import { Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Transformation d'un lead Enterprise gagne en organisation.
 *
 * C'est le maillon qui manquait entre « le client dit oui » et « son equipe
 * travaille ». Les champs sont pre-remplis depuis le dossier commercial :
 * le nombre de sieges vient du nombre de developpeurs annonce, le domaine
 * SSO du site de l'entreprise. Tout reste modifiable, puisque le prix et le
 * perimetre sont negocies.
 */

export interface LeadForTeam {
  id: string
  company_name: string
  company_website: string
  work_email: string
  developers: number | null
}

function domainOf(website: string): string {
  try {
    const url = new URL(
      website.startsWith('http') ? website : `https://${website}`,
    )
    return url.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export function CreateTeamForm({
  lead,
  token,
  onCreated,
}: {
  lead: LeadForTeam
  token: () => Promise<string | undefined>
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(lead.company_name)
  const [ownerEmail, setOwnerEmail] = useState(lead.work_email)
  const [seats, setSeats] = useState(String(lead.developers || 5))
  const [creditsPerSeat, setCreditsPerSeat] = useState('40000000')
  const [ssoDomain, setSsoDomain] = useState(domainOf(lead.company_website))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const t = await token()
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({
          name,
          ownerEmail,
          seats: Number(seats),
          creditsPerSeat: Number(creditsPerSeat),
          // Le domaine SSO est facultatif : sans IdP configure, il ne sert
          // qu'au rattachement automatique, qu'on peut vouloir eviter.
          ssoDomains: ssoDomain ? [ssoDomain] : [],
          leadId: lead.id,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Could not create the team')
        return
      }
      setResult(`Team created. Invitation sent to ${body.invited}.`)
      onCreated()
    } catch {
      setError('Could not create the team')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        {result}
      </p>
    )
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        <Users className="w-3.5 h-3.5 mr-1.5" />
        Create team
      </Button>
    )
  }

  const field =
    'w-full bg-white/[0.04] border border-border/60 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-foreground/30'

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-white/[0.02] p-4">
      <h4 className="text-xs font-semibold mb-3">New team</h4>
      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Team name</span>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">
            Owner email
          </span>
          <input
            className={field}
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Seats</span>
          <input
            className={field}
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">
            Credits per seat
          </span>
          <input
            className={field}
            type="number"
            min={0}
            step={1000000}
            value={creditsPerSeat}
            onChange={(e) => setCreditsPerSeat(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] text-muted-foreground">
            SSO domain — anyone signing up with this domain joins the team
            automatically. Leave empty to invite people one by one.
          </span>
          <input
            className={field}
            value={ssoDomain}
            onChange={(e) => setSsoDomain(e.target.value)}
            placeholder="company.com"
          />
        </label>
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Total pool:{' '}
        {new Intl.NumberFormat('en-US').format(
          (Number(seats) || 0) * (Number(creditsPerSeat) || 0),
        )}{' '}
        credits, shared across the team.
      </p>

      {error && <p className="text-[11px] text-amber-400 mb-2">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => void create()} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Creating…
            </>
          ) : (
            'Create and invite the owner'
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
