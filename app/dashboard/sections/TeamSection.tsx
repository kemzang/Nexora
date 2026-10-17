'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  Loader2,
  Mail,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'

/**
 * Gestion de l'equipe : membres, invitations, consommation du pot commun.
 *
 * La section ne s'affiche que pour les membres d'une organisation. Les
 * actions de gestion ne sont proposees qu'aux responsables — et l'API
 * refuse de toute facon les autres : masquer un bouton n'est pas une
 * protection, c'est du confort.
 */

type Member = {
  id: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  name: string | null
  avatarUrl: string | null
  isYou: boolean
  creditsUsed?: number
}

type Invite = {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

type Org = {
  id: string
  name: string
  seats: number
  role: Member['role']
  credits: { used: number; limit: number; remaining: number }
}

const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

export function TeamSection() {
  const [org, setOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [message, setMessage] = useState<string | null>(null)

  const token = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await token()
      if (!t) return
      const res = await fetch('/api/organizations/me', {
        headers: { Authorization: `Bearer ${t}` },
      })
      const body = await res.json()
      setOrg(body.organization)
      setMembers(body.members ?? [])
      setInvites(body.invites ?? [])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function call(
    path: string,
    init: RequestInit,
  ): Promise<{ ok: boolean; body: Record<string, unknown> }> {
    const t = await token()
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
        ...(init.headers ?? {}),
      },
    })
    return { ok: res.ok, body: await res.json().catch(() => ({})) }
  }

  async function invite() {
    setBusy(true)
    setMessage(null)
    const { ok, body } = await call('/api/organizations/invites', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    })
    setBusy(false)
    if (!ok) {
      setMessage((body.error as string) ?? 'Could not send the invitation')
      return
    }
    setMessage(
      body.emailSent === false
        ? 'Invitation created, but the email could not be sent.'
        : `Invitation sent to ${email}.`,
    )
    setEmail('')
    void load()
  }

  async function revoke(id: string) {
    setBusy(true)
    await call(`/api/organizations/invites?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    setBusy(false)
    void load()
  }

  async function remove(memberId: string) {
    setBusy(true)
    const { ok, body } = await call(
      `/api/organizations/members?id=${encodeURIComponent(memberId)}`,
      { method: 'DELETE' },
    )
    setBusy(false)
    if (!ok) setMessage((body.error as string) ?? 'Could not remove this member')
    void load()
  }

  async function changeRole(memberId: string, next: Member['role']) {
    setBusy(true)
    const { ok, body } = await call('/api/organizations/members', {
      method: 'PATCH',
      body: JSON.stringify({ memberId, role: next }),
    })
    setBusy(false)
    if (!ok) setMessage((body.error as string) ?? 'Could not change this role')
    void load()
  }

  if (loading) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your team…
        </p>
      </GlassCard>
    )
  }

  if (!org) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-foreground/60 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm mb-1">No team yet</h3>
            <p className="text-sm text-muted-foreground">
              Teams come with the Enterprise plan: shared credits, central
              member management and per-person usage reporting.{' '}
              <a href="/enterprise" className="underline underline-offset-4">
                Talk to us
              </a>{' '}
              to set one up.
            </p>
          </div>
        </div>
      </GlassCard>
    )
  }

  const manager = org.role === 'owner' || org.role === 'admin'
  const seatsUsed = members.length + invites.length
  const pct = org.credits.limit
    ? Math.min(100, (org.credits.used / org.credits.limit) * 100)
    : 0

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold">{org.name}</h2>
            <p className="text-sm text-muted-foreground">
              {seatsUsed} of {org.seats} seats used
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Shared credits</span>
          <span className="font-mono">
            {fmt(org.credits.used)} / {fmt(org.credits.limit)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-blue-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {fmt(org.credits.remaining)} credits left this period, shared across
          the whole team.
        </p>
      </GlassCard>

      {manager && (
        <GlassCard className="p-6">
          <h3 className="font-semibold text-sm mb-3">Invite someone</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="flex-1 bg-white/[0.04] border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-foreground/30"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
              className="bg-white/[0.04] border border-border/60 rounded-xl px-3 py-2 text-sm outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Administrator</option>
            </select>
            <Button
              onClick={() => void invite()}
              disabled={busy || seatsUsed >= org.seats || !email}
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Invite
            </Button>
          </div>
          {seatsUsed >= org.seats && (
            <p className="text-xs text-amber-400 mt-2">
              All seats are taken. Remove a member or ask us to add seats.
            </p>
          )}
          {message && (
            <p className="text-xs text-muted-foreground mt-2">{message}</p>
          )}
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <h3 className="font-semibold text-sm mb-4">Members</h3>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 text-xs">
                {(m.name ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">
                  {m.name ?? 'Unnamed'}
                  {m.isYou && (
                    <span className="text-muted-foreground"> · you</span>
                  )}
                </p>
                {m.creditsUsed !== undefined && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {fmt(m.creditsUsed)} credits
                  </p>
                )}
              </div>

              {manager && !m.isYou ? (
                <select
                  value={m.role}
                  onChange={(e) =>
                    void changeRole(m.id, e.target.value as Member['role'])
                  }
                  disabled={busy || (m.role === 'owner' && org.role !== 'owner')}
                  className="bg-white/[0.04] border border-border/60 rounded-lg px-2 py-1 text-xs outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Administrator</option>
                  {org.role === 'owner' && <option value="owner">Owner</option>}
                </select>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {m.role === 'owner' && <ShieldCheck className="w-3 h-3" />}
                  {m.role}
                </span>
              )}

              {manager && !m.isYou && (
                <button
                  onClick={() => void remove(m.id)}
                  disabled={busy}
                  aria-label={`Remove ${m.name ?? 'this member'}`}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {manager && invites.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="font-semibold text-sm mb-4">Pending invitations</h3>
          <div className="space-y-2">
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
              >
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{i.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.role} · expires{' '}
                    {new Date(i.expires_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <button
                  onClick={() => void revoke(i.id)}
                  disabled={busy}
                  aria-label={`Revoke the invitation sent to ${i.email}`}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
