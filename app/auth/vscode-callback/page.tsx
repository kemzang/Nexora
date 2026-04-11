'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'

export default function VSCodeCallbackPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Générer ou récupérer la clé API pour l'extension
    const generateApiKey = async () => {
      try {
        const res = await fetch('/api/auth/generate-extension-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        const data = await res.json()
        
        if (data.success) {
          setApiKey(data.token)
          
          // Essayer de communiquer avec l'extension VS Code
          // Méthode 1: Via URL custom protocol (si configuré dans l'extension)
          try {
            window.location.href = `vscode://nexora.auth-success?token=${data.token}&user=${encodeURIComponent(JSON.stringify(user))}`
          } catch {
            // Si le protocole custom ne marche pas, on affiche juste la clé
          }
        }
      } catch (err) {
        console.error('Erreur génération token:', err)
      } finally {
        setLoading(false)
      }
    }

    generateApiKey()
  }, [user])

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey)
      showToast('Token copié !', 'success')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <p className="text-white">Redirection vers la connexion...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              {loading ? (
                <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
              ) : (
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                {loading ? 'Connexion en cours...' : 'Connexion réussie !'}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {loading ? 'Génération de votre token d\'authentification' : 'Votre extension VS Code devrait maintenant être connectée'}
              </CardDescription>
            </div>
          </CardHeader>

          {!loading && apiKey && (
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-white text-sm">
                  Bonjour <span className="text-purple-400 font-semibold">{user.firstName || user.email}</span> !
                </p>
                
                <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                  <p className="text-gray-300 text-xs mb-2">Token d'authentification :</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-green-400 bg-black/30 px-2 py-1 rounded font-mono break-all">
                      {apiKey}
                    </code>
                    <Button size="sm" variant="ghost" onClick={copyToClipboard} className="text-gray-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-gray-400 text-sm">
                    Si l'extension ne s'est pas connectée automatiquement, copiez le token ci-dessus et collez-le dans VS Code.
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => window.close()} 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      Fermer
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open('/dashboard', '_blank')}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  )
}