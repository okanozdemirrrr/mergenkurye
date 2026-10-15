import { createClient } from '@supabase/supabase-js'

// Build sırasında env variables kontrolü - ASLA HATA VERME!
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const supabaseUrl = rawSupabaseUrl || 'https://placeholder.supabase.co'
const supabaseAnonKey = rawSupabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'

// Sadece client-side'da uyarı ver
if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn('⚠️ Supabase environment variables are missing! Using placeholder values.')
}

// Supabase client'ı oluştur - her durumda çalışsın
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'supabase.auth.token'
  }
})
