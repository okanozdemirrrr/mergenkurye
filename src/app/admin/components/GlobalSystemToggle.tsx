'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

export function GlobalSystemToggle() {
  const [isSystemActive, setIsSystemActive] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'is_system_active')
          .maybeSingle()

        // Kayıt yoksa veya okunamazsa varsayılan: açık
        if (error) {
          console.warn(
            'Sistem durumu alınamadı:',
            error.message || error.code || 'bilinmeyen hata'
          )
          setIsSystemActive(true)
          return
        }

        setIsSystemActive(data?.value === 'true' || data == null)
      } catch (err) {
        console.warn('Sistem durumu yüklenirken hata:', err)
        setIsSystemActive(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSystemStatus()

    // Supabase Realtime aboneliği
    const subscription = supabase
      .channel('public:app_settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: "key=eq.is_system_active"
        },
        (payload) => {
          if (payload.new && 'value' in payload.new) {
            setIsSystemActive(payload.new.value === 'true')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const toggleSystemStatus = async () => {
    const newState = !isSystemActive
    setIsSystemActive(newState) // Optimistic update

    try {
      const { error } = await supabase.from('app_settings').upsert(
        {
          key: 'is_system_active',
          value: newState.toString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      console.warn('Sistem durumu güncellenemedi:', message)
      alert('Sistem durumu güncellenemedi!')
      setIsSystemActive(!newState) // Geri al
    }
  }

  if (isLoading) return null

  return (
    <div className="w-full px-4 py-3 bg-slate-800 rounded-md border border-slate-700 flex items-center justify-between mt-2">
      <span className="text-sm font-medium text-slate-300">
        Sistem Durumu:
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${isSystemActive ? 'text-green-400' : 'text-red-400'}`}>
          {isSystemActive ? 'AÇIK' : 'KAPALI'}
        </span>
        <button
          onClick={toggleSystemStatus}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            isSystemActive ? 'bg-green-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isSystemActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
