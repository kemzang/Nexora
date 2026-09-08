'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Send, Users, Wifi, WifiOff, ExternalLink, Copy, Check, LogIn, MessageCircle } from 'lucide-react'

const PRESENCE_TIMEOUT_MS = 30_000
const HEARTBEAT_INTERVAL_MS = 10_000

// ── Types ──────────────────────────────────────────────────────────────────────

interface CollabMessage {
  id: string
  sender_id: string
  sender_name: string
  role: 'user' | 'assistant' | 'agent_status'
  content: string
  model_id: string | null
  created_at: string
}

interface CollabMember {
  user_id: string
  display_name: string
  last_seen_at: string
}

interface Annotation {
  id: string
  message_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

// ── Logo ───────────────────────────────────────────────────────────────────────

function NexoraLogo() {
  return (
    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold text-sm tracking-tight select-none">N</span>
    </div>
  )
}

// ── Agent activity line (statut discret, pas une vraie bulle de chat) ──────────

function AgentActivityLine({ msg }: { msg: CollabMessage }) {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="flex justify-center mb-2">
      <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1">
        {msg.content} · {time}
      </span>
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg, myUserId, annotations, roomActive, onAddAnnotation,
}: {
  msg: CollabMessage
  myUserId: string
  annotations: Annotation[]
  roomActive: boolean
  onAddAnnotation: (content: string) => Promise<void>
}) {
  const isMe = msg.sender_id === myUserId
  const isAI = msg.role === 'assistant'
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    const content = draft.trim()
    if (!content || posting) return
    setPosting(true)
    try {
      await onAddAnnotation(content)
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} mb-3`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 ${
        isAI ? 'bg-primary text-primary-foreground'
        : isMe ? 'bg-foreground text-background'
        : 'bg-slate-200 text-slate-600'
      }`}>
        {isAI ? 'AI' : msg.sender_name[0]?.toUpperCase() ?? '?'}
      </div>
      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        <span className="text-xs text-slate-400 px-1">
          {isMe ? 'Vous' : msg.sender_name} · {time}
        </span>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isAI ? 'bg-muted text-foreground border border-border'
          : isMe ? 'bg-foreground text-background rounded-tr-sm'
          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
        }`}>
          {isAI && (
            <span className="block text-xs font-semibold text-foreground/70 mb-1 uppercase tracking-wider">
              {msg.model_id ?? 'AI'}
            </span>
          )}
          {msg.content}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-1 mt-0.5 transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          {annotations.length > 0 ? annotations.length : 'Commenter'}
        </button>

        {expanded && (
          <div className="w-full max-w-xs bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-1 space-y-2">
            {annotations.map(a => (
              <div key={a.id} className="text-xs">
                <span className="font-semibold text-slate-600">{a.author_name}</span>{' '}
                <span className="text-slate-400">
                  {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="text-slate-700 leading-relaxed">{a.content}</p>
              </div>
            ))}
            {annotations.length === 0 && (
              <p className="text-xs text-slate-400">Aucun commentaire pour l'instant.</p>
            )}
            {roomActive && (
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handlePost()}
                  placeholder="Ajouter un commentaire…"
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <button
                  onClick={() => void handlePost()}
                  disabled={!draft.trim() || posting}
                  className="px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CollabRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const inviteToken = searchParams.get('token') ?? ''

  const { user, token: authToken, loading: authLoading } = useAuth()

  const [joined, setJoined] = useState(false)
  const [checkingMembership, setCheckingMembership] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [joinError, setJoinError] = useState('')
  const [roomName, setRoomName] = useState('Session Nexora')
  const [roomActive, setRoomActive] = useState(true)
  const [joining, setJoining] = useState(false)

  const [messages, setMessages] = useState<CollabMessage[]>([])
  const [members, setMembers] = useState<CollabMember[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [connected, setConnected] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Pré-remplir le displayName depuis le profil Supabase
  useEffect(() => {
    if (user?.firstName) setDisplayName(user.firstName)
    else if (user?.email) setDisplayName(user.email.split('@')[0])
  }, [user])

  // ── Reprise directe pour un membre déjà connu du salon (ex: lien depuis
  // l'historique) — évite de redemander le token d'invitation, et permet de
  // rouvrir un salon fermé (is_active=false) en lecture seule.
  useEffect(() => {
    if (!roomId || !authToken) {
      if (!authLoading && !authToken) setCheckingMembership(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/collab/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!cancelled && res.ok) {
          const data = await res.json()
          setRoomName(data.room.name)
          setRoomActive(data.room.is_active)
          setJoined(true)
        }
      } finally {
        if (!cancelled) setCheckingMembership(false)
      }
    })()
    return () => { cancelled = true }
  }, [roomId, authToken, authLoading])

  // ── Présence : snapshot des membres actifs (last_seen_at < 30s) ──
  const refreshMembers = useCallback(async () => {
    if (!roomId) return
    const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_MS).toISOString()
    const { data } = await (supabase.from('room_members') as any)
      .select('user_id, display_name, last_seen_at')
      .eq('room_id', roomId)
      .gte('last_seen_at', cutoff)
    if (data) setMembers(data as CollabMember[])
  }, [roomId])

  // ── Connexion temps réel : Supabase Realtime remplace le sondage SSE.
  // room_members reste la source de vérité commune avec le client VS Code
  // (qui met à jour last_seen_at via son propre heartbeat) — Realtime nous
  // notifie juste instantanément au lieu de re-sonder toutes les 5s.
  useEffect(() => {
    if (!joined || !roomId || !user) return

    ;(async () => {
      const { data: msgs } = await (supabase.from('collab_messages') as any)
        .select('id, sender_id, sender_name, role, content, model_id, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(200)
      if (msgs) setMessages(msgs as CollabMessage[])
      await refreshMembers()

      if (authToken) {
        const res = await fetch(`/api/collab/rooms/${roomId}/annotations`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }).catch(() => null)
        const data = await res?.json().catch(() => null)
        if (data?.annotations) setAnnotations(data.annotations as Annotation[])
      }
    })()

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'collab_messages', filter: `room_id=eq.${roomId}` },
        (payload: { new: CollabMessage }) => {
          const msg = payload.new
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        () => { void refreshMembers() },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'collab_annotations', filter: `room_id=eq.${roomId}` },
        (payload: { new: Annotation }) => {
          const a = payload.new
          setAnnotations(prev => (prev.some(x => x.id === a.id) ? prev : [...prev, a]))
        },
      )
      .subscribe((status: string) => setConnected(status === 'SUBSCRIBED'))

    return () => { void supabase.removeChannel(channel) }
  }, [joined, roomId, user, authToken, refreshMembers])

  // ── Heartbeat : signale qu'on est toujours actif (comme le fait déjà
  // l'extension VS Code côté client desktop) — sans ça, un participant qui
  // rejoint depuis le web disparaissait de la liste "en ligne" au bout de 30s.
  // Inutile (et trompeur) sur un salon fermé consulté en lecture seule.
  useEffect(() => {
    if (!joined || !roomId || !authToken || !roomActive) return

    const beat = () => {
      fetch(`/api/collab/rooms/${roomId}/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {})
    }
    beat()
    const t = setInterval(beat, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(t)
  }, [joined, roomId, authToken, roomActive])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Join ──
  const handleJoin = async () => {
    if (!displayName.trim() || !authToken) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(`/api/collab/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ inviteToken, displayName: displayName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur de connexion')
      setRoomName(data.room.name)
      setJoined(true)
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setJoining(false)
    }
  }

  // ── Send ──
  const handleSend = async () => {
    if (!input.trim() || sending || !authToken) return
    const content = input.trim()
    setInput('')
    setSending(true)
    try {
      await fetch(`/api/collab/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content, role: 'user', senderName: displayName }),
      })
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  const handleAddAnnotation = async (messageId: string, content: string) => {
    if (!authToken) return
    const res = await fetch(`/api/collab/rooms/${roomId}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ messageId, content, authorName: displayName }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.annotation) {
      setAnnotations(prev => (prev.some(a => a.id === data.annotation.id) ? prev : [...prev, data.annotation]))
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Loading auth ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-muted flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/30 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Not logged in ──
  if (!user) {
    const returnUrl = encodeURIComponent(`/collab/${roomId}?token=${inviteToken}`)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-muted flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 w-full max-w-md text-center">
          <NexoraLogo />
          <h1 className="font-bold text-slate-900 text-lg mt-4 mb-2">Connexion requise</h1>
          <p className="text-slate-500 text-sm mb-6">
            Tu dois être connecté à Nexora pour rejoindre cette session de collaboration.
          </p>
          <button
            onClick={() => router.push(`/auth/login?return=${returnUrl}`)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
          <p className="text-xs text-slate-400 mt-4">
            Pas encore de compte ?{' '}
            <a href={`/auth/register?return=${returnUrl}`} className="text-foreground/80 hover:underline">
              Créer un compte
            </a>
          </p>
        </div>
      </div>
    )
  }

  // ── Vérification d'appartenance en cours ──
  if (checkingMembership) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-muted flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/30 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Join screen ──
  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-muted flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <NexoraLogo />
            <div>
              <h1 className="font-bold text-slate-900 text-lg">Nexora Collaboration</h1>
              <p className="text-slate-400 text-sm">Session partagée en temps réel</p>
            </div>
          </div>

          {inviteToken ? (
            <>
              <p className="text-sm text-slate-600 mb-5">
                Tu as été invité à rejoindre une session de collaboration. Confirme ton prénom pour continuer.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Ton prénom ou pseudo"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleJoin()}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
                  autoFocus
                />
                {joinError && <p className="text-red-500 text-sm px-1">{joinError}</p>}
                <button
                  onClick={() => void handleJoin()}
                  disabled={!displayName.trim() || joining}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? 'Connexion…' : 'Rejoindre la session'}
                </button>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 mb-2">Tu préfères utiliser VS Code ?</p>
                <a
                  href={`vscode://nexora/collab?room=${roomId}&token=${inviteToken}`}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ouvrir dans VS Code + Nexora
                </a>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">Lien d'invitation invalide ou expiré.</p>
          )}
        </div>
      </div>
    )
  }

  // ── Session screen ──
  const vscodeLink = `vscode://nexora/collab?room=${roomId}&token=${inviteToken}`

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <NexoraLogo />
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-900 text-sm truncate">{roomName}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {roomActive ? (
              <>
                {connected
                  ? <Wifi className="w-3 h-3 text-emerald-500" />
                  : <WifiOff className="w-3 h-3 text-slate-300 animate-pulse" />}
                <span className={`text-xs ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {connected ? 'Connecté' : 'Reconnexion…'}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400">Session fermée · lecture seule</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Users className="w-4 h-4" />
          <span className="text-xs font-medium">{members.length}</span>
        </div>
        <button
          onClick={copyLink}
          title="Copier le lien d'invitation"
          className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden max-h-[calc(100vh-60px)]">
        {/* Members sidebar */}
        <aside className="hidden md:flex flex-col w-44 border-r border-slate-100 bg-white overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-slate-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">En ligne</p>
          </div>
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-2 px-3 py-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.user_id === user.id ? 'bg-foreground' : 'bg-emerald-400'}`} />
              <span className="text-xs text-slate-700 truncate">
                {m.display_name}{m.user_id === user.id ? ' (vous)' : ''}
              </span>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-3">Aucun membre en ligne</p>
          )}
          <div className="mt-auto border-t border-slate-100 p-3">
            <a href={vscodeLink} className="flex items-center gap-1.5 text-xs text-foreground/80 hover:text-foreground font-medium">
              <ExternalLink className="w-3 h-3" />
              Ouvrir dans VS Code
            </a>
          </div>
        </aside>

        {/* Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3 opacity-30">
                    <span className="text-white font-bold text-lg">N</span>
                  </div>
                  <p className="text-slate-400 text-sm">Aucun message pour l'instant.</p>
                  <p className="text-slate-300 text-xs mt-1">Les messages de la session VS Code apparaîtront ici.</p>
                </div>
              </div>
            )}
            {messages.map(msg => (
              msg.role === 'agent_status'
                ? <AgentActivityLine key={msg.id} msg={msg} />
                : (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    myUserId={user.id}
                    roomActive={roomActive}
                    annotations={annotations.filter(a => a.message_id === msg.id)}
                    onAddAnnotation={(content) => handleAddAnnotation(msg.id, content)}
                  />
                )
            ))}
            <div ref={bottomRef} />
          </div>

          {roomActive ? (
            <div className="border-t border-slate-100 bg-white px-4 py-3">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
                  }}
                  placeholder="Message… (Entrée pour envoyer)"
                  rows={1}
                  className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30 max-h-32 leading-relaxed"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 px-1">
                Les réponses IA s'affichent en temps réel depuis VS Code
              </p>
            </div>
          ) : (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs text-slate-400">
                Cette session est fermée — consultation en lecture seule uniquement
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
