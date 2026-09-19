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
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Sistem durumu alınamadı:', error)
          return
        }

        if (data) {
          setIsSystemActive(data.value === 'true')
        } else {
          // Varsayılan olarak aktif (tabloda yoksa)
          setIsSystemActive(true)
        }
      } catch (err) {
        console.error('Sistem durumu yüklenirken hata:', err)
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
      const { data: existingData } = await supabase
        .from('app_settings')
        .select('key')
        .eq('key', 'is_system_active')
        .single()

      let error
      if (existingData) {
        // Güncelle
        const res = await supabase
          .from('app_settings')
          .update({ value: newState.toString(), updated_at: new Date().toISOString() })
          .eq('key', 'is_system_active')
        error = res.error
      } else {
        // Oluştur
        const res = await supabase
          .from('app_settings')
          .insert({ key: 'is_system_active', value: newState.toString() })
        error = res.error
      }

      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Sistem durumu güncellenemedi:', err)
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
