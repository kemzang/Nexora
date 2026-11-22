'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { retourApresFournisseur } from '@/lib/oauthRetour'
import { AuthService } from '@/lib/supabase/auth'
import type { AuthUser, LoginCredentials, RegisterCredentials } from '@/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  token: string | null
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string, token?: string }>
  signUp: (credentials: RegisterCredentials) => Promise<{ error?: string, token?: string }>
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const currentUser = await AuthService.getCurrentUser()
          setUser(currentUser)
          setToken(session.access_token)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Filet de securite : tant que `loading` est vrai, l'en-tete du site
    // n'affiche NI les boutons de connexion NI le lien Dashboard. Une promesse
    // d'auth qui pend laissait donc une barre de navigation amputee, sans
    // aucune erreur visible. Au pire on affiche l'etat deconnecte, ce qui est
    // recuperable ; rester bloque ne l'est pas.
    const failsafe = setTimeout(() => setLoading(false), 8000)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser = await AuthService.getCurrentUser()
          setUser(authUser)
          setToken(session.access_token)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setToken(null)
        } else if (session?.access_token) {
          /*
           * TOKEN_REFRESHED, et tout evenement qui apporte une session.
           *
           * Les jetons Supabase expirent au bout d'une heure. Le client les
           * renouvelle tout seul en arriere-plan, mais cet ecouteur ne
           * traitait que la connexion et la deconnexion : le contexte gardait
           * donc l'ancien jeton, desormais expire, jusqu'au rechargement de
           * la page.
           *
           * Toute section qui s'en servait pour appeler notre API recevait
           * alors un 401 — « Unauthorized » sur les factures, le
           * telechargement du PDF en echec, et la meme chose sur
           * l'abonnement et l'historique. Le symptome n'apparaissait qu'apres
           * une heure d'onglet ouvert, ce qui le rendait difficile a
           * reproduire.
           */
          setToken(session.access_token)
        }
      }
    )

    return () => {
      clearTimeout(failsafe)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (credentials: LoginCredentials) => {
    setLoading(true)
    try {
      // Meme filet de securite que getSession() ailleurs dans le code :
      // signInWithPassword() peut rester bloque indefiniment (verrou
      // navigator.locks partage entre onglets du meme navigateur) sans
      // jamais resoudre ni rejeter, laissant le bouton "Connexion..."
      // tourner pour toujours sans la moindre erreur.
      const result = await Promise.race([
        AuthService.signIn(credentials),
        new Promise<{ user: null; session: null; error: string }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                user: null,
                session: null,
                error:
                  'La connexion prend trop de temps. Ferme les autres onglets Nexora ouverts et réessaie.',
              }),
            10000,
          ),
        ),
      ])
      if (result.error) {
        return { error: result.error }
      }
      if (result.user && result.session) {
        setUser(result.user)
        setToken(result.session.access_token)
        return { error: undefined, token: result.session.access_token }
      }
      return { error: 'Erreur lors de la récupération de la session' }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (credentials: RegisterCredentials) => {
    setLoading(true)
    try {
      const result = await AuthService.signUp(credentials)
      if (result.error) {
        return { error: result.error }
      }
      if (result.user && result.session) {
        setUser(result.user)
        setToken(result.session.access_token)
        return { error: undefined, token: result.session.access_token }
      }
      return { error: undefined, token: undefined } // Succès mais confirmation email requise
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    // L'etat local est vide AVANT l'appel reseau, pas apres : des cette
    // ligne l'utilisateur est deconnecte pour toute l'application, et la
    // redirection peut partir sans attendre le serveur.
    //
    // `setLoading(true)` a ete retire : il basculait le tableau de bord sur
    // son rond de chargement, puis l'attente de la revocation le laissait
    // tourner indefiniment quand l'appel ne rendait pas la main. Il n'y a
    // rien a attendre pour se deconnecter.
    setUser(null)
    setToken(null)
    try {
      await AuthService.signOut()
    } catch (error) {
      // La session locale est deja effacee : l'utilisateur est parti, meme
      // si la revocation cote serveur a echoue.
      console.error('Error signing out:', error)
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUser = await AuthService.getCurrentUser()
      setUser(currentUser)
      if (session) setToken(session.access_token)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  /**
   * Connexion ou inscription via un fournisseur (OAuth Supabase).
   *
   * Le retour se fait sur la PAGE COURANTE, parametres compris, et non
   * sur /dashboard. C'est ce qui sauve la connexion depuis un editeur :
   * /auth/login?callback=…&state=… porte de quoi rendre son jeton a VS
   * Code, et un retour sur /dashboard perdait ces parametres — l'editeur
   * attendait alors un jeton qui n'arrivait jamais, sans message.
   *
   * L'effet deja en place sur les pages de connexion et d'inscription
   * fait le reste des que la session apparait : il n'y a rien a dupliquer
   * ici.
   */
  const signInWithProvider = async (
    provider: 'google' | 'github',
  ): Promise<{ error?: string }> => {
    const redirectTo =
      typeof window !== 'undefined'
        ? retourApresFournisseur(window.location.href)
        : undefined

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })

    if (!error) return {}

    // « Unsupported provider » veut dire que le fournisseur n'est pas
    // active cote Supabase. Le message brut n'aide personne.
    const message = /not enabled|unsupported provider/i.test(error.message)
      ? `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not available right now.`
      : error.message
    return { error: message }
  }

  const value: AuthContextType = {
    user,
    loading,
    token,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
