'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export default function UtilisationSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Utilisation</h1>
        <p className="text-muted-foreground text-sm mt-1">Suivez votre consommation de tokens</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Statistiques du mois</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Aucune donnée d'utilisation</p>
            <p className="text-sm mt-1">Commencez à utiliser Nexora pour voir vos statistiques</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
