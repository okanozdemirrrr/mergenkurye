/**
 * HttpOnly imzalı panel oturumu.
 * restaurantId / admin rolü çerezden türetilir — istek gövdesinden ALINMAZ.
 * İmza anahtarı: PANEL_SESSION_SECRET veya INTEGRATION_SECRETS_KEY (sunucu only).
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

export const PANEL_SESSION_COOKIE = 'panel_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 gün

export type PanelSessionPayload =
  | { role: 'restaurant'; restaurantId: string; exp: number }
  | { role: 'admin'; exp: number }

function getSigningSecret(): string {
  const key =
    process.env.PANEL_SESSION_SECRET || process.env.INTEGRATION_SECRETS_KEY
  if (!key || key.length < 32) {
    throw new Error(
      'PANEL_SESSION_SECRET veya INTEGRATION_SECRETS_KEY (min 32 karakter) gerekli'
    )
  }
  return key
}

function sign(payloadB64: string): string {
  return createHmac('sha256', getSigningSecret()).update(payloadB64).digest('base64url')
}

export function encodePanelSession(payload: PanelSessionPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = sign(payloadB64)
  return `${payloadB64}.${sig}`
}

export function decodePanelSession(token: string | undefined | null): PanelSessionPayload | null {
  if (!token) return null
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null
  let expected: string
  try {
    expected = sign(payloadB64)
  } catch {
    return null
  }
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as PanelSessionPayload
    if (!payload?.exp || Date.now() > payload.exp) return null
    if (payload.role === 'restaurant' && !payload.restaurantId) return null
    if (payload.role !== 'restaurant' && payload.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

export function panelSessionCookieOptions(token: string) {
  return {
    name: PANEL_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SEC,
  }
}

export function buildRestaurantSession(restaurantId: string): string {
  return encodePanelSession({
    role: 'restaurant',
    restaurantId,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  })
}

export function buildAdminSession(): string {
  return encodePanelSession({
    role: 'admin',
    exp: Date.now() + MAX_AGE_SEC * 1000,
  })
}

export function applySessionCookie(res: NextResponse, token: string): NextResponse {
  const opts = panelSessionCookieOptions(token)
  res.cookies.set(opts)
  return res
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: PANEL_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}

export async function getPanelSessionFromCookies(): Promise<PanelSessionPayload | null> {
  const jar = await cookies()
  return decodePanelSession(jar.get(PANEL_SESSION_COOKIE)?.value)
}

export function getPanelSessionFromRequest(req: NextRequest): PanelSessionPayload | null {
  return decodePanelSession(req.cookies.get(PANEL_SESSION_COOKIE)?.value)
}

export function requireRestaurantSession(
  req: NextRequest
): { ok: true; restaurantId: string } | { ok: false; status: number; error: string } {
  const session = getPanelSessionFromRequest(req)
  if (!session) {
    return { ok: false, status: 401, error: 'Oturum gerekli. Lütfen tekrar giriş yapın.' }
  }
  if (session.role !== 'restaurant') {
    return { ok: false, status: 403, error: 'Bu işlem yalnızca restoran oturumu ile yapılabilir.' }
  }
  return { ok: true, restaurantId: session.restaurantId }
}

export function requireAdminSession(
  req: NextRequest
): { ok: true } | { ok: false; status: number; error: string } {
  const session = getPanelSessionFromRequest(req)
  if (!session) {
    return { ok: false, status: 401, error: 'Oturum gerekli. Lütfen tekrar giriş yapın.' }
  }
  if (session.role !== 'admin') {
    return { ok: false, status: 403, error: 'Bu işlem yalnızca admin oturumu ile yapılabilir.' }
  }
  return { ok: true }
}
