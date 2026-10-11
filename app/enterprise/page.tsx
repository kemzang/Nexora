import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Users, FileText, Server, Headphones, Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionLayout } from '@/components/patterns/section-layout'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'
import { EnterpriseForm } from './enterprise-client'

export const metadata: Metadata = {
  title: 'Nexora for Enterprise',
  description:
    'Deploy Nexora across your engineering team — SSO, contractual SLA, invoice billing and dedicated support.',
}

const CAPABILITIES = [
  { icon: ShieldCheck, title: 'SSO and provisioning',
    desc: 'SAML single sign-on, with accounts created and revoked from your identity provider.' },
  { icon: FileText, title: 'Invoice billing',
    desc: 'Annual invoicing, purchase orders and bank transfer — no card required.' },
  { icon: Headphones, title: 'Dedicated support',
    desc: 'A named contact, a contractual response time, and a direct line when something breaks.' },
  { icon: Server, title: 'Data residency',
    desc: 'Tell us where your code may be processed and we will tell you honestly what we can do.' },
  { icon: Users, title: 'Team management',
    desc: 'Shared quotas, per-team usage reporting and centralised model access.' },
  { icon: Rocket, title: 'Onboarding',
    desc: 'We help your team set up, configure rules for your stack, and get productive.' },
]

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative pt-40 pb-14 overflow-hidden">
        <div className="orb orb-float-2 w-[600px] h-[600px] bg-foreground/[0.03] top-[-10%] right-[-10%]" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Badge variant="primary" className="mb-5">
            <ShieldCheck className="w-3 h-3" />
            Enterprise
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
            Nexora for your whole engineering team
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Beyond the self-serve plans: single sign-on, a contractual SLA, invoice billing
            and a named contact. We shape the terms around how your team actually works.
          </p>
        </div>
      </section>

      <SectionLayout background="default" className="pt-0 sm:pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-16">
          {CAPABILITIES.map((c) => (
            <GlassCard key={c.title} variant="hover" className="p-6">
              <div className="w-10 h-10 rounded-xl bg-muted border border-border
                              flex items-center justify-center mb-4">
                <c.icon className="w-4 h-4 text-foreground/70" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </GlassCard>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Tell us about your team</h2>
            <p className="text-sm text-muted-foreground">
              A real person reads every request and replies within one business day.
              No automated sequence, no sales pressure.
            </p>
          </div>
          <EnterpriseForm />
          <p className="text-center text-xs text-muted-foreground/70 mt-6">
            Running a young company instead?{' '}
            <Link href="/startups" className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
              See the startup program
            </Link>
            .
          </p>
        </div>
      </SectionLayout>

      <SiteFooter />
    </div>
  )
}
