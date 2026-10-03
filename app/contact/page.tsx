import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, LifeBuoy, GitBranch, Clock, BookOpen, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionLayout } from '@/components/patterns/section-layout'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

export const metadata: Metadata = {
  title: 'Contact — Nexora',
  description: 'Contact the Nexora team with a general question or a technical issue.',
}

const GITHUB_ISSUES_URL = 'https://github.com/kemzang-Bryan/Nexora/issues'

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'Technical support',
    desc: 'A bug, a connection problem, a question about your extension or your CLI.',
    action: 'support@nexoracoding.com',
    href: 'mailto:support@nexoracoding.com',
  },
  {
    icon: Mail,
    title: 'General enquiries',
    desc: 'General questions, billing, partnerships, or any other request.',
    action: 'contact@nexoracoding.com',
    href: 'mailto:contact@nexoracoding.com',
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative pt-40 pb-16 overflow-hidden">
        <div className="orb orb-float-2 w-[600px] h-[600px] bg-foreground/[0.03] top-[-10%] right-[-10%]" />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Badge variant="primary" className="mb-5">
            <Mail className="w-3 h-3" />
            Contact
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
            Let's talk
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Write to us directly &mdash; we reply within 24 hours on weekdays.
          </p>
        </div>
      </section>

      <SectionLayout background="default" className="pt-0 sm:pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-10">
          {CHANNELS.map(c => (
            <a key={c.title} href={c.href}>
              <GlassCard variant="hover" className="h-full p-6">
                <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-foreground/70" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{c.desc}</p>
                <span className="text-sm font-medium text-foreground/80">{c.action}</span>
              </GlassCard>
            </a>
          ))}
        </div>

        <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground/70 mb-14">
          <Clock className="w-3.5 h-3.5" />
          Reply within 24 hours, Monday to Friday.
        </div>

        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/docs"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50 hover:bg-white/[0.045] hover:border-border transition-colors"
          >
            <BookOpen className="w-4 h-4 text-foreground/70 shrink-0" />
            <div>
              <p className="text-sm font-medium">Read the documentation</p>
              <p className="text-xs text-muted-foreground">Installation, guides and product FAQ</p>
            </div>
          </Link>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50 hover:bg-white/[0.045] hover:border-border transition-colors"
          >
            <GitBranch className="w-4 h-4 text-foreground/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium flex items-center gap-1.5">Report a bug on GitHub <ExternalLink className="w-3 h-3 opacity-60" /></p>
              <p className="text-xs text-muted-foreground">For detailed technical bug reports</p>
            </div>
          </a>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Already a Nexora customer? You can also find contextual help from your{' '}
          <Link href="/dashboard" className="text-foreground/80 hover:text-foreground underline underline-offset-4">dashboard</Link>.
        </p>
      </SectionLayout>

      <SiteFooter />
    </div>
  )
}
