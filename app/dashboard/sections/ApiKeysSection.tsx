'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, Plus } from 'lucide-react'

export default function ApiKeysSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Clés API</h1>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos clés d'accès pour VS Code et l'API Nexora</p>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vos clés API</CardTitle>
            <CardDescription>Vous n'avez aucune clé API pour le moment</CardDescription>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="w-4 h-4 mr-2" /> Créer une clé
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Aucune clé API</p>
            <p className="text-sm mt-1">Créez votre première clé pour utiliser Nexora dans VS Code</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
