'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreditCard, Lock, CheckCircle, ArrowLeft, Loader2, Shield,
  ChevronDown, Smartphone, Globe, Search, Sparkles, Zap
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth'
import { countries, validatePhone, type Country } from '@/lib/countries'

const planDetails: Record<string, { name: string; price: string; priceXAF: number; features: string[] }> = {
  free: {
    name: 'Free', price: '0€', priceXAF: 0,
    features: ['500 tokens/mois', '50 requêtes/jour', 'DeepSeek uniquement', 'Support communautaire'],
  },
  pro: {
    name: 'Pro', price: '9,99€', priceXAF: 6550,
    features: ['10 000 tokens/mois', '500 requêtes/jour', 'GPT-4o Mini, Claude Haiku, Gemini', 'Agent + Auto-complétion', 'Support prioritaire'],
  },
  business: {
    name: 'Business', price: '29,99€', priceXAF: 19650,
    features: ['50 000 tokens/mois', '2 000 requêtes/jour', 'GPT-4o, Claude Sonnet', 'Mode équipe', 'Support prioritaire'],
  },
  enterprise: {
    name: 'Enterprise', price: '99,99€', priceXAF: 65500,
    features: ['200 000 tokens/mois', 'Requêtes illimitées', 'Tous les modèles + custom', 'SSO + Support 24/7'],
  },
}

type PaymentMethod = 'card' | 'mobile_money'

function CountrySelector({ selected, onSelect }: { selected: Country; onSelect: (c: Country) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/50 text-foreground hover:bg-accent transition-colors w-full"
      >
        <span className="text-lg">{selected.flag}</span>
        <span className="text-sm flex-1 text-left">{selected.name}</span>
        <span className="text-xs text-muted-foreground">{selected.dialCode}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 mt-1.5 w-full bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-accent border border-border/50 rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onSelect(c); setOpen(false); setSearch('') }}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors ${c.code === selected.code ? 'bg-indigo-500/10' : ''}`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="text-sm text-foreground flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.dialCode}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Aucun pays trouvé</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const { user } = useAuth()
  const plan = searchParams.get('plan') || 'pro'
  const currentPlan = planDetails[plan] || planDetails.pro

  const [country, setCountry] = useState<Country>(countries[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [momoChannel, setMomoChannel] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!country.hasMobileMoney) {
      setPaymentMethod('card'); setMomoChannel('')
    } else {
      setMomoChannel(country.momoChannels[0]?.id || '')
    }
    setPhone('')
  }, [country])

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, country.phoneLength)
    setPhone(digits)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (paymentMethod === 'mobile_money') {
      if (!phone) { setError('Numéro de téléphone requis'); return }
      if (!validatePhone(phone, country)) { setError(`Le numéro doit contenir ${country.phoneLength} chiffres`); return }
      if (!momoChannel) { setError('Sélectionnez un opérateur'); return }
    }
    setLoading(true)
    try {
      const initRes = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentPlan.priceXAF,
          currency: 'XAF',
          email: user?.email || 'guest@nexora.ai',
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Client',
          phone: paymentMethod === 'mobile_money' ? `${country.dialCode}${phone}` : undefined,
          plan,
        }),
      })
      const initData = await initRes.json()
      if (!initData.success) { setError(initData.error || 'Erreur'); setLoading(false); return }
      if (paymentMethod === 'card') {
        if (initData.authorizationUrl) { window.location.href = initData.authorizationUrl } else { setError('URL de paiement non disponible'); setLoading(false) }
        return
      }
      const processRes = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: initData.reference, channel: momoChannel, phone: `${country.dialCode}${phone}` }),
      })
      const processData = await processRes.json()
      if (processData.success) {
        showToast('Validez le paiement sur votre téléphone', 'info')
        router.push(`/checkout/callback?reference=${initData.reference}`)
      } else { setError(processData.message || 'Erreur'); setLoading(false) }
    } catch { setError('Erreur de connexion.'); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/8 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/8 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/#pricing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux tarifs
          </Link>

          <Card className="glass mb-5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Plan sélectionné</p>
                  <p className="text-lg font-bold text-foreground">{currentPlan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tracking-tight">{currentPlan.price}</p>
                  <p className="text-xs text-muted-foreground">≈ {currentPlan.priceXAF.toLocaleString()} FCFA</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {currentPlan.features.map(f => (
                  <span key={f} className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="text-center space-y-4 pt-8">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Paiement sécurisé</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">Choisissez votre pays et méthode de paiement</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {error && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Pays</Label>
                  <CountrySelector selected={country} onSelect={setCountry} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Méthode de paiement</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPaymentMethod('card')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${paymentMethod === 'card' ? 'bg-indigo-500/20 border-indigo-500/40 text-foreground' : 'bg-card border-border/50 text-muted-foreground hover:bg-accent'}`}>
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Carte</span>
                    </button>
                    {country.hasMobileMoney && (
                      <button type="button" onClick={() => setPaymentMethod('mobile_money')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${paymentMethod === 'mobile_money' ? 'bg-indigo-500/20 border-indigo-500/40 text-foreground' : 'bg-card border-border/50 text-muted-foreground hover:bg-accent'}`}>
                        <Smartphone className="w-4 h-4" />
                        <span className="text-sm">Mobile Money</span>
                      </button>
                    )}
                  </div>
                </div>
                {paymentMethod === 'card' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                      <p className="text-indigo-300 text-sm"><Lock className="w-3.5 h-3.5 inline mr-1.5" />Redirection vers NotchPay pour le paiement sécurisé.</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Cartes :</span>
                      <span className="bg-accent px-2 py-0.5 rounded text-foreground">VISA</span>
                      <span className="bg-accent px-2 py-0.5 rounded text-foreground">Mastercard</span>
                      <span className="bg-accent px-2 py-0.5 rounded text-foreground">Prépayée</span>
                    </div>
                  </motion.div>
                )}
                {paymentMethod === 'mobile_money' && country.hasMobileMoney && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Opérateur</Label>
                      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(country.momoChannels.length, 2)}, 1fr)` }}>
                        {country.momoChannels.map(ch => (
                          <button key={ch.id} type="button" onClick={() => setMomoChannel(ch.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${momoChannel === ch.id ? 'border-indigo-500/40 text-foreground' : 'bg-card border-border/50 text-muted-foreground hover:bg-accent'}`}
                            style={momoChannel === ch.id ? { backgroundColor: `${ch.color}18` } : {}}>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                            <span className="text-sm">{ch.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">Numéro de téléphone</Label>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-card border border-border/50 text-foreground min-w-fit">
                          <span>{country.flag}</span>
                          <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                        </div>
                        <Input id="phone" type="tel" placeholder={'0'.repeat(country.phoneLength)} value={phone}
                          onChange={e => handlePhoneChange(e.target.value)} maxLength={country.phoneLength}
                          className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-indigo-500/50 flex-1 rounded-xl" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {phone.length}/{country.phoneLength} chiffres
                        {phone.length === country.phoneLength && <span className="text-emerald-400 ml-2">✓ Valide</span>}
                      </p>
                    </div>
                  </motion.div>
                )}
                <Button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] mt-2">
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Traitement...</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" />Payer {currentPlan.priceXAF.toLocaleString()} FCFA</>
                  )}
                </Button>
              </form>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3 h-3" />
                <span>Paiement sécurisé via NotchPay</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  )
}
