'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Key, Plus, Copy, Trash2, CheckCircle2, Loader2,
  AlertTriangle, Clock, Shield
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  rate_limit_per_minute: number
  expires_at: string | null
  permissions: Record<string, unknown> | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never used'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

/*
 * Au-dela de ce delai, on cesse d'attendre.
 *
 * `fetch` n'a aucune expiration par defaut : sur une liaison qui decroche,
 * la promesse ne se resout jamais et le bouton reste sur « Creating… »
 * indefiniment. L'utilisateur ne peut alors pas distinguer « c'est lent »
 * de « c'est mort ». Mesure du 23 novembre 2026 sur cette route : une
 * requete sur trois n'aboutissait pas, les deux autres repondaient en 1 a
 * 4 secondes. 45 secondes laissent donc largement passer un demarrage a
 * froid tout en bornant l'attente.
 */
const DELAI_CREATION_MS = 45_000

/**
 * Etat d'echeance d'une clef, tel qu'on l'annonce a son porteur.
 *
 * Une clef `nxr_` vit 90 jours, mais l'echeance GLISSE : chaque utilisation la
 * repousse (prolongerSiProche, lib/auth-verify.ts). Ce n'est donc pas « 90
 * jours de vie » mais « 90 jours d'inactivite », et c'est exactement ce qu'il
 * faut ecrire — sinon l'utilisateur croit devoir renouveler une clef qui ne
 * mourra jamais tant qu'il s'en sert.
 */
function etatEcheance(expiresAt: string | null): {
  expiree: boolean
  jours: number | null
} {
  if (!expiresAt) return { expiree: false, jours: null }
  const restant = new Date(expiresAt).getTime() - Date.now()
  return { expiree: restant <= 0, jours: Math.max(0, Math.ceil(restant / 86_400_000)) }
}

