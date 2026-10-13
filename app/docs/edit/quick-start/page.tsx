import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Inline edit — Quick start | Nexora Docs',
  description: 'Rewrite code in place from plain-language instructions with Nexora',
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-8">
      <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-foreground/70 text-sm font-bold">{n}</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-base mb-2">{title}</h3>
        <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Callout({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info:    'bg-sky-500/10 border-sky-500/25 text-sky-300',
    warning: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    tip:     'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  }
  const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡' }
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm mb-4 leading-relaxed ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>{children}
    </div>
  )
}

export default function EditQuickStartPage() {
  return (
    <article className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Inline edit</span>
        <span>/</span>
        <span className="text-foreground">Quick start</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Inline edit — Quick start</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Inline edit rewrites a code selection right inside your file, without opening the chat panel — handy for a rename, a fix or a small local rewrite.
      </p>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-5">Usage</h2>

      <Step n={1} title="Select the code to change">
        <p>
          Select the lines you care about in your editor. You can also start an edit with no selection: Nexora then uses the current line as its starting point.
        </p>
      </Step>

      <Step n={2} title="Open inline edit">
        <p>With the selection active, press:</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-3 text-sm">
            <kbd className="px-2 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs font-mono text-foreground min-w-fit">Ctrl+I</kbd>
            <span className="text-muted-foreground">Windows / Linux</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <kbd className="px-2 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs font-mono text-foreground min-w-fit">Cmd+I</kbd>
            <span className="text-muted-foreground">macOS</span>
          </div>
        </div>
        <p className="mt-2">An input field appears right in the editor, above the selected code.</p>
      </Step>

      <Step n={3} title="Describe the change">
        <p>
          Type the instruction in plain language — &ldquo;extract this logic into a function&rdquo;, &ldquo;add error handling&rdquo;, &ldquo;rename this variable to userCount&rdquo; — then confirm with <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs text-foreground font-mono">Enter</kbd>.
        </p>
      </Step>

      <Step n={4} title="Accept or reject the result">
        <p>
          The proposed code appears inline in the editor, highlighted (additions in green, removals in red). Use the buttons that appear to accept or reject — block by block when several changes are proposed, or all at once.
        </p>
        <Callout type="tip">
          Nothing touches your file until you accept: you can always dismiss the suggestion with no consequence.
        </Callout>
      </Step>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-4">Inline edit or Agent mode?</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Inline edit stays within one file and one exchange — ideal for a quick, targeted change. For a task that spans several files, runs commands, or needs to explore the project, use <Link href="/docs/agent/quick-start" className="text-foreground/70 hover:underline">Agent mode</Link> instead.
      </p>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <Link href="/docs/agent/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          ← Agent mode
        </Link>
        <Link href="/docs/guides/codebase-documentation-awareness" className="text-foreground/70 hover:text-foreground transition-colors">
          Guide: Project documentation →
        </Link>
      </div>
    </article>
  )
}
