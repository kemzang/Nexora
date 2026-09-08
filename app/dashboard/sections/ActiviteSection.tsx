'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Radio, LogIn, MessageCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

type ActivityEvent =
  | { kind: 'join'; id: string; roomId: string; roomName: string; actorName: string; at: string }
  | { kind: 'message'; id: string; roomId: string; roomName: string; actorName: string; role: string; content: string; at: string }

const FEED_LIMIT = 25

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

export default function ActiviteSection() {
  const { user } = useAuth()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async (userId: string) => {
    const { data: memberships } = await (supabase.from('room_members') as any)
      .select('room_id')
      .eq('user_id', userId)
    const roomIds = ((memberships as { room_id: string }[]) || []).map((m) => m.room_id)
    if (roomIds.length === 0) {
      setEvents([])
      setLoading(false)
      return
    }

    const { data: rooms } = await (supabase.from('collaboration_rooms') as any)
      .select('id, name')
      .in('id', roomIds)
    const roomNames = new Map(((rooms as { id: string; name: string }[]) || []).map((r) => [r.id, r.name]))

    const [{ data: joins }, { data: messages }] = await Promise.all([
      (supabase.from('room_members') as any)
        .select('id, room_id, display_name, joined_at')
        .in('room_id', roomIds)
        .order('joined_at', { ascending: false })
        .limit(FEED_LIMIT),
      (supabase.from('collab_messages') as any)
        .select('id, room_id, sender_name, role, content, created_at')
        .in('room_id', roomIds)
        .in('role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(FEED_LIMIT),
    ])

    const joinEvents: ActivityEvent[] = ((joins as any[]) || []).map((j) => ({
      kind: 'join',
      id: `join-${j.id}`,
      roomId: j.room_id,
      roomName: roomNames.get(j.room_id) ?? 'Session Nexora',
      actorName: j.display_name,
      at: j.joined_at,
    }))

    const messageEvents: ActivityEvent[] = ((messages as any[]) || []).map((m) => ({
      kind: 'message',
      id: `msg-${m.id}`,
      roomId: m.room_id,
      roomName: roomNames.get(m.room_id) ?? 'Session Nexora',
      actorName: m.sender_name,
      role: m.role,
      content: m.content,
      at: m.created_at,
    }))

    const merged = [...joinEvents, ...messageEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, FEED_LIMIT)

    setEvents(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetchActivity(user.id)

    const channel = supabase
      .channel(`dashboard-activity:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'collab_messages' },
        () => { if (user.id) void fetchActivity(user.id) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_members' },
        () => { if (user.id) void fetchActivity(user.id) })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [user?.id, fetchActivity])

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activité</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ce qui se passe en ce moment dans vos sessions de collaboration
        </p>
      </div>

      <Card className="glass">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Radio className="w-4 h-4 text-foreground/70" />
            Fil d'activité
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-foreground/70" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Aucune activité pour l'instant — rejoignez ou créez une session de collaboration
            </p>
          ) : (
            <div className="space-y-1">
              {events.map((e) => (
                <a
                  key={e.id}
                  href={`/collab/${e.roomId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-card/40 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {e.kind === 'join'
                      ? <LogIn className="w-3.5 h-3.5 text-foreground/60" />
                      : <MessageCircle className="w-3.5 h-3.5 text-foreground/60" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/90">
                      {e.kind === 'join' ? (
                        <><span className="font-medium">{e.actorName}</span> a rejoint <span className="font-medium">{e.roomName}</span></>
                      ) : (
                        <><span className="font-medium">{e.role === 'assistant' ? 'IA' : e.actorName}</span> dans <span className="font-medium">{e.roomName}</span></>
                      )}
                    </p>
                    {e.kind === 'message' && (
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{e.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground/50 mt-0.5">{timeAgo(e.at)}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
