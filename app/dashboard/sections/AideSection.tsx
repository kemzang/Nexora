'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Book, MessageCircle, Mail, Sparkles } from 'lucide-react'

const guides = [
  { icon: Book, title: 'Documentation', desc: 'Tutoriels et guides complets', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { icon: MessageCircle, title: 'Support technique', desc: 'Contactez notre équipe', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Mail, title: 'Nous écrire', desc: 'contact@nexora.ai', color: 'text-amber-400', bg: 'bg-amber-500/10' },
]

export default function AideSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Aide</h1>
        <p className="text-muted-foreground text-sm mt-1">Ressources et support</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {guides.map(item => (
          <Card key={item.title} className="glass hover:glass-hover transition-all cursor-pointer group hover:-translate-y-1">
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass bg-gradient-to-br from-indigo-500/5 to-violet-500/5 border-indigo-500/20">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-4 text-indigo-400" />
          <h2 className="text-xl font-bold mb-2">Besoin d'aide supplémentaire ?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Notre équipe est là pour vous aider. Rejoignez notre communauté ou envoyez-nous un message.
          </p>
          <div className="flex justify-center gap-3">
            <span className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 text-sm">
              Documentation
            </span>
            <span className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 text-sm">
              Contact
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
