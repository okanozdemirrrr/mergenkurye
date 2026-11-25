import { maskSecret } from './crypto'

const SENSITIVE_KEYS = [
  'api_secret',
  'apiSecret',
  'basic_token',
  'basicToken',
  'authorization',
  'Authorization',
  'password',
  'api_key',
  'apiKey',
]

export function maskSensitiveDeep(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(maskSensitiveDeep)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((s) => s.toLowerCase() === k.toLowerCase())) {
        out[k] = typeof v === 'string' ? maskSecret(v) : '***'
      } else {
        out[k] = maskSensitiveDeep(v)
      }
    }
    return out
  }
  return value
}

export function summarizeForLog(payload: unknown, maxLen = 4000): string {
  try {
    const masked = maskSensitiveDeep(payload)
    const s = JSON.stringify(masked)
    if (s.length <= maxLen) return s
    return s.slice(0, maxLen) + '…[truncated]'
  } catch {
    return '[unserializable]'
  }
}
