import { createClient } from '@supabase/supabase-js'
import { decryptSecret } from '../src/lib/trendyol-go/crypto'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, '')
  const key = process.env.SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('env eksik')
  const s = createClient(url, key)
  const { data, error } = await s
    .from('trendyol_go_integrations')
    .select('api_secret_encrypted')
    .single()
  if (error) throw error
  try {
    const p = await decryptSecret(data!.api_secret_encrypted)
    console.log('decrypt_ok len=' + p.length)
  } catch (e) {
    console.log('decrypt_fail', e instanceof Error ? e.message : e)
  }
}
main()
