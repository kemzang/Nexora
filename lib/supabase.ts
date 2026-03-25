import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dgrrkeugniijfhagmplm.supabase.co'
const supabaseAnonKey = 'sb_publishable_Y7FC-uZEbAewCYs7CuP8yQ_NLnsN07t'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          last_login: string | null
          is_active: boolean
          email_verified: boolean
          verification_token: string | null
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          last_login?: string | null
          is_active?: boolean
          email_verified?: boolean
          verification_token?: string | null
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          last_login?: string | null
          is_active?: boolean
          email_verified?: boolean
          verification_token?: string | null
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number | null
          price_yearly: number | null
          tokens_per_month: number
          features: any
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          tokens_per_month: number
          features?: any
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number | null
          price_yearly?: number | null
          tokens_per_month?: number
          features?: any
          is_active?: boolean
          created_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          stripe_subscription_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          stripe_subscription_id?: string | null
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      token_transactions: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          transaction_type: string
          amount: number
          balance_after: number
          description: string | null
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          transaction_type: string
          amount: number
          balance_after: number
          description?: string | null
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          transaction_type?: string
          amount?: number
          balance_after?: number
          description?: string | null
          metadata?: any
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_name: string
          api_key_hash: string
          permissions: any
          rate_limit_per_hour: number
          is_active: boolean
          expires_at: string | null
          last_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key_name: string
          api_key_hash: string
          permissions?: any
          rate_limit_per_hour?: number
          is_active?: boolean
          expires_at?: string | null
          last_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key_name?: string
          api_key_hash?: string
          permissions?: any
          rate_limit_per_hour?: number
          is_active?: boolean
          expires_at?: string | null
          last_used?: string | null
          created_at?: string
        }
      }
      usage_sessions: {
        Row: {
          id: string
          user_id: string
          api_key_id: string | null
          session_type: string
          tokens_used: number
          model_used: string | null
          request_data: any
          response_data: any
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          api_key_id?: string | null
          session_type: string
          tokens_used: number
          model_used?: string | null
          request_data?: any
          response_data?: any
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          api_key_id?: string | null
          session_type?: string
          tokens_used?: number
          model_used?: string | null
          request_data?: any
          response_data?: any
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      ai_models: {
        Row: {
          id: string
          name: string
          provider: string
          model_id: string
          cost_per_token: number | null
          max_tokens: number | null
          capabilities: any
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          provider: string
          model_id: string
          cost_per_token?: number | null
          max_tokens?: number | null
          capabilities?: any
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          provider?: string
          model_id?: string
          cost_per_token?: number | null
          max_tokens?: number | null
          capabilities?: any
          is_active?: boolean
          created_at?: string
        }
      }
      response_templates: {
        Row: {
          id: string
          name: string
          category: string
          template_content: string
          variables: any
          model_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          template_content: string
          variables?: any
          model_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          template_content?: string
          variables?: any
          model_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      system_logs: {
        Row: {
          id: string
          level: string
          message: string
          context: any
          user_id: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level: string
          message: string
          context?: any
          user_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: string
          message?: string
          context?: any
          user_id?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          stripe_invoice_id: string | null
          amount: number
          currency: string
          status: string
          due_date: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          stripe_invoice_id?: string | null
          amount: number
          currency?: string
          status: string
          due_date?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          stripe_invoice_id?: string | null
          amount?: number
          currency?: string
          status?: string
          due_date?: string | null
          paid_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
