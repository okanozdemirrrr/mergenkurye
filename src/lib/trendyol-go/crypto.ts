/**
 * AES-256-GCM şifreleme — yalnızca sunucu (INTEGRATION_SECRETS_KEY).
 * NEXT_PUBLIC_ öneki YASAK; client bundle'a girmemeli.
 */

const KEY_ENV = 'INTEGRATION_SECRETS_KEY'
const CURRENT_KEY_VERSION = 1

function getRawKey(): string {
  const key = process.env[KEY_ENV]?.trim().replace(/^["']|["']$/g, '')
  if (!key || key.length < 32) {
    throw new Error(`${KEY_ENV} tanımlı değil veya en az 32 karakter olmalı`)
  }
  return key
}

async function deriveAesKey(raw: string, version: number): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(raw),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`trendyol-go-v${version}`),
      iterations: 100000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return Buffer.from(u8).toString('base64')
}

function fromBase64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, 'base64'))
}

/** Şifreli metin formatı: v{version}:{iv_b64}:{cipher_b64} */
export async function encryptSecret(plaintext: string, keyVersion = CURRENT_KEY_VERSION): Promise<string> {
  if (!plaintext) return ''
  const aesKey = await deriveAesKey(getRawKey(), keyVersion)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintext)
  )
  // iv'nin kendisini encode et — iv.buffer kullanma (ArrayBuffer offset hatası)
  return `v${keyVersion}:${toBase64(iv)}:${toBase64(new Uint8Array(cipher))}`
}

export async function decryptSecret(ciphertext: string): Promise<string> {
  if (!ciphertext) return ''
  const parts = ciphertext.split(':')
  if (parts.length !== 3 || !parts[0].startsWith('v')) {
    throw new Error('Geçersiz şifreli secret formatı')
  }
  const version = Number(parts[0].slice(1))
  const ivRaw = fromBase64(parts[1])
  // Eski buggy encode: iv.buffer fazla byte içerebilirdi — ilk 12 byte dene
  const iv = ivRaw.length === 12 ? ivRaw : ivRaw.slice(0, 12)
  const data = fromBase64(parts[2])
  const aesKey = await deriveAesKey(getRawKey(), version)
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, data)
    return new TextDecoder().decode(plain)
  } catch (e) {
    throw new Error(
      'Secret çözülemedi — INTEGRATION_SECRETS_KEY eşleşmiyor veya secret yeniden kaydedilmeli'
    )
  }
}

export function getCurrentKeyVersion(): number {
  return CURRENT_KEY_VERSION
}

/** Gösterim için maske: ju8H...Xqm6 */
export function maskSecret(value: string | null | undefined, visible = 4): string {
  if (!value) return ''
  if (value.length <= visible * 2) return '*'.repeat(Math.min(8, value.length))
  return `${value.slice(0, visible)}...${value.slice(-visible)}`
}

export function maskAuthorizationHeader(headerValue: string): string {
  if (!headerValue) return ''
  const m = headerValue.match(/^(Basic\s+)(.+)$/i)
  if (m) return `${m[1]}${maskSecret(m[2])}`
  return maskSecret(headerValue)
}
