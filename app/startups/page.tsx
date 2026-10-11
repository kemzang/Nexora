import type { Metadata } from 'next'
import Link from 'next/link'
import { Rocket, Check, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionLayout } from '@/components/patterns/section-layout'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'
import { STARTUP_PROGRAM } from '@/lib/leads'
import { StartupForm } from './startups-client'

export const metadata: Metadata = {
  title: 'Nexora for Startups',
  description:
    'A discount on Nexora for young companies — open to teams everywhere, not only those backed by well-known accelerators.',
}

const CRITERIA = [
  `Founded less than ${STARTUP_PROGRAM.maxAgeYears} years ago`,
  `${STARTUP_PROGRAM.maxTeamSize} developers or fewer`,
  `No more than $${(STARTUP_PROGRAM.maxFundingUsd / 1000).toFixed(0)}k raised`,
  'A company email address and proof of existence',
]

export default function StartupsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative pt-40 pb-14 overflow-hidden">
        <div className="orb orb-float-2 w-[600px] h-[600px] bg-foreground/[0.03] top-[-10%] left-[-10%]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Badge variant="primary" className="mb-5">
            <Rocket className="w-3 h-3" />
            Startup program
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
            {STARTUP_PROGRAM.discountPercent}% off for {STARTUP_PROGRAM.durationMonths} months
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            On the Pro and Business plans, for teams early enough that the price still matters.
          </p>
        </div>
      </section>

      <SectionLayout background="default" className="pt-0 sm:pt-0">
        <div className="max-w-2xl mx-auto mb-14">
          <GlassCard className="p-6 sm:p-7">
            <div className="flex gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-muted border border-border
                              flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-foreground/70" />
              </div>
              <div>
                <h2 className="font-semibold text-sm mb-1">Open wherever you are</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Most startup programs in this industry are reserved, in practice, for
                  companies that went through a handful of well-known accelerators. Nexora is
                  built in Cameroon, and we know what it is like to be outside that circle.
                  You do not need a famous investor to apply here — you need to be a real,
                  young company building something.
                </p>
              </div>
            </div>

            <div className="border-t border-border/50 pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-3">
                What we look for
              </p>
              <ul className="space-y-2">
                {CRITERIA.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{c}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground/70 mt-4 leading-relaxed">
                These are guidelines, not a gate. If you are just outside one of them, apply
                anyway and tell us why — a person reads every application.
              </p>
            </div>
          </GlassCard>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Apply</h2>
            <p className="text-sm text-muted-foreground">
              We answer within two business days, approved or not.
            </p>
          </div>
          <StartupForm />
          <p className="text-center text-xs text-muted-foreground/70 mt-6">
            Larger team?{' '}
            <Link href="/enterprise" className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
              See the enterprise offer
            </Link>
            .
          </p>
        </div>
      </SectionLayout>

      <SiteFooter />
    </div>
  )
}
