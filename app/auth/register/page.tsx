'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Code, Rocket, ArrowRight } from 'lucide-react'
import { BrandLogo } from '@/components/patterns/brand-logo'
import { useToast } from '@/components/ui/toast'

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
})

type RegisterFormData = z.infer<typeof registerSchema>

function RegisterForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [redirectToken, setRedirectToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, user, token } = useAuth()
  const { showToast } = useToast()

  const callback = searchParams.get('callback')
  const state = searchParams.get('state')

  useEffect(() => {
    if (user && token && callback) {
      if (!success) { setSuccess(true); setRedirectToken(token) }
    } else if (user && token && !callback) {
      router.push('/dashboard')
    }
  }, [user, token, callback, router, success])

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const getRedirectUrl = (tokenValue: string) => {
    if (!callback) return null
    const baseUrl = "vscode://nexoracoding.nexora-ai/auth"
    const params = new URLSearchParams()
    params.append('token', tokenValue)
    if (state) params.append('state', state)
    return `${baseUrl}?${params.toString()}`
  }

  const onSubmit = async (data: RegisterFormData) => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const result = await signUp({
        email: data.email, password: data.password,
        firstName: data.firstName, lastName: data.lastName
      })
      if (result.error) {
        setError(result.error); setLoading(false)
      } else {
        showToast('Account created', 'success')
        if (callback && result.token) {
          setRedirectToken(result.token)
          const redirectUrl = getRedirectUrl(result.token)
          if (redirectUrl) window.location.assign(redirectUrl)
          setSuccess(true)
        } else {
          setSuccess(true)
          setTimeout(() => router.push('/auth/login'), 3000)
        }
      }
    } catch {
      setError('An unexpected error occurred'); setLoading(false)
    }
  }

  if (success) {
    const finalToken = redirectToken || token
    const redirectUrl = callback && finalToken ? getRedirectUrl(finalToken) : null
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
              Account created
            </h1>
            {callback && redirectUrl ? (
              <>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Your account has been created. Click below to open VS Code.
                </p>
                <div className="space-y-3">
                  <a
                    href={redirectUrl}
                    className="w-full group transition-all flex items-center justify-center no-underline"
                  >
                    <Button variant="outline" className="w-full font-semibold py-3.5 rounded-xl text-sm">
                      Ouvrir VS Code
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </a>
                  <Button variant="ghost" onClick={() => router.push('/dashboard')} className="w-full text-muted-foreground hover:text-foreground">
                    Go to the web dashboard
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Check your email to activate your account. Redirecting to sign-in…
                </p>
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-foreground/30 border-t-transparent rounded-full animate-spin" />
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-foreground/[0.02] blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/[0.02] blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
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
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Join <span className="gradient-text">Nexora</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Create your account and transform the way you build
                </CardDescription>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm ml-0.5">First name</Label>
                    <Input id="firstName" placeholder="Jean" {...register('firstName')}
                      className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all" />
                    {errors.firstName && <p className="text-red-400 text-xs ml-1">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm ml-0.5">Last name</Label>
                    <Input id="lastName" placeholder="Dupont" {...register('lastName')}
                      className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all" />
                    {errors.lastName && <p className="text-red-400 text-xs ml-1">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm ml-0.5">Email</Label>
                  <Input id="email" type="email" placeholder="vous@exemple.com" {...register('email')}
                    className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all" />
                  {errors.email && <p className="text-red-400 text-xs ml-1">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm ml-0.5">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" {...register('password')}
                    className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all" />
                  {errors.password && <p className="text-red-400 text-xs ml-1">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm ml-0.5">Confirm password</Label>
                  <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')}
                    className="bg-card border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 h-11 rounded-xl transition-all" />
                  {errors.confirmPassword && <p className="text-red-400 text-xs ml-1">{errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" disabled={loading}
                  variant="outline"
                  className="w-full font-semibold h-11 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]">
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Inscription...</>
                  ) : (
                    <><Rocket className="mr-2 h-4 w-4" />Create my account</>
                  )}
                </Button>
              </form>

              <div className="text-center pt-1">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href={`/auth/login${callback ? `?callback=${encodeURIComponent(callback)}` : ''}`}
                    className="text-foreground/70 hover:text-foreground transition-colors font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-foreground/60 animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
