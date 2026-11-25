import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Service-role client — yalnızca sunucu / Edge. */
function stripEnv(v: string | undefined): string | undefined {
  return v?.trim().replace(/^["']|["']$/g, '')
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = stripEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = stripEnv(
    process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ve SERVICE_ROLE_KEY gerekli')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
