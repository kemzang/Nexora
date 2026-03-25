export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface AuthUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  lastLogin: string | null
}

export interface AuthResponse {
  user: AuthUser | null
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
    user: AuthUser
  } | null
  error?: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
}

export interface EmailVerification {
  token: string
}
