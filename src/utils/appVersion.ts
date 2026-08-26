/**
 * @file src/utils/appVersion.ts
 * @description Semver karşılaştırma + native / bake sürüm okuma
 */

/** APK build ile senkron tutulmalı (android versionName / package.json) */
export const BAKED_APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || '1.4.16'

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.aldagel.mergen'

export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '').split('-')[0].split('+')[0]
}

/** a < b → negatif, a == b → 0, a > b → pozitif */
export function compareSemver(a: string, b: string): number {
  const pa = normalizeVersion(a)
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
  const pb = normalizeVersion(b)
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function isVersionBelow(current: string, minimum: string): boolean {
  if (!current?.trim() || !minimum?.trim()) return false
  return compareSemver(current, minimum) < 0
}

/**
 * Native Android'de APK versionName; aksi halde bake edilen web sürümü.
 */
export async function getCurrentAppVersion(): Promise<string> {
  if (typeof window === 'undefined') return BAKED_APP_VERSION

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { App } = await import('@capacitor/app')
      const info = await App.getInfo()
      if (info?.version?.trim()) return info.version.trim()
    }
  } catch {
    // App plugin yoksa bake sürüme düş
  }

  return BAKED_APP_VERSION
}
