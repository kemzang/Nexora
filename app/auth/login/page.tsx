'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { emailSchema } from '@/lib/email'
import { PasswordInput } from '@/components/ui/password-input'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { OAuthButtons, PastilleDerniereFois } from '@/components/patterns/oauth-buttons'
import { lireMethode, noterMethode } from '@/lib/derniereMethode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Code, ArrowRight } from 'lucide-react'
import { BrandLogo } from '@/components/patterns/brand-logo'
import { useToast } from '@/components/ui/toast'
import { LoadingScreen } from '@/components/patterns/loading-screen'

const loginSchema = z.object({
  email: emailSchema(),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [redirectToken, setRedirectToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Par quoi cette personne est passee la derniere fois, sur CE
  // navigateur. Lu dans un effet : localStorage n'existe pas au rendu
  // serveur, et le lire au rendu ferait clignoter la pastille.
  const [derniereMethode, setDerniereMethode] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, user, token } = useAuth()
  const { showToast } = useToast()

  const callback = searchParams.get('callback')
  const redirect = searchParams.get('redirect')
  const state = searchParams.get('state')

  useEffect(() => {
    setDerniereMethode(lireMethode())
  }, [])

  useEffect(() => {
    if (user && token) {
      if (callback) {
        if (!success) {
          setSuccess(true)
          setRedirectToken(token)
        }
      } else if (redirect) {
        window.location.href = redirect
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, token, callback, redirect, router, success])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const getRedirectUrl = (tokenValue: string) => {
    if (!callback) return null
    const baseUrl = "vscode://nexoracoding.nexora-ai"
    const params = new URLSearchParams()
    params.append('token', tokenValue)
    if (state) params.append('state', state)
    return `${baseUrl}?${params.toString()}`
  }

  const onSubmit = async (data: LoginFormData) => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const result = await signIn(data)
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        noterMethode('password')
        showToast('Signed in', 'success')
        if (callback) {
          if (result.token) {
            setRedirectToken(result.token)
            const redirectUrl = getRedirectUrl(result.token)
            if (redirectUrl) window.location.assign(redirectUrl)
          }
          setSuccess(true)
        } else if (redirect) {
          window.location.href = redirect
        } else {
          router.push('/dashboard')
        }
      }
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  if (success && callback) {
    const finalToken = redirectToken || token
    const redirectUrl = finalToken ? getRedirectUrl(finalToken) : null
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-foreground/[0.03] blur-[120px] rounded-full" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center w-full max-w-md relative z-10"
        >
          <Card className="glass p-10">
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-xl"
            >
              <Code className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Signed in
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your account is ready. Click below to return to VS Code.
            </p>
            <div className="space-y-3">
              {redirectUrl ? (
                <a
                  href={redirectUrl}
                  className="w-full font-semibold py-3.5 rounded-xl text-sm group transition-all flex items-center justify-center no-underline"
                >
                  <Button variant="outline" className="w-full h-11 rounded-xl font-semibold">
                    Ouvrir VS Code
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </a>
              ) : (
                <Button disabled className="w-full bg-muted text-muted-foreground py-6 rounded-xl text-sm">
                  Lien non disponible
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Go to the web dashboard
              </Button>
            </div>
          </Card>
          <p className="mt-6 text-xs text-muted-foreground">
            If nothing happens, check that VS Code is installed.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-foreground/[0.02] blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/[0.02] blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="glass">
          <CardHeader className="text-center space-y-5 pt-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
              className="flex justify-center"
            >
              <BrandLogo size={56} />
            </motion.div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-bold tracking-tight">Nexora</CardTitle>
              <CardDescription className="text-muted-foreground">Sign in to continue</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-8 pt-4">
            {error && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm ml-0.5">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                  className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all"
                />
                {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-0.5">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs text-foreground/70 hover:text-foreground transition-colors">
                    Forgot?
                  </Link>
                </div>
                {/* L'oeil, mais AUCUNE regle de format ici : les comptes
                    crees avant ces exigences ont des mots de passe a six
                    caracteres, et les refuser a la connexion enfermerait
                    dehors des gens qui n'ont rien fait de mal. */}
                <PasswordInput
                  id="password"
                  {...register('password')}
                  className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all"
                />
                {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="outline"
                className="w-full font-semibold h-11 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                ) : (
                  <>
                    Sign in <ArrowRight className="ml-2 h-4 w-4" />
                    {/* Le rappel se pose aussi sur le mot de passe : sans
                        lui, quelqu'un qui en a un croirait etre passe par
                        un fournisseur, puisque seuls ceux-la porteraient
                        une pastille. */}
                    {derniereMethode === 'password' && (
                      <span className="ml-2">
                        <PastilleDerniereFois />
                      </span>
                    )}
                  </>
                )}
              </Button>
            </form>

            <OAuthButtons onError={(m) => setError(m || null)} />

            <div className="text-center pt-1">
              <p className="text-sm text-muted-foreground">
                No account yet?{' '}
                <Link
                  href={`/auth/register${callback ? `?callback=${encodeURIComponent(callback)}` : ''}`}
                  className="text-foreground/70 hover:text-foreground transition-colors font-medium"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <LoadingScreen message="Loading…" />
    }>
      <LoginForm />
    </Suspense>
  )
}
