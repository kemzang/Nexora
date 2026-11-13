import type { Metadata } from 'next'
import Link from 'next/link'
import { Brain, ShieldCheck, Lock, Gauge, ArrowRight, Rocket, Code2, AppWindow, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionLayout } from '@/components/patterns/section-layout'
import { PageHeader } from '@/components/patterns/page-header'
import { FeatureCard } from '@/components/patterns/feature-card'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

export const metadata: Metadata = {
  title: 'About — Nexora',
  description: 'Nexora\'s mission: put the best AI models within reach, right inside your code editor.',
}

const VALUES = [
  {
    icon: Brain,
    title: 'Smart routing',
    desc: 'Every request is sized up before it is sent, and goes to the model that fits it. A simple question does not burn credits on an expensive model.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe by default',
    desc: 'Agent mode asks before anything irreversible. A permission layer catches destructive commands — deleting files, sending data out — and stops them.',
  },
  {
    icon: Lock,
    title: 'Privacy',
    desc: 'No advertising cookies, no third-party trackers sold on. Everything you send is encrypted in transit.',
  },
  {
    icon: Gauge,
    title: 'Pricing that follows you',
    desc: 'A free tier large enough to form a real opinion, and you can move up or down whenever your needs change.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative pt-40 pb-16 overflow-hidden">
        <div className="orb orb-float-1 w-[600px] h-[600px] bg-foreground/[0.03] top-[-10%] left-[-10%]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Badge variant="primary" className="mb-5">
            <Brain className="w-3 h-3" />
            About
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 text-balance">
            AI where you already work
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nexora started from a plain observation: the best AI models sit behind separate providers, each
            with its own subscription and its own interface. Nexora brings them together in one tool, inside the
            editor you already use.
          </p>
        </div>
      </section>

      <SectionLayout background="default" className="pt-0 sm:pt-0">
        <div className="max-w-2xl mx-auto text-center mb-4">
          <p className="text-muted-foreground leading-relaxed">
            In practice, Nexora is an extension for VS Code and the JetBrains IDEs, plus a command-line
            interface. It gives you models like DeepSeek, Gemini and Claude through a built-in chat, real-time
            autocomplete, an Agent mode that carries out development tasks, and inline editing driven by plain
            instructions.
          </p>
        </div>
      </SectionLayout>

      <SectionLayout background="muted">
        <PageHeader badge="What we hold to" title="How the product is built" subtitle="Four commitments you can see in how Nexora behaves day to day." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {VALUES.map(v => (
            <FeatureCard key={v.title} icon={v.icon} title={v.title} description={v.desc} />
          ))}
        </div>
      </SectionLayout>

      <SectionLayout background="default">
        <PageHeader badge="Wherever you code" title="Available in the editor you use" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-4">
          {[
            { icon: Code2, label: 'VS Code' },
            { icon: AppWindow, label: 'IntelliJ / JetBrains' },
            { icon: Terminal, label: 'CLI' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/50">
              <item.icon className="w-4.5 h-4.5 text-foreground/70 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto">
          Step-by-step install instructions are in the <Link href="/docs" className="text-foreground/80 hover:text-foreground underline underline-offset-4">documentation</Link>.
        </p>
      </SectionLayout>

      <SectionLayout background="default">
        <div className="max-w-3xl mx-auto">
          <GlassCard variant="default" className="border-animated overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
            <div className="py-16 px-8 sm:px-16 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl">
                  <Rocket className="w-7 h-7 text-primary-foreground relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">A question about Nexora?</h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                You reach a person directly — no endless form, no phone tree.
              </p>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="px-10 h-12 text-base group">
                  Get in touch
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
          </GlassCard>
        </div>
      </SectionLayout>

      <SiteFooter />
    </div>
  )
}
