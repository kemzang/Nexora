import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Project documentation — Guide | Nexora Docs',
  description: 'Set up Nexora documentation awareness to get suggestions that fit your codebase',
}

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-white/[0.04] border border-border/60 rounded-xl p-4 overflow-x-auto text-sm font-mono text-foreground/90 my-4">
      <code>{code}</code>
    </pre>
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

function FileTree({ items }: { items: string[] }) {
  return (
    <div className="bg-white/[0.04] border border-border/60 rounded-xl p-4 my-4 font-mono text-xs text-foreground/80 space-y-1">
      {items.map((item, i) => <div key={i}>{item}</div>)}
    </div>
  )
}

export default function CodebaseDocumentationAwarenessPage() {
  return (
    <article className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Guides</span>
        <span>/</span>
        <span className="text-foreground">Project documentation</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Guide: Project documentation</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Nexora can draw on your project documentation — README, comments, configuration files — to give suggestions that match your architecture and your conventions.
      </p>

      <Callout type="info">
        This works on every plan. The better structured your documentation, the sharper the suggestions.
      </Callout>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-4">How Nexora reads your project</h2>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        When a workspace opens, Nexora indexes the documentation files it detects. That index is passed to the models as system context, so they understand your project before you even ask a question.
      </p>

      <div className="space-y-3 mb-8">
        {[
          { icon: '📄', title: 'README.md', desc: 'Project description, install instructions, overall architecture.' },
          { icon: '⚙️', title: 'Config files', desc: 'package.json, tsconfig.json, pyproject.toml — to understand your dependencies and conventions.' },
          { icon: '💬', title: 'JSDoc comments / docstrings', desc: 'Nexora reads type annotations and function descriptions to enrich the context.' },
          { icon: '📁', title: 'AGENTS.md / CLAUDE.md', desc: 'When present, these files take priority and steer the AI with your own instructions.' },
        ].map(item => (
          <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50">
            <span className="text-lg shrink-0">{item.icon}</span>
            <div>
              <p className="text-sm font-semibold mb-0.5">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-4">Configuring documentation in VS Code</h2>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        You can choose which files Nexora reads from the extension settings:
      </p>

      <CodeBlock lang="json" code={`{
  "nexora.context.includeReadme": true,
  "nexora.context.includePackageJson": true,
  "nexora.context.extraFiles": [
    "ARCHITECTURE.md",
    "docs/conventions.md",
    "docs/api-reference.md"
  ],
  "nexora.context.maxFileSize": 50000
}`} />

      <Callout type="tip">
        Keep <code className="font-mono text-xs">maxFileSize</code> under 50,000 characters per file. Larger files are truncated automatically, which can cut out important information.
      </Callout>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-4">Recommended project structure</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        To get the most relevant suggestions, lay your documentation out like this:
      </p>

      <FileTree items={[
        'my-project/',
        '├── README.md              ← Overview, stack, quick start',
        '├── ARCHITECTURE.md        ← Architecture decisions, patterns in use',
        '├── docs/',
        '│   ├── conventions.md     ← Naming conventions, code style',
        '│   ├── api-reference.md   ← Endpoints, data types',
        '│   └── glossary.md        ← Domain-specific terms',
        '├── src/',
        '│   └── ...',
        '└── package.json',
      ]} />

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-4">Using @doc in the chat</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        In the chat panel you can reference a documentation file explicitly to pull it into your question:
      </p>

      <div className="space-y-3 mb-6">
        {[
          { cmd: '@doc README.md', desc: 'Adds your README as context for the question' },
          { cmd: '@doc ARCHITECTURE.md', desc: 'Adds your architecture file' },
          { cmd: '@doc docs/conventions.md', desc: 'Adds a documentation file of your own' },
        ].map(item => (
          <div key={item.cmd} className="flex items-start gap-3 text-sm">
            <code className="px-2 py-0.5 bg-white/[0.06] rounded text-xs font-mono text-foreground/70 shrink-0 mt-0.5">{item.cmd}</code>
            <span className="text-muted-foreground">{item.desc}</span>
          </div>
        ))}
      </div>

      <Callout type="tip">
        Combine <code className="font-mono text-xs">@doc</code> and <code className="font-mono text-xs">@file</code> for very targeted questions: <em>&ldquo;@doc conventions.md @file src/utils/parser.ts — does this file follow our conventions?&rdquo;</em>
      </Callout>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-4">A concrete example</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        With a README that states your stack and conventions, Nexora adapts its suggestions:
      </p>

      <div className="grid gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-border/50">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Without project documentation</p>
          <p className="text-xs text-foreground/70 italic">&ldquo;Write a function to parse a CSV&rdquo;</p>
          <p className="text-xs text-muted-foreground mt-2">→ A generic suggestion in plain JavaScript</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25">
          <p className="text-xs text-emerald-400 mb-2 uppercase tracking-wider font-semibold">With the README indexed (stack: TypeScript + zod)</p>
          <p className="text-xs text-foreground/70 italic">&ldquo;Write a function to parse a CSV&rdquo;</p>
          <p className="text-xs text-muted-foreground mt-2">→ A TypeScript suggestion with zod validation, strict types and error handling consistent with your codebase</p>
        </div>
      </div>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-4">The .nexoraignore file</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        To keep files out of the index (secrets, large files, generated folders):
      </p>

      <CodeBlock lang="text" code={`# .nexoraignore
node_modules/
dist/
.env*
*.min.js
coverage/
docs/internal/    # Confidential internal documentation`} />

      <Callout type="warning">
        Nexora never reads <code className="font-mono text-xs">.env</code> or <code className="font-mono text-xs">.env.*</code> files by default, even without a <code className="font-mono text-xs">.nexoraignore</code>.
      </Callout>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <Link href="/docs/autocomplete/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          ← Autocomplete
        </Link>
        <Link href="/docs" className="text-foreground/70 hover:text-foreground transition-colors">
          Docs home →
        </Link>
      </div>
    </article>
  )
}
