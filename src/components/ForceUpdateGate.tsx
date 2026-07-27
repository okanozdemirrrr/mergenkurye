/**
 * @file src/components/ForceUpdateGate.tsx
 * @description Native Android zorunlu güncelleme kalkanı (kapatılamaz fullscreen)
 */
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { isNativeAndroidApp } from '@/utils/nativePlatform'
import {
  PLAY_STORE_URL,
  getCurrentAppVersion,
  isVersionBelow,
} from '@/utils/appVersion'

type GateState = 'idle' | 'checking' | 'ok' | 'force'

async function fetchMinRequiredVersion(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'min_required_version')
    .maybeSingle()

  if (error) {
    console.warn('[ForceUpdate] min_required_version okunamadı:', error.message)
    return null
  }

  const value = data?.value?.trim()
  return value || null
}

export function ForceUpdateGate() {
  const [state, setState] = useState<GateState>('idle')
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [minVersion, setMinVersion] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      // Web / iOS / tarayıcı → asla gösterme
      if (!isNativeAndroidApp()) {
        if (!cancelled) setState('ok')
        return
      }

      if (!cancelled) setState('checking')

      try {
        const [current, minimum] = await Promise.all([
          getCurrentAppVersion(),
          fetchMinRequiredVersion(),
        ])

        if (cancelled) return

        setCurrentVersion(current)
        setMinVersion(minimum || '')

        // Ağ / ayar yoksa uygulamayı kilitleme (fail-open)
        if (!minimum) {
          setState('ok')
          return
        }

        setState(isVersionBelow(current, minimum) ? 'force' : 'ok')
      } catch (err) {
        console.warn('[ForceUpdate] kontrol hatası (fail-open):', err)
        if (!cancelled) setState('ok')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (state !== 'force') return null

  const openPlayStore = () => {
    window.location.href = PLAY_STORE_URL
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      aria-describedby="force-update-desc"
    >
      {/* Bulanık arka plan — tıklama ile kapanmaz */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 px-6 py-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15 ring-1 ring-orange-500/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-orange-400"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
        </div>

        <h2
          id="force-update-title"
          className="text-center text-xl font-bold tracking-tight text-white"
        >
          Güncelleme Gerekli
        </h2>
        <p
          id="force-update-desc"
          className="mt-3 text-center text-sm leading-relaxed text-slate-300"
        >
          Uygulamanın yeni bir sürümü mevcut. Devam etmek için lütfen güncelleyin.
        </p>

        {(currentVersion || minVersion) && (
          <p className="mt-4 text-center text-xs text-slate-500">
            {currentVersion && <span>Mevcut: v{currentVersion}</span>}
            {currentVersion && minVersion && <span className="mx-2">·</span>}
            {minVersion && <span>Gerekli: v{minVersion}+</span>}
          </p>
        )}

        <button
          type="button"
          onClick={openPlayStore}
          className="mt-8 w-full rounded-xl bg-orange-500 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-[0.98]"
        >
          Hemen Güncelle
        </button>
      </div>
    </div>
  )
}
