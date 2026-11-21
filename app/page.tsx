'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlatformsSection } from '@/components/platforms-section'
import { useTranslation } from '@/lib/i18n/context'
import { GradientText } from '@/components/ui/gradient-text'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { SectionLayout } from '@/components/patterns/section-layout'
import { FeatureCard } from '@/components/patterns/feature-card'
import { PricingCard } from '@/components/patterns/pricing-card'
import { SiteHeader } from '@/components/patterns/site-header'
import { SiteFooter } from '@/components/patterns/site-footer'
import { PLANS } from '@/lib/models'
import {
  Sparkles, Zap, Code, TrendingUp, CheckCircle, ArrowRight,
  Rocket, Shield, Globe, Terminal, Cpu, Brain, Star, ChevronDown, Check, Minus,
} from 'lucide-react'
import { useState } from 'react'

const featureIcons = [Brain, Zap, Code, TrendingUp, Globe, Shield]

const plans = [
  { key: 'free',       name: PLANS.free.name,       price: PLANS.free.priceLabel,       href: '/checkout?plan=free',       popular: false },
  { key: 'starter',    name: PLANS.starter.name,    price: PLANS.starter.priceLabel,    href: '/checkout?plan=starter',    popular: false },
  { key: 'pro',        name: PLANS.pro.name,        price: PLANS.pro.priceLabel,        href: '/checkout?plan=pro',        popular: true  },
  { key: 'business',   name: PLANS.business.name,   price: PLANS.business.priceLabel,   href: '/checkout?plan=business',   popular: false },
  { key: 'enterprise', name: PLANS.enterprise.name, price: PLANS.enterprise.priceLabel, href: '/enterprise', popular: false },
]

/**
 * La fenetre d'editeur du heros.
 *
 * Plus aucune animation : chaque ligne apparaissait l'une apres l'autre,
 * ce qui donnait l'impression d'une page lente alors qu'elle etait deja
 * chargee.
 */
