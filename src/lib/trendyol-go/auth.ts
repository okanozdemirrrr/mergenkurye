import type { TrendyolGoAuth } from './types'

/**
 * Basic auth: apiKey:apiSecret → base64
 * Veya panelde verilen hazır basicToken (zaten base64) kullanılır.
 */
export function buildAuthorizationHeader(auth: TrendyolGoAuth): string {
  if (auth.basicToken?.trim()) {
    const token = auth.basicToken.trim().replace(/^Basic\s+/i, '')
    return `Basic ${token}`
  }
  if (!auth.apiKey || !auth.apiSecret) {
    throw new Error('api_key+api_secret veya basic_token gerekli')
  }
  const raw = `${auth.apiKey}:${auth.apiSecret}`
  const b64 = Buffer.from(raw, 'utf8').toString('base64')
  return `Basic ${b64}`
}

export function buildRequiredHeaders(auth: TrendyolGoAuth): Record<string, string> {
  return {
    Authorization: buildAuthorizationHeader(auth),
    'Content-Type': 'application/json',
    'x-agentname': auth.agentName,
    'x-executor-user': auth.executorEmail,
  }
}