export default function ApiKeysSection() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchKeys = useCallback(async (userId: string) => {
    const { data } = await (supabase.from('api_keys') as any)
      .select('id, name, key_prefix, is_active, last_used_at, created_at, rate_limit_per_minute, expires_at, permissions')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Les codes d'authentification temporaires ne sont pas des clefs : ils
    // n'ont rien a faire dans cette liste.
    //
    // Les clefs EXPIREES, en revanche, y restent desormais. Elles etaient
    // filtrees ici : une clef arrivee a echeance disparaissait sans un mot,
    // l'autocompletion de son porteur s'arretait, et rien dans le tableau de
    // bord ne permettait de comprendre pourquoi. Mieux vaut l'afficher morte
    // que de la faire disparaitre.
    const realKeys = ((data as ApiKeyRow[]) || []).filter(k => {
      const perms = k.permissions as Record<string, unknown> | null
      if (perms?.temporary || perms?.auth_code) return false
      return true
    })
    setKeys(realKeys)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.id) fetchKeys(user.id)
  }, [user?.id, fetchKeys])

  const handleCreate = async () => {
    if (!newKeyName.trim() || !user?.id) return
    setCreating(true)
    setCreateError(null)
    try {
      // La clé est générée et insérée côté serveur (rôle service) : plus de
      // dépendance au RLS/à la session du navigateur. On s'authentifie avec le
      // jeton de session Supabase courant.
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        showToast('Session expired — sign in again and retry', 'error')
        return
      }

      const res = await fetch('/api/keys/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
        signal: AbortSignal.timeout(DELAI_CREATION_MS),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success || !data?.token) {
        const message = data?.error || 'Failed to create the key'
        setCreateError(message)
        showToast(message, 'error')
        return
      }

      setCreatedKey(data.token)
      setNewKeyName('')
      setShowCreate(false)
      if (user?.id) fetchKeys(user.id)
    } catch (e) {
      /*
       * Ce qu'on ne fait PAS : reessayer tout seul.
       *
       * Cette requete n'est pas idempotente. Une expiration ne dit pas que
       * rien n'a ete cree — elle dit qu'on n'a pas recu la reponse. Le
       * serveur a peut-etre insere la cle, dont le jeton n'est affiche
       * qu'une seule fois : un second envoi laisserait alors une cle
       * fantome, impossible a utiliser et deroutante a voir apparaitre.
       *
       * On rafraichit donc la liste et on laisse la personne decider.
       */
      const expire =
        e instanceof DOMException &&
        (e.name === 'TimeoutError' || e.name === 'AbortError')

      const message = expire
        ? 'The request timed out. The key may have been created anyway — check the list below before trying again.'
        : 'Network error. Check your connection, then try again.'

      setCreateError(message)
      showToast(message, 'error')
      if (user?.id) fetchKeys(user.id)
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setKeyCopied(true)
    showToast('Key copied to clipboard', 'success')
    setTimeout(() => setKeyCopied(false), 2000)
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await (supabase.from('api_keys') as any).update({ is_active: false }).eq('id', id)
    if (error) { showToast('Deletion failed', 'error') } else {
      showToast('Key revoked', 'success')
      setKeys(prev => prev.filter(k => k.id !== id))
    }
    setDeleteConfirm(null)
    setDeleting(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your access keys for the VS Code extension</p>
        </div>
        <Button
          onClick={() => { setShowCreate(true); setNewKeyName('') }}
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" /> New key
        </Button>
      </div>

      {/* Security note */}
      <Card className="glass border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 flex gap-3">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            Your API keys give full access to your Nexora credits. Never share them, and revoke any compromised key immediately.
          </p>
        </CardContent>
      </Card>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="glass border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Create a new key</CardTitle>
                <CardDescription className="text-sm">Give your key a descriptive name so you can identify it easily.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName" className="text-sm">Key name</Label>
                  <Input
                    id="keyName"
                    placeholder="ex: VS Code - MacBook Pro"
                    value={newKeyName}
                    onChange={e => { setNewKeyName(e.target.value); setCreateError(null) }}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    className="bg-card border-border/50 focus:border-foreground/30"
                    maxLength={50}
                  />
                </div>
                {createError && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{createError}</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newKeyName.trim()}
                    className="bg-primary text-primary-foreground"
                  >
                    {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create the key'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowCreate(false); setCreateError(null) }} className="text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Created key - show once */}
      <AnimatePresence>
        {createdKey && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="glass border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold text-sm">Key created</span>
                </div>
                <p className="text-xs text-amber-300 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Copy this key now — it will not be shown again.
                </p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 font-mono text-xs bg-card border border-border/50 rounded-lg px-3 py-2.5 text-foreground truncate">
                    {createdKey}
                  </code>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(createdKey)}
                    className={`shrink-0 transition-all ${keyCopied ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-primary'} text-primary-foreground`}
                  >
                    {keyCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <button
                  onClick={() => setCreatedKey(null)}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  I have copied my key, close
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys list */}
      <Card className="glass">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Key className="w-4 h-4 text-foreground/70" />
            Active keys
            {!loading && <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-foreground/70 text-xs font-medium">{keys.length}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/30">
                  <div className="skeleton w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Key className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">No API keys</p>
              <p className="text-sm text-muted-foreground mb-5">Create your first key to use Nexora in VS Code</p>
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-primary text-primary-foreground"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />Create a key
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key, i) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 hover:border-border/60 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-foreground/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{key.name}</p>
                      {etatEcheance(key.expires_at).expiree ? (
                        <span className="badge-warning">Expired</span>
                      ) : (
                        <span className="badge-success">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <code className="text-xs text-muted-foreground font-mono">{key.key_prefix}••••••••••••••••••••</code>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{timeAgo(key.last_used_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Created on {formatDate(key.created_at)}
                      {(() => {
                        const { expiree, jours } = etatEcheance(key.expires_at)
                        if (jours === null) return null
                        return expiree
                          ? ` · expired on ${formatDate(key.expires_at as string)} — create a new key to sign in again`
                          : ` · renews itself while in use, expires in ${jours} days if left unused`
                      })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {deleteConfirm === key.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-400">Confirm?</span>
                        <button
                          onClick={() => handleDelete(key.id)}
                          disabled={deleting}
                          className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium transition-colors"
                        >
                          {deleting ? 'Revoking…' : 'Yes, revoke'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 rounded-lg bg-white/[0.05] text-muted-foreground hover:text-foreground text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(key.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Revoke the key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
