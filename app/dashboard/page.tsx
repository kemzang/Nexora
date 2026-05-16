'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Sparkles, Settings, LogOut, ArrowRight, LayoutDashboard, Key, FileText, HelpCircle, ChevronRight,
  Bell, Search, Menu, X, Activity, Wallet
} from 'lucide-react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'
import OverviewSection from '@/app/dashboard/sections/OverviewSection'
import ApiKeysSection from '@/app/dashboard/sections/ApiKeysSection'
import UtilisationSection from '@/app/dashboard/sections/UtilisationSection'
import AbonnementSection from '@/app/dashboard/sections/AbonnementSection'
import FacturesSection from '@/app/dashboard/sections/FacturesSection'
import AideSection from '@/app/dashboard/sections/AideSection'

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', section: 'dashboard' },
  { icon: Key, label: 'API Keys', section: 'api-keys' },
  { icon: Activity, label: 'Utilisation', section: 'utilisation' },
  { icon: Wallet, label: 'Abonnement', section: 'abonnement' },
  { icon: FileText, label: 'Factures', section: 'factures' },
  { icon: HelpCircle, label: 'Aide', section: 'aide' },
]

const sections: Record<string, React.FC<{ user: any; onNavigate: (s: string) => void }>> = {
  dashboard: ({ user, onNavigate }) => <OverviewSection user={user} onNavigate={onNavigate} />,
  'api-keys': () => <ApiKeysSection />,
  utilisation: () => <UtilisationSection />,
  abonnement: () => <AbonnementSection />,
  factures: () => <FacturesSection />,
  aide: () => <AideSection />,
}

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('dashboard')
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

  const handleNavigate = (section: string) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }

  const sectionTitle = sidebarLinks.find(l => l.section === activeSection)?.label || 'Dashboard'
  const ActiveComponent = sections[activeSection] || sections.dashboard

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
            <Button onClick={handleSignOut} className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none">
              Se déconnecter
            </Button>
            <Button variant="ghost" onClick={() => setIsSignOutModalOpen(false)} className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent">
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
            <button
              key={link.label}
              onClick={() => handleNavigate(link.section)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                activeSection === link.section
                  ? 'bg-indigo-500/10 text-indigo-300 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <link.icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
              {activeSection === link.section && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400" />}
            </button>
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

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <LayoutDashboard className="w-4 h-4" />
                <span>/</span>
                <span className="text-foreground">{sectionTitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleNavigate('aide')} className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/50">
                <Button variant="ghost" size="sm" onClick={() => handleNavigate('aide')} className="text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsSignOutModalOpen(true)} className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ActiveComponent user={user} onNavigate={handleNavigate} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
