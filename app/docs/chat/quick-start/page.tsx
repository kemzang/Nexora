import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Chat — Quick start | Nexora Docs',
  description: 'Learn how to use Nexora AI chat in VS Code',
}

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-white/[0.04] border border-border/60 rounded-xl p-4 overflow-x-auto text-sm font-mono text-foreground/90 my-4">
      <code>{code}</code>
    </pre>
  )
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

export default function ChatQuickStartPage() {
  return (
    <article className="prose-custom max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Chat</span>
        <span>/</span>
        <span className="text-foreground">Quick start</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">AI chat — Quick start</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Nexora's chat lets you talk to the best AI models (DeepSeek, Gemini, Claude) straight from VS Code, without leaving your editor.
      </p>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-5">Requirements</h2>
      <ul className="space-y-2 text-sm text-muted-foreground mb-8">
        <li className="flex items-start gap-2"><span className="text-foreground/70 mt-0.5">•</span>The Nexora extension installed in VS Code</li>
        <li className="flex items-start gap-2"><span className="text-foreground/70 mt-0.5">•</span>A Nexora account, created and verified at <a href="https://nexoracoding.com" className="text-foreground/70 hover:underline">nexoracoding.com</a></li>
        <li className="flex items-start gap-2"><span className="text-foreground/70 mt-0.5">•</span>The extension connected to your account (token configured)</li>
      </ul>

      <h2 className="text-xl font-bold mb-5">Usage</h2>

      <Step n={1} title="Open Nexora chat">
        <p>Open the command palette with <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs text-foreground font-mono">Ctrl+Shift+P</kbd> (ou <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs text-foreground font-mono">Cmd+Shift+P</kbd> on Mac), then type:</p>
        <CodeBlock code="Nexora: Open Chat" />
        <p>You can also use the direct shortcut: <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs text-foreground font-mono">Ctrl+Shift+N</kbd></p>
      </Step>

      <Step n={2} title="Pick a model">
        <p>
          At the top of the chat panel, click the model selector. Which models you can pick depends on your plan:
        </p>
        <div className="mt-3 space-y-1.5">
          {[
            { plan: 'Free',       models: 'DeepSeek Flash, Gemini Flash, Claude Haiku 5.5', color: 'text-muted-foreground' },
            { plan: 'Starter',    models: '+ Claude Sonnet 5.5, Gemini 3.1 Pro', color: 'text-sky-400' },
            { plan: 'Pro',        models: '+ Claude Opus 5.5', color: 'text-amber-400' },
            { plan: 'Business',   models: 'All models, no limits', color: 'text-emerald-400' },
            { plan: 'Enterprise', models: 'All models + team mode', color: 'text-foreground/70' },
          ].map(row => (
            <div key={row.plan} className="flex items-center gap-3 text-sm">
              <span className={`w-20 font-medium ${row.color}`}>{row.plan}</span>
              <span className="text-muted-foreground">{row.models}</span>
            </div>
          ))}
        </div>
      </Step>

      <Step n={3} title="Send your first request">
        <p>Type your message in the input box and press <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs text-foreground font-mono">Enter</kbd>.</p>
        <Callout type="tip">
          Select code in the editor before opening the chat: Nexora adds that context to your message automatically.
        </Callout>
      </Step>

      <Step n={4} title="Use the current file as context">
        <p>Nexora can read the file you have open. In the chat, type <code className="px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono text-foreground/70">@file</code> to reference the active file, or <code className="px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono text-foreground/70">@selection</code> for the current selection.</p>
      </Step>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-5">Keyboard shortcuts</h2>
      <div className="rounded-xl border border-border/60 overflow-hidden text-sm">
        <div className="bg-white/[0.03] px-4 py-2.5 grid grid-cols-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          <span>Action</span>
          <span>Shortcut</span>
        </div>
        {[
          ['Open chat', 'Ctrl+Shift+N'],
          ['Send message', 'Enter'],
          ['New line', 'Shift+Enter'],
          ['Clear conversation', 'Ctrl+L'],
          ['Stop generating', 'Esc'],
        ].map(([action, key]) => (
          <div key={action} className="px-4 py-3 grid grid-cols-2 border-t border-border/40">
            <span className="text-muted-foreground">{action}</span>
            <kbd className="text-xs font-mono text-foreground/80">{key}</kbd>
          </div>
        ))}
      </div>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-4">Automatic model selection</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        The model you pick at the top of the chat is always the one used, as long as your plan includes it — Nexora never swaps it on its own. Automatic complexity analysis only kicks in when you haven't made an explicit choice, or when the selected model is no longer part of your plan (it then falls back to the best model available to you).
      </p>

      <Callout type="info">
        Token usage is visible in your <a href="/dashboard" className="underline underline-offset-2">dashboard</a>, under Usage.
      </Callout>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Next page</span>
        <Link href="/docs/autocomplete/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          Autocomplete →
        </Link>
      </div>
    </article>
  )
}
