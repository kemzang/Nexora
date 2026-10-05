'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Globe, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function ParametresSection() {
  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    setFirstName(user?.firstName || '')
    setLastName(user?.lastName || '')
  }, [user?.firstName, user?.lastName])

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      })
      if (error) throw error
      await refreshUser()
      showToast('Profile updated', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated', 'success')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profil */}
      <Card className="glass">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-foreground/70" />
            Profil
          </CardTitle>
          <CardDescription className="text-sm">This information appears on your invoices and your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="bg-card border-border/50 focus:border-foreground/30"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="bg-card border-border/50 focus:border-foreground/30"
                maxLength={50}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50 border-border/50 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">The sign-in email cannot be changed here.</p>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile || (firstName === (user?.firstName || '') && lastName === (user?.lastName || ''))}
            size="sm"
            className="bg-primary text-primary-foreground"
          >
            {savingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Save</>}
          </Button>
        </CardContent>
      </Card>

      {/* Langue */}
      <Card className="glass">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-foreground/70" />
            Langue
          </CardTitle>
          <CardDescription className="text-sm">Display language for the site and the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="glass">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-foreground/70" />
            Password
          </CardTitle>
          <CardDescription className="text-sm">Choose a new password (8 characters minimum).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{passwordError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-card border-border/50 focus:border-foreground/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirm</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="bg-card border-border/50 focus:border-foreground/30"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || !confirmPassword}
            size="sm"
            className="bg-primary text-primary-foreground"
          >
            {savingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : 'Change password'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
