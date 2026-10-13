'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles, MessageSquare, ShieldCheck, LayoutPanelLeft, Mail, Cpu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionLayout } from '@/components/patterns/section-layout'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'

const CURRENT_ENTRIES = [
  {
    icon: Cpu,
    title: 'Claude 5.5 across every plan',
    desc: 'Claude Haiku, Sonnet and Opus move to their 5.5 generation, with a 1M-token context window. Haiku 5.5 is now the cheapest model in the catalogue, so it joins the Free plan and becomes the default — your credits last about four times longer than before.',
  },
  {
    icon: LayoutPanelLeft,
    title: 'New pages on the site',
    desc: 'Added Pricing, Documentation, Changelog, About and Contact pages, plus the legal pages (terms, privacy), so the offer and how the product works are easier to find.',
  },
  {
    icon: MessageSquare,
    title: 'Chat and interface improvements',
    desc: 'Ongoing refinements to the chat experience and to the general ergonomics of the site and the dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Stability fixes',
    desc: 'Fixes on the API side and in quota handling, for a more dependable day-to-day experience.',
  },
]

export default function ChangelogPageClient() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative pt-40 pb-16 overflow-hidden">
        <div className="orb orb-float-2 w-[600px] h-[600px] bg-foreground/[0.03] top-[-10%] right-[-10%]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="primary" className="mb-5">
              <Sparkles className="w-3 h-3" />
              Changelog
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
              Update log
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Nexora keeps evolving. This log highlights the most notable improvements —
              it is not meant to be an exhaustive history of every change.
            </p>
          </motion.div>
        </div>
      </section>

      <SectionLayout background="default" className="pt-0 sm:pt-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Latest updates</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <div className="space-y-4">
            {CURRENT_ENTRIES.map((entry, i) => (
              <motion.div
                key={entry.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <GlassCard variant="hover" className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                    <entry.icon className="w-4.5 h-4.5 text-foreground/70" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{entry.desc}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              This log is deliberately brief and will grow with each release.
            </p>
            <p className="text-sm text-muted-foreground">
              Got an idea, or a bug to report?{' '}
              <Link href="/contact" className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground underline underline-offset-4">
                <Mail className="w-3.5 h-3.5" />
                Contact us
              </Link>
            </p>
          </div>
        </div>
      </SectionLayout>

      <SiteFooter />
    </div>
  )
}
