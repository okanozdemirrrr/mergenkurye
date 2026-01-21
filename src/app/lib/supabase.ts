import { createClient } from '@supabase/supabase-js'

// Build sırasında env variables kontrolü
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Geliştirme ortamında uyarı ver ama build'i durdurma
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error('⚠️ Supabase environment variables are missing!')
  }
}

// Supabase client'ı oluştur (boş değerlerle bile çalışsın)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true // Session'ı persist et
    }
  }
)
