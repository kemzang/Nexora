import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Code2, AppWindow, Terminal, MessageSquare, Sparkles as SparklesIcon,
  Bot, PenLine, BookOpen, ArrowRight, ExternalLink, CreditCard, ScrollText,
} from 'lucide-react'
import { MODELS } from '@/lib/models'

export const metadata: Metadata = {
  title: 'Documentation — Nexora',
  description: 'Install Nexora in VS Code, IntelliJ or the command line, and discover AI chat, autocomplete and Agent mode.',
}

const GITHUB_URL = 'https://github.com/kemzang-Bryan/Nexora'

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-white/[0.04] border border-border/60 rounded-xl p-3.5 overflow-x-auto text-xs font-mono text-foreground/90 my-3">
      <code>{code}</code>
    </pre>
  )
}

function InstallCard({
  icon: Icon, title, desc, steps, code, codeNote,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  steps?: string[]
  code?: string
  codeNote?: string
}) {
  return (
    <div className="p-5 rounded-xl bg-white/[0.03] border border-border/50 flex flex-col h-full">
      <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-foreground/70" />
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
      {steps && (
        <ol className="text-xs text-muted-foreground space-y-1.5 mb-1 list-decimal list-inside">
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {code && (
        <>
          <CodeBlock code={code} />
          {codeNote && <p className="text-xs text-muted-foreground/70 -mt-2 mb-1">{codeNote}</p>}
        </>
      )}
      <div className="flex-1" />
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-foreground/70 hover:text-foreground transition-colors mt-3"
      >
        Source code <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}

function FeatureDocCard({
  icon: Icon, title, desc, href, badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  href?: string
  badge?: string
}) {
  const content = (
    <div className="p-5 rounded-xl bg-white/[0.03] border border-border/50 h-full transition-colors hover:bg-white/[0.045] hover:border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
          <Icon className="w-4 h-4 text-foreground/70" />
        </div>
        {badge && (
          <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground/80 px-2 py-0.5 rounded-full border border-border/60">{badge}</span>
        )}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{desc}</p>
      {href && (
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground/70 font-medium">
          Quick start <ArrowRight className="w-3 h-3" />
        </span>
      )}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function DocsIndexPage() {
  const models = Object.values(MODELS).sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-3">Nexora documentation</h1>
      <p className="text-muted-foreground text-base mb-10 leading-relaxed max-w-2xl">
        Everything you need to install Nexora, connect your account and use AI chat,
        autocomplete and Agent mode — in your IDE or from the command line.
      </p>

      {/* Getting started */}
      <h2 className="text-xl font-bold mb-1">Quick start</h2>
      <p className="text-sm text-muted-foreground mb-5">Pick your environment to install Nexora.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <InstallCard
          icon={Code2}
          title="VS Code"
          desc="The official Nexora extension for Visual Studio Code."
          steps={[
            'Open the Extensions tab (Ctrl+Shift+X)',
            'Search for “Nexora AI”',
            'Click Install, then reload VS Code if prompted',
          ]}
        />
        <InstallCard
          icon={AppWindow}
          title="IntelliJ / JetBrains"
          desc="The Nexora plugin for IntelliJ IDEA, WebStorm, PyCharm and other JetBrains IDEs."
          steps={[
            'Open Settings → Plugins → Marketplace',
            'Search for “Nexora”',
            'Install, then restart the IDE',
          ]}
        />
        <InstallCard
          icon={Terminal}
          title="CLI"
          desc="The Nexora agent on the command line — handy for scripts, CI/CD or headless use."
          code={`curl -fsSL https://raw.githubusercontent.com/kemzang-Bryan/Nexora/main/extensions/cli/scripts/install.sh | bash`}
          codeNote="macOS / Linux — or npm i -g @nexoracoding/cli (Node.js 20+)"
        />
      </div>

      <div className="border rounded-xl px-4 py-3 text-sm mb-10 leading-relaxed bg-sky-500/10 border-sky-500/25 text-sky-300">
        <span className="mr-2">ℹ️</span>
        Once installed, connect your account: run the <code className="px-1 py-0.5 bg-white/[0.08] rounded text-xs font-mono">Nexora: Login</code> command
        from the VS Code / IntelliJ command palette, or <code className="px-1 py-0.5 bg-white/[0.08] rounded text-xs font-mono">nexora login</code> for the CLI.
        You will be redirected to your browser to authenticate.
      </div>

      <div className="h-px bg-border/50 mb-10" />

      {/* Features */}
      <h2 className="text-xl font-bold mb-1">Features</h2>
      <p className="text-sm text-muted-foreground mb-5">The four ways to work with the AI at the heart of Nexora.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <FeatureDocCard
          icon={MessageSquare}
          title="Chat"
          desc="Talk to the AI straight from your editor to ask questions, review code or explore solutions."
          href="/docs/chat/quick-start"
        />
        <FeatureDocCard
          icon={SparklesIcon}
          title="Autocomplete"
          desc="Get real-time code suggestions as you type, using Fill-In-the-Middle."
          href="/docs/autocomplete/quick-start"
          badge="Starter+"
        />
        <FeatureDocCard
          icon={Bot}
          title="Agent mode"
          desc="Hand whole development tasks to the AI: creating files, running commands, editing across multiple files."
          href="/docs/agent/quick-start"
        />
        <FeatureDocCard
          icon={PenLine}
          title="Inline edit"
          desc="Rewrite a code selection in place, in your current file, from plain-language instructions."
          href="/docs/edit/quick-start"
        />
      </div>

      <div className="h-px bg-border/50 mb-10" />

      {/* Guides */}
      <h2 className="text-xl font-bold mb-1">Guides</h2>
      <p className="text-sm text-muted-foreground mb-5">Go further with configuring Nexora.</p>
      <Link
        href="/docs/guides/codebase-documentation-awareness"
        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-border/50 hover:bg-white/[0.045] hover:border-border transition-colors mb-10"
      >
        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Project documentation</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">How Nexora reads your README, your configuration and your AGENTS.md / CLAUDE.md files to tailor its suggestions to your codebase.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </Link>

      <div className="h-px bg-border/50 mb-10" />

      {/* Models */}
      <h2 className="text-xl font-bold mb-1">Available AI models</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Nexora routes each request to the model that best fits the task's complexity and your plan.
        See <Link href="/pricing" className="text-foreground/70 hover:underline">which models each plan includes</Link>.
      </p>
      <div className="rounded-xl border border-border/50 overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Model</th>
              <th className="px-4 py-2.5 font-medium">Provider</th>
              <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Context</th>
              <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Vision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {models.map(m => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{m.provider}</td>
                <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.contextWindow >= 1_000_000 ? `${m.contextWindow / 1_000_000}M` : `${(m.contextWindow / 1000).toFixed(0)}K`} tokens</td>
                <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.supportsVision ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-px bg-border/50 mb-10" />

      {/* Resources */}
      <h2 className="text-xl font-bold mb-5">Resources</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/pricing" className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50 hover:bg-white/[0.045] hover:border-border transition-colors">
          <CreditCard className="w-4 h-4 text-foreground/70 shrink-0" />
          <span className="text-sm font-medium">Pricing & plans</span>
        </Link>
        <Link href="/changelog" className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50 hover:bg-white/[0.045] hover:border-border transition-colors">
          <ScrollText className="w-4 h-4 text-foreground/70 shrink-0" />
          <span className="text-sm font-medium">Changelog</span>
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50 hover:bg-white/[0.045] hover:border-border transition-colors">
          <ExternalLink className="w-4 h-4 text-foreground/70 shrink-0" />
          <span className="text-sm font-medium">Source code (GitHub)</span>
        </a>
      </div>
    </article>
  )
}
