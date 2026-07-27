/**
 * @file src/utils/nativePlatform.ts
 * @description Native Android (Play Store / Capacitor) vs mobil web tarayıcı ayrımı
 */
import { Capacitor } from '@capacitor/core'

/**
 * Sadece Play Store / Capacitor Android WebView.
 * Chrome/Safari mobil tarayıcı → false (force update GÖRMEZ).
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false

  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return true
    }
  } catch {
    // Capacitor yoksa UA yedeklerine düş
  }

  const ua = navigator.userAgent || ''
  if (!/Android/i.test(ua)) return false

  // Capacitor global (eski webview köprüleri)
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor
  if (cap?.isNativePlatform?.() && cap.getPlatform?.() === 'android') {
    return true
  }

  // Android System WebView işareti (; wv) — Chrome Mobile'da yok
  if (/\bwv\b/.test(ua)) return true

  return false
}
