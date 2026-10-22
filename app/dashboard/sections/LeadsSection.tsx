'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, Rocket, Loader2, ExternalLink, RefreshCw, Archive, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { CreateTeamForm } from './CreateTeamForm'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { findCountry } from '@/lib/countries'

/** Code ISO vers nom. Laisse passer ce qui n'en est pas un (saisies d'avant). */
function countryLabel(value: string | null): string {
  if (!value) return ''
  const c = findCountry(value.toUpperCase())
  return c ? `${c.flag} ${c.name}` : value
}

/**
 * Revue des demandes Enterprise et des candidatures start-up.
 *
 * Section reservee : l'API refuse tout appelant absent d'ADMIN_EMAILS, et
 * cet ecran affiche simplement un message si l'acces est refuse — il ne sert
 * a rien de masquer l'entree de menu, c'est le serveur qui decide.
 */

type Enterprise = {
  id: string; created_at: string; company_name: string; company_website: string
  company_size: string; country: string; contact_name: string; contact_role: string | null
  work_email: string; phone: string | null; developers: number | null
  ides: string[] | null; timeline: string | null; requirements: string[] | null
  message: string | null; status: string; notes: string | null
}
type Startup = {
  id: string; created_at: string; company_name: string; company_website: string
  country: string; founded_year: number; team_size: number; funding_stage: string
  funding_amount: string | null; contact_name: string; contact_role: string | null
  work_email: string; requested_plan: string; proof_type: string; proof_url: string | null
  message: string | null; status: string; notes: string | null
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  pending: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  contacted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  lost: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${
      STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {status}
    </span>
  )
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-muted-foreground/70 shrink-0">{label}</span>
      <span className="text-foreground/85 break-all">{value}</span>
    </div>
  )
}

