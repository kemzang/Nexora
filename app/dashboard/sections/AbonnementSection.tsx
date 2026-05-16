'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Zap, Star, Check, ArrowUp } from 'lucide-react'

const PLAN_ORDER = ['free', 'neo', 'pro', 'business', 'enterprise'] as const

const plans = [
  {
    id: 'neo',
    name: 'Neo',
    price: '4€',
    icon: Sparkles,
    color: 'text-blue-400',
    bg: 'from-blue-500/20 to-blue-500/5',
    border: 'hover:border-blue-500/50',
    features: ['15K tokens/mois', '150 requêtes/jour', 'Auto-complétion VS Code'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9€',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'from-amber-500/20 to-amber-500/5',
    border: 'hover:border-amber-500/50',
    popular: true,
    features: ['50K tokens/mois', '500 requêtes/jour', 'Mode Agent', 'Support prioritaire'],
  },
  {
    id: 'business',
    name: 'Business',
    price: '17€',
    icon: Star,
    color: 'text-emerald-400',
    bg: 'from-emerald-500/20 to-emerald-500/5',
    border: 'hover:border-emerald-500/50',
    features: ['200K tokens/mois', '2 000 requêtes/jour', 'Mode équipe'],
  },
]

export default function AbonnementSection() {
  const currentPlanIndex = 0

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez votre plan et découvrez les offres disponibles</p>
      </div>

      <Card className="glass border-indigo-500/20 bg-indigo-500/5">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plan actuel</p>
              <p className="text-xl font-bold">Free</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">0€ / mois</p>
            <p className="text-xs text-muted-foreground">Renouvellement le 16/06/2026</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-1">Offres disponibles</h2>
        <p className="text-sm text-muted-foreground mb-6">Choisissez le plan qui vous correspond le mieux</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative border-border/50 ${plan.border} transition-all duration-300 group cursor-pointer hover:-translate-y-1 ${
                plan.popular ? 'border-amber-500/50 shadow-lg shadow-amber-500/5' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" /> Populaire
                </div>
              )}
              <CardContent className="p-6 text-center pt-8">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br ${plan.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <plan.icon className={`w-6 h-6 ${plan.color}`} />
                </div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-3xl font-bold mt-2">{plan.price}<span className="text-sm text-muted-foreground font-normal">/mois</span></p>

                <ul className="mt-6 space-y-3 text-left">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button className={`mt-8 w-full ${
                  plan.popular
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}>
                  Passer à {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
