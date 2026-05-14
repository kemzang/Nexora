'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles, Zap, Code, TrendingUp, CreditCard, Settings, LogOut,
  ArrowRight, LayoutDashboard, Key, FileText, HelpCircle, ChevronRight,
  Bell, Search, Menu, X, Activity, BarChart3, Clock, Users, Bot,
  ChevronDown, Wallet, Star
} from 'lucide-react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
  { icon: Key, label: 'API Keys', href: '#', active: false },
  { icon: Activity, label: 'Utilisation', href: '#', active: false },
  { icon: Wallet, label: 'Abonnement', href: '#', active: false },
  { icon: FileText, label: 'Factures', href: '#', active: false },
  { icon: HelpCircle, label: 'Aide', href: '#', active: false },
]

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
    setIsSignOutModalOpen(false)
    router.push('/auth/login')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 w-10 h-10 border-2 border-violet-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sign Out Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Confirmer la déconnexion"
      >
        <div className="text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <LogOut className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-muted-foreground mb-8">
            Êtes-vous sûr de vouloir vous déconnecter de votre compte Nexora ?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSignOut}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none"
            >
              Se déconnecter
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsSignOutModalOpen(false)}
              className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 border-r border-border/50 bg-sidebar transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">Nexora</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {sidebarLinks.map(link => (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                link.active
                  ? 'bg-indigo-500/10 text-indigo-300 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
              {link.active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-muted-foreground hover:text-foreground"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <LayoutDashboard className="w-4 h-4" />
                <span>/</span>
                <span className="text-foreground">Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Tokens disponibles', value: '50', icon: Zap, change: '+0 aujourd\'hui', color: 'text-amber-400', chart: 'from-amber-500/20 to-amber-500/5' },
              { label: 'API Keys', value: '0', icon: Key, change: 'Aucune clé active', color: 'text-blue-400', chart: 'from-blue-500/20 to-blue-500/5' },
              { label: 'Utilisation du mois', value: '0', icon: BarChart3, change: 'Sur 500 max', color: 'text-emerald-400', chart: 'from-emerald-500/20 to-emerald-500/5' },
              { label: 'Plan actuel', value: 'Free', icon: Star, change: 'DeepSeek, Gemini Flash', color: 'text-violet-400', chart: 'from-violet-500/20 to-violet-500/5' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
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

          {/* Quick Actions + Getting Started */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
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
                      { icon: Key, label: 'Créer une API Key', desc: 'Générer pour VS Code', color: 'text-indigo-400', bg: 'bg-indigo-500/10', hover: 'hover:bg-indigo-500/20' },
                      { icon: Zap, label: 'Upgrade Pro', desc: 'Débloquer plus de tokens', color: 'text-amber-400', bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500/20' },
                      { icon: Bot, label: 'Documentation', desc: 'Tutoriels & guides', color: 'text-emerald-400', bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500/20' },
                    ].map(action => (
                      <button
                        key={action.label}
                        className={`flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/50 ${action.hover} transition-all group text-left`}
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
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
                  <Link href="#">
                    <Button variant="outline" className="w-full mt-2 border-border/50 text-muted-foreground hover:text-foreground group">
                      Voir le guide complet
                      <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
