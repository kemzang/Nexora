'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Key, BarChart3, Clock, Star, ArrowRight, Bot } from 'lucide-react'

interface OverviewSectionProps {
  user: { firstName?: string; lastName?: string }
  onNavigate: (section: string) => void
}

export default function OverviewSection({ user, onNavigate }: OverviewSectionProps) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Clock className="w-3 h-3" />
          <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Bon retour,{' '}
          <span className="gradient-text-strong">{user.firstName}</span>
        </h1>
        <p className="text-muted-foreground">
          Gérez votre abonnement, vos clés API et suivez votre utilisation.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Tokens disponibles', value: '50', icon: Zap, change: '+0 aujourd\'hui', color: 'text-amber-400', chart: 'from-amber-500/20 to-amber-500/5' },
          { label: 'API Keys', value: '0', icon: Key, change: 'Aucune clé active', color: 'text-blue-400', chart: 'from-blue-500/20 to-blue-500/5' },
          { label: 'Utilisation du mois', value: '0', icon: BarChart3, change: 'Sur 500 max', color: 'text-emerald-400', chart: 'from-emerald-500/20 to-emerald-500/5' },
          { label: 'Plan actuel', value: 'Free', icon: Star, change: 'Plan gratuit', color: 'text-violet-400', chart: 'from-violet-500/20 to-violet-500/5' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass group hover:glass-hover transition-all duration-300 cursor-default">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</p>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.chart} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight mb-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="glass">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Actions rapides</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Démarrez avec Nexora en quelques clics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Key, label: 'Créer une API Key', desc: 'Générer pour VS Code', color: 'text-indigo-400', bg: 'bg-indigo-500/10', hover: 'hover:bg-indigo-500/20', section: 'api-keys' },
                  { icon: Zap, label: 'Upgrade Pro', desc: 'Débloquer plus de tokens', color: 'text-amber-400', bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500/20', section: 'abonnement' },
                  { icon: Bot, label: 'Documentation', desc: 'Tutoriels & guides', color: 'text-emerald-400', bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500/20', section: 'aide' },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => onNavigate(action.section)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/50 ${action.hover} transition-all group text-left cursor-pointer`}
                  >
                    <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm text-foreground">{action.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Mise en route</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { step: 1, title: 'Installer l\'extension', desc: 'Ajoutez Nexora à VS Code' },
                { step: 2, title: 'Créer une API Key', desc: 'Générez votre clé d\'accès' },
                { step: 3, title: 'Commencer à coder', desc: 'Utilisez l\'IA dans votre éditeur' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 group cursor-default">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-500/20 transition-colors">
                    <span className="text-indigo-400 text-xs font-bold">{item.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => onNavigate('aide')} className="w-full">
                <Button variant="outline" className="w-full mt-2 border-border/50 text-muted-foreground hover:text-foreground group">
                  Voir le guide complet
                  <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
