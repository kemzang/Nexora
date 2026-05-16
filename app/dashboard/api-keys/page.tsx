'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, Plus, Copy, Trash2, ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function ApiKeysPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
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
            <h1 className="text-2xl font-bold">Clés API</h1>
            <p className="text-muted-foreground text-sm">Gérez vos clés d'accès pour VS Code et l'API Nexora</p>
          </div>
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
    </div>
  )
}
