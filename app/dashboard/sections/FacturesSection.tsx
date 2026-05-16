'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function FacturesSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Factures</h1>
        <p className="text-muted-foreground text-sm mt-1">Consultez votre historique de facturation</p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Historique des factures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Aucune facture</p>
            <p className="text-sm mt-1">Les factures apparaîtront ici après votre premier paiement</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