function TerminalMockup() {
  const lines = [
    { type: 'code', text: 'export async function verifyToken(token) {' },
    { type: 'ai', text: "  if (!token.startsWith('nxr_')) return null;" },
    { type: 'code', text: '  return decode(token);' },
    { type: 'code', text: '}' },
    { type: 'comment', text: '// Nexora applied your rule « validate the prefix »' },
  ]
  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0">
      <div className="absolute -inset-4 bg-foreground/5 rounded-3xl blur-2xl" />
      <div className="relative glass-strong rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <div className="w-3 h-3 rounded-full bg-red-400/70" />
          <div className="w-3 h-3 rounded-full bg-amber-400/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-sm text-muted-foreground font-mono">authService.ts</span>
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md badge-primary">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs font-medium">Agent · 2 files</span>
          </div>
        </div>
        <div className="p-5 font-mono text-sm space-y-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                line.type === 'comment' ? 'text-muted-foreground/60' :
                line.type === 'ai' ? 'text-foreground/90 bg-emerald-400/10 border-l-2 border-emerald-400/60 -mx-5 px-5 py-0.5' :
                'text-foreground/80'
              }`}
            >
              <span className="text-muted-foreground/30 mr-4 select-none text-xs">{i + 1}</span>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FaqItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-base font-medium text-foreground">{item.q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="px-5 pb-4 text-base text-muted-foreground leading-relaxed border-t border-border/50 pt-3">{item.a}</p>
      )}
    </div>
  )
}

function ComparisonCell({ value }: { value: string }) {
  const positive = /^(oui|yes|sí|sim)$/i.test(value)
  const negative = /^(non|no|não)\b/i.test(value)
  return (
    <span className={`inline-flex items-center gap-1.5 text-base ${positive ? 'text-emerald-400' : negative ? 'text-muted-foreground/50' : 'text-foreground/80'}`}>
      {positive ? <Check className="w-3.5 h-3.5 shrink-0" /> : negative ? <Minus className="w-3.5 h-3.5 shrink-0" /> : null}
      {value}
    </span>
  )
}

export default function HomePage() {
  const { t, lang } = useTranslation()

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      <SiteHeader />

      {/* Heros : une promesse a gauche, le produit en action a droite.
          Rien n'attend une animation au defilement : le contenu est la
          des le premier rendu. */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="orb orb-float-1 w-[700px] h-[700px] bg-foreground/[0.03] top-[5%] left-[-15%]" />
        <div className="orb orb-float-2 w-[500px] h-[500px] bg-foreground/[0.02] bottom-[10%] right-[-10%]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-14 items-center">
            <div>
              <Badge variant="primary" className="gap-2">
                <Brain className="w-4 h-4" />
                {t.hero.badge}
              </Badge>

              <h1 className="mt-5 text-[2.75rem] sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.07]">
                {t.hero.title1}
                <br />
                {t.hero.title2}
                <br />
                <GradientText variant="strong">{t.hero.title3}</GradientText>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                {t.hero.desc}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href="/auth/register">
                  <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
                    <Rocket className="mr-2 h-4 w-4" />
                    {t.hero.cta}
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
                    <Terminal className="mr-2 h-4 w-4" />
                    {t.hero.demo}
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-base text-muted-foreground/70">{t.hero.note}</p>
            </div>

            <TerminalMockup />
          </div>
        </div>
      </section>

      {/* Des faits verifiables, pas un compteur d'installations. */}
      <div className="border-y border-border bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {t.hero.facts.map(fait => (
              <div key={fait.label}>
                <div className="text-3xl font-bold tracking-tight">{fait.value}</div>
                <div className="mt-1 text-base text-muted-foreground">{fait.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionLayout id="features" background="default">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="primary" className="mb-5">
            <Sparkles className="w-3 h-3" />
            {t.features.badge}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">
            {t.features.title}
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">{t.features.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.items.map((feature, i) => {
            const Icon = featureIcons[i]
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 1, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <FeatureCard icon={Icon} title={feature.title} description={feature.desc} />
              </motion.div>
            )
          })}
        </div>
      </SectionLayout>

      <PlatformsSection lang={lang} />

      <section className="relative py-16 border-y border-border overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-6">{t.statsSection.poweredBy}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Anthropic Claude', 'Google Gemini', 'DeepSeek'].map(name => (
              <span
                key={name}
                className="px-4 py-2 rounded-full border border-border bg-card/60 text-base font-medium text-foreground/80"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <SectionLayout id="pricing" background="default">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="primary" className="mb-5">
            <Sparkles className="w-3 h-3" />
            {t.pricing.badge}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">{t.pricing.title}</h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">{t.pricing.subtitle}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={plan.popular ? 'lg:-mt-4' : ''}
            >
              <PricingCard
                name={plan.name}
                price={plan.price}
                period={plan.key !== 'free' ? t.pricing.period : undefined}
                features={t.pricing.planFeatures[plan.key] || []}
                href={plan.href}
                popular={plan.popular}
                popularLabel={t.pricing.popular}
                models={t.pricing.models[plan.key]}
                ctaText={t.pricing.cta[plan.key]}
              />
            </motion.div>
          ))}
        </div>
      </SectionLayout>

      {/* Comparison vs competitors */}
      <SectionLayout background="muted">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Badge variant="primary" className="mb-5">
            <Sparkles className="w-3 h-3" />
            {t.comparison.badge}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">{t.comparison.title}</h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">{t.comparison.subtitle}</p>
        </motion.div>
        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-base border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-sm uppercase tracking-wide">{t.comparison.feature}</th>
                <th className="text-left px-4 py-3 font-semibold">Nexora</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">GitHub Copilot</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cursor</th>
              </tr>
            </thead>
            <tbody>
              {t.comparison.rows.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                  <td className="px-4 py-3 text-muted-foreground border-t border-border/50">{row.label}</td>
                  <td className="px-4 py-3 border-t border-border/50"><ComparisonCell value={row.nexora} /></td>
                  <td className="px-4 py-3 border-t border-border/50"><ComparisonCell value={row.copilot} /></td>
                  <td className="px-4 py-3 border-t border-border/50"><ComparisonCell value={row.cursor} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionLayout>

      {/* FAQ */}
      <SectionLayout background="default">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Badge variant="primary" className="mb-5">
            <Sparkles className="w-3 h-3" />
            {t.faq.badge}
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">{t.faq.title}</h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">{t.faq.subtitle}</p>
        </motion.div>
        <div className="max-w-2xl mx-auto space-y-2.5">
          {t.faq.items.map((item, i) => (
            <motion.div key={item.q} initial={{ opacity: 1, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.04 }}>
              <FaqItem item={item} />
            </motion.div>
          ))}
        </div>
      </SectionLayout>

      <SectionLayout background="default">
        <motion.div
          initial={{ opacity: 1, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <GlassCard variant="default" className="border-animated overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
            <div className="py-16 px-8 sm:px-16 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl">
                  <Rocket className="w-7 h-7 text-primary-foreground relative z-10" />
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
                {t.cta.title}
              </h2>
              <p className="text-muted-foreground text-xl mb-10 max-w-xl mx-auto">{t.cta.subtitle}</p>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="px-10 h-12 text-base group">
                  {t.cta.button}
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
