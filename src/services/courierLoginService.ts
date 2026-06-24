import { supabase } from '@/app/lib/supabase'

export type CourierLoginRecord = {
  id: string
  full_name: string | null
  username: string
  account_status: string | null
}

type CourierLoginResult =
  | { ok: true; courier: CourierLoginRecord }
  | { ok: false; reason: 'invalid_credentials' | 'db_error'; message?: string }

function isMissingCourierLoginRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    message.includes('courier_login') ||
    message.includes('could not find the function')
  )
}

function mapAccountStatusError(status: string | null | undefined): string | null {
  if (status === 'terminated') {
    return '❌ Hesabınız kapatılmış! Yöneticinizle iletişime geçin.'
  }
  if (status === 'suspended') {
    return '❌ Hesabınız askıya alınmış! Yöneticinizle iletişime geçin.'
  }
  return null
}

async function loginViaDirectQuery(
  username: string,
  password: string
): Promise<CourierLoginResult> {
  const { data, error } = await supabase
    .from('couriers')
    .select('id, full_name, username, account_status')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle()

  if (error) {
    return { ok: false, reason: 'db_error', message: error.message }
  }

  if (!data) {
    return { ok: false, reason: 'invalid_credentials' }
  }

  const accountError = mapAccountStatusError(data.account_status)
  if (!accountError) {
    await supabase
      .from('couriers')
      .update({ is_active: true, status: 'idle' })
      .eq('id', data.id)
  }

  return { ok: true, courier: data }
}

/**
 * Pasif (is_active=false) kuryeler de giriş yapabilsin.
 * Önce SECURITY DEFINER RPC dener; yoksa doğrudan sorguya düşer.
 */
export async function authenticateCourier(
  username: string,
  password: string
): Promise<CourierLoginResult> {
  const trimmedUsername = username.trim()

  const { data: rpcRows, error: rpcError } = await supabase.rpc('courier_login', {
    p_username: trimmedUsername,
    p_password: password,
  })

  if (!rpcError) {
    const courier = (rpcRows as CourierLoginRecord[] | null)?.[0]
    if (!courier) {
      return { ok: false, reason: 'invalid_credentials' }
    }
    return { ok: true, courier }
  }

  if (!isMissingCourierLoginRpc(rpcError)) {
    return { ok: false, reason: 'db_error', message: rpcError.message }
  }

  return loginViaDirectQuery(trimmedUsername, password)
}

export function getCourierAccountStatusError(
  accountStatus: string | null | undefined
): string | null {
  return mapAccountStatusError(accountStatus)
}
