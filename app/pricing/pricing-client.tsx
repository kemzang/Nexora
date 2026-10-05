'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, Sparkles, ArrowRight, Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { SectionLayout } from '@/components/patterns/section-layout'
import { PageHeader } from '@/components/patterns/page-header'
import { PricingCard } from '@/components/patterns/pricing-card'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'
import { PLANS, MODELS, type PlanId } from '@/lib/models'

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'business', 'enterprise']

const CTA_TEXT: Record<PlanId, string> = {
  free: 'Get started free',
  starter: 'Choose Starter',
  pro: 'Choose Pro',
  business: 'Choose Business',
  enterprise: 'Contact the team',
}

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}K`
  return String(n)
}

function formatRequests(n: number): string {
  return n >= 99_999 ? 'Unlimited' : n.toLocaleString('en-US')
}

function formatCollaborators(n: number): string {
  return n >= 99_999 ? 'Unlimited' : String(n)
}

function modelsForPlan(id: PlanId): string {
  return PLANS[id].models.map(m => MODELS[m].name).join(', ')
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What happens if I exceed my credit allowance?',
    a: "AI requests are temporarily blocked until your billing period renews. You can upgrade at any time from your dashboard to carry on straight away, without waiting for the renewal.",
  },
  {
    q: 'Can I change plan at any time?',
    a: "Yes. Go to the Subscription section of your dashboard to upgrade whenever you like. To cancel, email our support — see the Contact page.",
  },
  {
    q: 'Do unused credits roll over to the next month?',
    a: "No. Credits reset at each monthly renewal and do not accumulate from one month to the next.",
  },
  {
    q: "What exactly is a credit?",
    a: "A credit corresponds to one token consumed, weighted by the relative cost of the model used: a more powerful model (such as Claude Opus) consumes more credits per token than a lighter one (such as DeepSeek V3). Your detailed consumption is visible in your dashboard.",
  },
  {
    q: 'Which payment methods do you accept?',
    a: "Card payments (Visa, Mastercard) through our payment partner Paddle, available worldwide.",
  },
  {
    q: 'Does the Free plan expire?',
    a: "No — the Free plan stays available for as long as you want, with 100,000 credits every month.",
  },
  {
    q: 'Can I collaborate with my team?',
    a: "Yes, from the Starter plan onwards (2 people in a session). Higher plans allow more collaborators: 5 on Pro, 20 on Business, and an unlimited number on Enterprise.",
  },
  {
    q: 'Does the Enterprise plan include an SLA?',
    a: "The Enterprise plan includes 24/7 support, SSO authentication and a contractual SLA — contact our team for the exact terms.",
  },
]

function FaqItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{item.q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PricingPageClient() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <section className="relative pt-40 pb-16 overflow-hidden">
        <div className="orb orb-float-1 w-[600px] h-[600px] bg-foreground/[0.03] top-[-10%] left-[-10%]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="primary" className="mb-5">
              <Sparkles className="w-3 h-3" />
              Pricing
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 text-balance">
              Simple pricing, no surprises
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free, no card required. Upgrade when you need to — change or cancel at any time.
            </p>
          </motion.div>
        </div>
      </section>

      <SectionLayout background="default" className="pt-0 sm:pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto items-start">
          {PLAN_ORDER.map((key, i) => {
            const plan = PLANS[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className={plan.popular ? 'lg:-mt-4' : ''}
              >
                <PricingCard
                  name={plan.name}
                  price={plan.priceLabel}
                  period={plan.price > 0 ? '/mois' : undefined}
                  features={plan.features}
                  href={`/checkout?plan=${key}`}
                  popular={plan.popular}
                  popularLabel="Populaire"
                  models={modelsForPlan(key)}
                  ctaText={CTA_TEXT[key]}
                />
              </motion.div>
            )
          })}
        </div>
      </SectionLayout>

      {/* Comparison table */}
      <SectionLayout background="muted">
        <PageHeader
          badge="Comparison"
          title="At a glance"
          subtitle="The key figures for each plan, side by side."
        />
        <div className="max-w-5xl mx-auto overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Plan</th>
                {PLAN_ORDER.map(key => (
                  <th key={key} className="text-left px-4 py-3 font-semibold whitespace-nowrap">
                    {PLANS[key].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Prix', render: (k: PlanId) => PLANS[k].price > 0 ? `${PLANS[k].priceLabel}/mois` : 'Gratuit' },
                { label: 'Credits / month', render: (k: PlanId) => formatCredits(PLANS[k].tokensPerMonth) },
                { label: 'Requests / day', render: (k: PlanId) => formatRequests(PLANS[k].maxRequestsPerDay) },
                { label: 'Collaborateurs max', render: (k: PlanId) => formatCollaborators(PLANS[k].maxCollaborators) },
                { label: 'Models included', render: (k: PlanId) => modelsForPlan(k) },
              ].map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                  <td className="px-4 py-3 text-muted-foreground border-t border-border/50">{row.label}</td>
                  {PLAN_ORDER.map(key => (
                    <td key={key} className="px-4 py-3 border-t border-border/50 max-w-[220px]">{row.render(key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-xs text-muted-foreground/70 mt-6 max-w-2xl mx-auto">
          Autocomplete requires the Starter plan or above. The Free plan includes 100,000 credits every month.
        </p>
      </SectionLayout>

      {/* FAQ */}
      <SectionLayout background="default">
        <PageHeader badge="FAQ" title="Frequently asked questions" subtitle="What our users ask us most often." />
        <div className="max-w-2xl mx-auto space-y-2.5">
          {FAQ.map((item, i) => (
            <motion.div key={item.q} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.04 }}>
              <FaqItem item={item} />
            </motion.div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          D'autres questions ? <Link href="/contact" className="text-foreground/80 hover:text-foreground underline underline-offset-4">Contactez-nous</Link> ou consultez la <Link href="/docs" className="text-foreground/80 hover:text-foreground underline underline-offset-4">documentation</Link>.
        </p>
      </SectionLayout>

      {/* CTA */}
      <SectionLayout background="default">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto">
          <GlassCard variant="default" className="border-animated overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
            <div className="py-16 px-8 sm:px-16 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl">
                  <Rocket className="w-7 h-7 text-primary-foreground relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">Ready to try Nexora?</h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">Create a free account in seconds, no card required.</p>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="px-10 h-12 text-base group">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
          </GlassCard>
        </motion.div>
      </SectionLayout>

      <SiteFooter />
    </div>
  )
}
