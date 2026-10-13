import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Autocomplete — Quick start | Nexora Docs',
  description: 'Set up Nexora smart autocomplete in VS Code',
}

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
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

export default function AutocompleteQuickStartPage() {
  return (
    <article className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Autocomplete</span>
        <span>/</span>
        <span className="text-foreground">Quick start</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Autocomplete — Quick start</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Nexora autocomplete uses DeepSeek Flash in FIM (Fill-In-the-Middle) mode to suggest contextual code in real time. It runs automatically as you type, and is available from the <strong className="text-sky-400">Starter</strong> plan up.
      </p>

      <Callout type="warning">
        Autocomplete requires the <strong>Starter plan or above</strong>. On the Free plan, only chat is available.
      </Callout>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-5">Turning it on</h2>

      <Step n={1} title="Check you are on Starter or above">
        <p>
          Check your plan in the <a href="/dashboard" className="text-foreground/70 hover:underline">dashboard</a> → Subscription. If you are on Free, <a href="/checkout?plan=starter" className="text-foreground/70 hover:underline">upgrade to Starter</a>.
        </p>
      </Step>

      <Step n={2} title="Enable it in the VS Code settings">
        <p>Open the VS Code settings (<kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs font-mono">Ctrl+,</kbd>) et recherchez <code className="px-1 py-0.5 bg-white/[0.06] rounded text-xs font-mono text-foreground/70">nexora</code>. Turn on:</p>
        <CodeBlock lang="json" code={`{
  "nexora.autocomplete.enabled": true,
  "nexora.autocomplete.triggerDelay": 300,
  "nexora.autocomplete.maxTokens": 128
}`} />
      </Step>

      <Step n={3} title="Choose the target languages">
        <p>By default Nexora autocompletes in every language. You can narrow that down:</p>
        <CodeBlock lang="json" code={`{
  "nexora.autocomplete.languages": [
    "typescript",
    "javascript",
    "python",
    "rust",
    "go"
  ]
}`} />
      </Step>

      <Step n={4} title="Work with the suggestions">
        <p>Start typing — a greyed-out suggestion appears after the cursor. To accept it:</p>
        <div className="mt-3 space-y-2">
          {[
            ['Accept the whole suggestion', 'Tab'],
            ['Accept word by word', 'Ctrl+→'],
            ['Dismiss the suggestion', 'Esc'],
            ['Force a suggestion', 'Alt+\\'],
          ].map(([action, key]) => (
            <div key={action} className="flex items-center gap-3">
              <kbd className="px-2 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs font-mono text-foreground min-w-fit">{key}</kbd>
              <span className="text-muted-foreground">{action}</span>
            </div>
          ))}
        </div>
      </Step>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-5">How it works</h2>

      <div className="space-y-4 mb-8">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-border/50">
          <h3 className="text-sm font-semibold mb-1">Mode FIM (Fill-In-the-Middle)</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The extension sends the text <em>before</em> and <em>after</em> your cursor to DeepSeek. The model fills in the missing middle, which gives far more accurate completions than simply predicting what comes next.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-border/50">
          <h3 className="text-sm font-semibold mb-1">File context</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Nexora reads the imports, types and functions already defined in the current file so its suggestions fit your codebase.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-border/50">
          <h3 className="text-sm font-semibold mb-1">Token usage</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each suggestion costs between 50 and 300 tokens depending on complexity. The trigger delay (<code className="text-foreground/70 font-mono text-xs">triggerDelay</code>) cuts down on wasted requests.
          </p>
        </div>
      </div>

      <Callout type="tip">
        Raise <code className="font-mono text-xs">triggerDelay</code> to 500ms or more if suggestions fire too often and burn through your credits.
      </Callout>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-4">Turning it off temporarily</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Click the Nexora button in the VS Code status bar (bottom right) to toggle autocomplete on and off without touching the settings.
      </p>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <Link href="/docs/chat/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          ← Chat
        </Link>
        <Link href="/docs/agent/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          Agent mode →
        </Link>
      </div>
    </article>
  )
}
