'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, ArrowLeft, Sparkles, Zap, Star } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const plans = [
  { name: 'Free', price: '0€', icon: Star, color: 'text-violet-400', desc: 'DeepSeek, Gemini Flash' },
  { name: 'Neo', price: '9,99€', icon: Sparkles, color: 'text-blue-400', desc: '+ Gemini Pro' },
  { name: 'Pro', price: '19,99€', icon: Zap, color: 'text-amber-400', desc: '+ Claude Haiku, Grok' },
  { name: 'Business', price: '49,99€', icon: Zap, color: 'text-emerald-400', desc: '+ Claude Sonnet' },
]

export default function AbonnementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Abonnement</h1>
            <p className="text-muted-foreground text-sm">Gérez votre plan et vos moyens de paiement</p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Plan actuel : Free</CardTitle>
            <CardDescription>DeepSeek, Gemini Flash inclus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.slice(1).map(plan => (
                <Card key={plan.name} className="border-border/50 hover:border-indigo-500/50 transition-colors cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <plan.icon className={`w-8 h-8 mx-auto mb-3 ${plan.color}`} />
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold mt-2">{plan.price}<span className="text-sm text-muted-foreground">/mois</span></p>
                    <p className="text-xs text-muted-foreground mt-2">{plan.desc}</p>
                    <Button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      Passer à {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
