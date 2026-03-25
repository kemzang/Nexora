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

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type SubscriptionPlanInsert = Database['public']['Tables']['subscription_plans']['Insert']
export type SubscriptionPlanUpdate = Database['public']['Tables']['subscription_plans']['Update']

export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
export type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert']
export type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']

export type TokenTransaction = Database['public']['Tables']['token_transactions']['Row']
export type TokenTransactionInsert = Database['public']['Tables']['token_transactions']['Insert']
export type TokenTransactionUpdate = Database['public']['Tables']['token_transactions']['Update']

export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update']

export type UsageSession = Database['public']['Tables']['usage_sessions']['Row']
export type UsageSessionInsert = Database['public']['Tables']['usage_sessions']['Insert']
export type UsageSessionUpdate = Database['public']['Tables']['usage_sessions']['Update']

export type AiModel = Database['public']['Tables']['ai_models']['Row']
export type AiModelInsert = Database['public']['Tables']['ai_models']['Insert']
export type AiModelUpdate = Database['public']['Tables']['ai_models']['Update']

export type ResponseTemplate = Database['public']['Tables']['response_templates']['Row']
export type ResponseTemplateInsert = Database['public']['Tables']['response_templates']['Insert']
export type ResponseTemplateUpdate = Database['public']['Tables']['response_templates']['Update']

export type SystemLog = Database['public']['Tables']['system_logs']['Row']
export type SystemLogInsert = Database['public']['Tables']['system_logs']['Insert']
export type SystemLogUpdate = Database['public']['Tables']['system_logs']['Update']

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
