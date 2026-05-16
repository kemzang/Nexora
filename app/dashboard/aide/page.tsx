'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, ArrowLeft, Book, MessageCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const guides = [
  { icon: Book, title: 'Documentation', desc: 'Tutoriels et guides complets', href: '#' },
  { icon: MessageCircle, title: 'Support technique', desc: 'Contactez notre équipe', href: '#' },
  { icon: Mail, title: 'Nous écrire', desc: 'contact@nexora.ai', href: 'mailto:contact@nexora.ai' },
]

export default function AidePage() {
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
            <h1 className="text-2xl font-bold">Aide</h1>
            <p className="text-muted-foreground text-sm">Ressources et support</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {guides.map(item => (
            <Card key={item.title} className="glass hover:glass-hover transition-all cursor-pointer group">
              <CardContent className="p-6 text-center">
                <item.icon className="w-8 h-8 mx-auto mb-3 text-indigo-400" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
