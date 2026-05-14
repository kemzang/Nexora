'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles, Zap, Code, TrendingUp, CheckCircle, ArrowRight,
  Rocket, Shield, Globe, Terminal, Cpu, Brain, Star, ChevronRight
} from 'lucide-react'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" }
}

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true }
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Nexora</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
              <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
              <div className="flex items-center gap-3 pl-4 border-l border-border/50">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Connexion</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20">
                    Commencer
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-grid-lg pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[200px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
              <Brain className="w-3.5 h-3.5" />
              <span>IA de nouvelle génération pour VS Code</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 text-balance"
          >
            L'IA qui transforme
            <br />
            <span className="gradient-text-strong">votre façon de coder</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Nexora s'intègre directement dans VS Code pour vous donner accès aux modèles d'IA les plus puissants. Codez plus vite, mieux, et avec plus de confiance.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/register">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 text-base shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-300">
                <Rocket className="mr-2 h-4 w-4" />
                Essayer gratuitement
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base border-border/50 hover:bg-accent">
              <Terminal className="mr-2 h-4 w-4" />
              Voir la démo
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          >
            {[
              { icon: Star, label: 'GPT-4o & Claude' },
              { icon: Cpu, label: 'DeepSeek V3' },
              { icon: Zap, label: '10x plus rapide' },
              { icon: Shield, label: 'Code sécurisé' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="w-4 h-4 text-indigo-400" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-4">
              <Sparkles className="w-3 h-3" />
              <span>Fonctionnalités</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des outils puissants pour accélérer votre développement au quotidien
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'Chat IA Intégré', desc: 'Discutez avec l\'IA directement dans VS Code pour obtenir de l\'aide et des suggestions en temps réel.', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { icon: Zap, title: 'Auto-complétion', desc: 'Complétez votre code 10x plus vite avec des suggestions intelligentes qui comprennent le contexte.', color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { icon: Code, title: 'Génération de Code', desc: 'Générez des fonctions, des classes et des algorithmes complets à partir de descriptions en langage naturel.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { icon: TrendingUp, title: 'Multi-modèles', desc: 'Accédez à GPT-4o, Claude, Gemini, DeepSeek et bien d\'autres modèles depuis un seul outil.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { icon: Globe, title: 'Mode Agent', desc: 'Laissez l\'IA exécuter des tâches complexes, naviguer dans votre code et proposer des modifications.', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: Shield, title: 'Sécurité & Privacy', desc: 'Vos données sont chiffrées et jamais utilisées pour l\'entraînement. Contrôle total sur votre code.', color: 'text-rose-400', bg: 'bg-rose-500/10' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="glass h-full group hover:glass-hover transition-all duration-300 cursor-default">
                  <CardHeader>
                    <div className={`w-11 h-11 ${feature.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className={`w-5.5 h-5.5 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-foreground font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-20 border-y border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10K+', label: 'Développeurs actifs' },
              { value: '1M+', label: 'Requêtes traitées' },
              { value: '15+', label: 'Modèles IA' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-bold gradient-text-strong mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 mb-4">
              <Sparkles className="w-3 h-3" />
              <span>Tarifs</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Des tarifs pour tous les besoins
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Commencez gratuitement et passez à un plan supérieur quand vous êtes prêt
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              {
                name: 'Free', price: '0€', period: '', popular: false,
                features: ['50 tokens', '50 req./jour', 'DeepSeek', 'Support communautaire'],
                cta: 'Commencer', href: '/checkout?plan=free&price=0',
                btn: 'outline'
              },
              {
                name: 'Pro', price: '9,99€', period: '/mois', popular: true,
                features: ['10K tokens/mois', '500 req./jour', 'GPT-4o Mini, Claude, Gemini', 'Agent + Auto-complétion', 'Support prioritaire'],
                cta: 'Choisir Pro', href: '/checkout?plan=pro&price=999',
                btn: 'default'
              },
              {
                name: 'Business', price: '29,99€', period: '/mois', popular: false,
                features: ['50K tokens/mois', '2K req./jour', 'GPT-4o, Claude Sonnet', 'Mode équipe', 'Support prioritaire'],
                cta: 'Choisir Business', href: '/checkout?plan=business&price=2999',
                btn: 'outline'
              },
              {
                name: 'Enterprise', price: '99,99€', period: '/mois', popular: false,
                features: ['200K tokens/mois', 'Req. illimitées', 'Tous les modèles + custom', 'SSO + Support 24/7'],
                cta: 'Contacter', href: '/checkout?plan=enterprise&price=9999',
                btn: 'outline'
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`glass h-full relative ${plan.popular ? 'border-indigo-500/30 glow-indigo' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg shadow-indigo-600/30">
                        Populaire
                      </span>
                    </div>
                  )}
                  <CardHeader className={`text-center ${plan.popular ? 'pt-8' : ''}`}>
                    <CardTitle className="text-foreground text-lg">{plan.name}</CardTitle>
                    <div className="mt-3">
                      <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2.5">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-sm text-muted-foreground">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={plan.href}>
                      <Button
                        variant={plan.btn as 'default' | 'outline'}
                        className={`w-full ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20' : ''}`}
                      >
                        {plan.cta}
                        <ChevronRight className="ml-1 w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="glass border-indigo-500/10 glow-indigo">
              <CardContent className="py-16 px-8 sm:px-16">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Prêt à transformer votre code ?
                </h2>
                <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                  Rejoignez des milliers de développeurs qui codent plus intelligemment avec Nexora.
                </p>
                <Link href="/auth/register">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 h-12 text-base shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-300">
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold">Nexora</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                L'extension VS Code qui transforme votre code avec l'intelligence artificielle.
              </p>
            </div>
            {[
              { title: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'Documentation', 'API'] },
              { title: 'Entreprise', links: ['Contact', 'Support', 'Partenaires', 'Blog'] },
              { title: 'Légal', links: ['Confidentialité', 'CGU', 'Sécurité', 'Mentions légales'] },
            ].map(col => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold mb-4">{col.title}</h3>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border/50 mt-12 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Nexora. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