export default function LeadsSection() {
  const [ent, setEnt] = useState<Enterprise[]>([])
  const [apps, setApps] = useState<Startup[]>([])
  const [tab, setTab] = useState<'enterprise' | 'startups'>('enterprise')
  const [loading, setLoading] = useState(true)
  // La corbeille n'est pas un onglet : c'est une bascule, pour qu'on la
  // consulte sans jamais la confondre avec la revue courante.
  const [showArchived, setShowArchived] = useState(false)
  // Demande d'archivage en attente de confirmation. On garde l'intitule pour
  // que la modale nomme ce qu'on s'apprete a ecarter.
  const [pendingArchive, setPendingArchive] = useState<{ id: string; label: string } | null>(null)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  // Leads ayant deja une organisation : le bouton laisse place au nom de
  // l'equipe, sinon on en creerait une seconde par inadvertance.
  const [teamByLead, setTeamByLead] = useState<Record<string, string>>({})

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const t = await token()
    if (!t) { setDenied(true); setLoading(false); return }
    const res = await fetch(`/api/admin/leads${showArchived ? '?archived=1' : ''}`,
      { headers: { Authorization: `Bearer ${t}` } })
    if (res.status === 403) { setDenied(true); setLoading(false); return }
    if (res.ok) {
      const d = await res.json()
      setEnt(d.enterprise ?? [])
      setApps(d.startups ?? [])
      setDenied(false)
    }

    const orgsRes = await fetch('/api/admin/organizations', {
      headers: { Authorization: `Bearer ${t}` },
    })
    if (orgsRes.ok) {
      const { organizations } = await orgsRes.json()
      const map: Record<string, string> = {}
      for (const o of organizations ?? []) {
        if (o.lead_id) map[o.lead_id] = o.name
      }
      setTeamByLead(map)
    }

    setLoading(false)
  }, [token, showArchived])

  useEffect(() => { void load() }, [load])

  async function update(table: 'enterprise' | 'startup', id: string, status: string) {
    setBusy(id)
    const t = await token()
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ table, id, status }),
    })
    await load()
    setBusy(null)
  }

  /**
   * Archiver retire de la liste sans effacer : la ligne reste en base, et
   * « Restore » la ramene. La confirmation ne protege que l'archivage — rien
   * n'est perdu, mais ecarter le mauvais prospect se remarque tard.
   */
  async function setArchived(
    table: 'enterprise' | 'startup',
    id: string,
    archived: boolean,
  ) {
    setBusy(id)
    const t = await token()
    await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ table, id, archived }),
    })
    await load()
    setBusy(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (denied) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This section is restricted. Your account is not listed as an administrator.
        </p>
      </GlassCard>
    )
  }

  const rows = tab === 'enterprise' ? ent : apps

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Enterprise enquiries and startup program applications.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {([['enterprise', Building2, 'Enterprise', ent.length],
           ['startups', Rocket, 'Startups', apps.length]] as const).map(([k, Icon, label, n]) => (
          <button
            key={k}
            onClick={() => setTab(k as 'enterprise' | 'startups')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              tab === k
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className="opacity-60">{n}</span>
          </button>
        ))}
        {/* Bascule plutot qu'onglet : la corbeille se consulte, elle ne fait
            pas partie de la revue courante et ne doit pas s'y confondre. */}
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
            showArchived
              ? 'bg-foreground text-background border-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          <Archive className="w-3.5 h-3.5" />
          {showArchived ? 'Viewing archive' : 'Archive'}
        </button>
        <button onClick={() => void load()}
          className="p-2 rounded-lg hover:bg-white/[0.05] text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {rows.length === 0 && (
        <GlassCard className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        </GlassCard>
      )}

      <div className="space-y-3">
        {tab === 'enterprise' && ent.map((l) => (
          <GlassCard key={l.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{l.company_name}</h3>
                  <Pill status={l.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {l.contact_name}{l.contact_role ? ` — ${l.contact_role}` : ''} · {fmt(l.created_at)}
                </p>
              </div>
              <a href={`mailto:${l.work_email}`}
                 className="text-xs text-foreground/80 underline underline-offset-4 shrink-0">
                {l.work_email}
              </a>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
              <Line label="Website" value={
                <a href={l.company_website.startsWith('http') ? l.company_website : `https://${l.company_website}`}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 underline underline-offset-2">
                  {l.company_website}<ExternalLink className="w-3 h-3" />
                </a>} />
              <Line label="Size" value={l.company_size} />
              {/* La base stocke le code ISO ; on affiche le nom, sinon on
                  lit « CM » au lieu de « Cameroon ». Les demandes d'avant la
                  liste fermee portent deja un nom : on les laisse passer. */}
              <Line label="Country" value={countryLabel(l.country)} />
              <Line label="Developers" value={l.developers} />
              <Line label="Timeline" value={l.timeline} />
              <Line label="Phone" value={l.phone} />
              <Line label="IDEs" value={l.ides?.join(', ')} />
              <Line label="Needs" value={l.requirements?.join(', ')} />
            </div>

            {l.message && (
              <p className="text-xs text-muted-foreground bg-white/[0.03] rounded-lg p-3
                            whitespace-pre-wrap mb-3">{l.message}</p>
            )}

            <div className="flex gap-2 flex-wrap items-center">
              {['contacted', 'won', 'lost'].map((s) => (
                <Button key={s} variant="outline" size="sm" disabled={busy === l.id || l.status === s}
                  onClick={() => void update('enterprise', l.id, s)}>
                  {s}
                </Button>
              ))}
              <div className="flex-1" />
              <Button variant="ghost" size="sm" disabled={busy === l.id}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (showArchived) void setArchived('enterprise', l.id, false)
                  else setPendingArchive({ id: l.id, label: l.company_name })
                }}>
                {showArchived ? (
                  <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore</>
                ) : (
                  <><Archive className="w-3.5 h-3.5 mr-1.5" />Archive</>
                )}
              </Button>
            </div>

            {/* La creation d'equipe n'apparait qu'une fois l'affaire gagnee :
                une organisation sans contrat signe n'a pas lieu d'etre. */}
            {teamByLead[l.id] ? (
              <p className="text-xs text-muted-foreground mt-3">
                Team already created: <span className="text-foreground">{teamByLead[l.id]}</span>
              </p>
            ) : l.status === 'won' ? (
              <CreateTeamForm lead={l} token={token} onCreated={() => void load()} />
            ) : null}
          </GlassCard>
        ))}

        {tab === 'startups' && apps.map((a) => (
          <GlassCard key={a.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{a.company_name}</h3>
                  <Pill status={a.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.contact_name}{a.contact_role ? ` — ${a.contact_role}` : ''} · {fmt(a.created_at)}
                </p>
              </div>
              <a href={`mailto:${a.work_email}`}
                 className="text-xs text-foreground/80 underline underline-offset-4 shrink-0">
                {a.work_email}
              </a>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-3">
              <Line label="Website" value={
                <a href={a.company_website.startsWith('http') ? a.company_website : `https://${a.company_website}`}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 underline underline-offset-2">
                  {a.company_website}<ExternalLink className="w-3 h-3" />
                </a>} />
              <Line label="Country" value={countryLabel(a.country)} />
              <Line label="Founded" value={a.founded_year} />
              <Line label="Team" value={`${a.team_size} developers`} />
              <Line label="Funding" value={`${a.funding_stage}${a.funding_amount ? ` — ${a.funding_amount}` : ''}`} />
              <Line label="Wants" value={a.requested_plan} />
              <Line label="Proof" value={
                a.proof_url
                  ? <a href={a.proof_url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 underline underline-offset-2">
                      {a.proof_type}<ExternalLink className="w-3 h-3" />
                    </a>
                  : a.proof_type} />
            </div>

            {a.message && (
              <p className="text-xs text-muted-foreground bg-white/[0.03] rounded-lg p-3
                            whitespace-pre-wrap mb-3">{a.message}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={busy === a.id || a.status === 'approved'}
                onClick={() => void update('startup', a.id, 'approved')}>approve</Button>
              <Button variant="outline" size="sm" disabled={busy === a.id || a.status === 'rejected'}
                onClick={() => void update('startup', a.id, 'rejected')}>reject</Button>
            </div>
          </GlassCard>
        ))}
      </div>
    <ConfirmDialog
      open={!!pendingArchive}
      title="Archive this request?"
      description={
        pendingArchive
          ? `"${pendingArchive.label}" will be hidden from the list. Nothing is deleted — you can bring it back from the archive at any time.`
          : undefined
      }
      confirmLabel="Archive"
      onCancel={() => setPendingArchive(null)}
      onConfirm={() => {
        const target = pendingArchive
        setPendingArchive(null)
        if (target) void setArchived('enterprise', target.id, true)
      }}
    />
    </div>
  )
}
