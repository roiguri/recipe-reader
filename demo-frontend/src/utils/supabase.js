import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.REACT_APP_SUPABASE_URL
const supabaseKey = import.meta.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)