import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Agent mode — Quick start | Nexora Docs',
  description: 'Hand whole development tasks to the AI with Nexora Agent mode',
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

export default function AgentQuickStartPage() {
  return (
    <article className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Agent mode</span>
        <span>/</span>
        <span className="text-foreground">Quick start</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Agent mode — Quick start</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Agent mode lets the AI work through a task on its own: reading your files, creating or editing several of them, running commands, and asking for your approval before anything sensitive.
      </p>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-5">Turning it on</h2>

      <Step n={1} title="Select Agent mode">
        <p>
          At the bottom of the chat panel, next to the input box, click the mode selector and choose <strong className="text-foreground">Agent</strong>. It is the default mode when Nexora opens.
        </p>
        <p className="mt-2">
          The other two modes: <strong className="text-foreground">Chat</strong> (plain conversation, no action on your files) and <strong className="text-foreground">Plan</strong> (the AI thinks it through and proposes a course of action without carrying it out yet).
        </p>
      </Step>

      <Step n={2} title="Describe the task">
        <p>
          Give it a goal rather than a list of precise instructions — &ldquo;add pagination to the user list&rdquo;, &ldquo;fix the login bug reported in issue #42&rdquo;. The agent explores your code, plans the steps and carries them out.
        </p>
      </Step>

      <Step n={3} title="Follow the progress">
        <p>
          For a multi-step task, a task list appears above the input box and updates as work proceeds. Every file change is shown with a preview of the added and removed lines, and the model&rsquo;s reasoning is available by expanding the &ldquo;Thinking&rdquo; banner.
        </p>
      </Step>

      <Step n={4} title="Approve sensitive actions">
        <p>
          Creating a file or running a terminal command always triggers a permission request, shown just above the input box:
        </p>
        <div className="mt-3 space-y-1.5">
          {[
            ['Allow', 'Approves this one action, once'],
            ['Always allow', 'Approves this kind of action for the rest of the session, without asking again'],
            ['Reject', 'Declines and lets the agent propose something else'],
          ].map(([action, desc]) => (
            <div key={action} className="flex items-start gap-3 text-sm">
              <span className="w-28 font-medium text-foreground/80 shrink-0">{action}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <Callout type="tip">
          Reading files and searching your code never needs permission — only actions that change something (files, terminal) ask for it.
        </Callout>
      </Step>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-5">Choosing the model</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        The model you pick at the top of the chat applies to Agent mode too — see the <Link href="/docs/chat/quick-start" className="text-foreground/70 hover:underline">chat quick start</Link> for what each plan includes.
      </p>

      <Callout type="warning">
        Agent mode can use more credits than a plain chat, because every file read, search and action is part of the exchange with the model. Your usage stays visible in your <a href="/dashboard" className="underline underline-offset-2">dashboard</a>.
      </Callout>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <Link href="/docs/autocomplete/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          ← Autocomplete
        </Link>
        <Link href="/docs/edit/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          Inline edit →
        </Link>
      </div>
    </article>
  )
}
