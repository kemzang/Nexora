'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, MessageSquare, Loader2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface SearchResult {
  messageId: string
  roomId: string
  roomName: string
  senderName: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  relevanceScore: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function highlightSnippet(content: string, query: string): string {
  if (content.length <= 220) return content
  const idx = content.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return content.slice(0, 220) + '…'
  const start = Math.max(0, idx - 80)
  const end = Math.min(content.length, idx + query.length + 140)
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '')
}

export default function HistoriqueSection() {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    const q = query.trim()
    if (q.length < 2 || !token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/collab/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur de recherche')
      setResults(data.results ?? [])
      setSearched(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recherchez dans tous vos échanges de collaboration passés, actifs ou fermés
        </p>
      </div>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                placeholder="Rechercher un message, un sujet, un mot-clé…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <button
              onClick={() => void handleSearch()}
              disabled={query.trim().length < 2 || loading}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-foreground/70" />
            Résultats
            {searched && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-foreground/70 text-xs font-medium">
                {results.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!searched ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Lancez une recherche pour retrouver un ancien échange
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Aucun résultat pour « {query} »
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <a
                  key={r.messageId}
                  href={`/collab/${r.roomId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 hover:border-border/60 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{r.roomName}</span>
                      <span className="text-xs text-muted-foreground/60">·</span>
                      <span className="text-xs text-muted-foreground/60 shrink-0">{r.senderName}</span>
                      {r.role === 'assistant' && (
                        <span className="badge-success shrink-0">IA</span>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {highlightSnippet(r.content, query)}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1.5">{formatDate(r.createdAt)}</p>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
