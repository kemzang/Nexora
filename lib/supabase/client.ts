import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dgrrkeugniijfhagmplm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y7FC-uZEbAewCYs7CuP8yQ_NLnsN07t'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
