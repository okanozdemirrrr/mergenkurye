/**
 * @file src/app/admin/ayarlar/page.tsx
 * @description Admin Ayarlar — Otomatik Atama Saatleri
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Clock, Save } from 'lucide-react'

const START_KEY = 'auto_assign_start_time'
const END_KEY = 'auto_assign_end_time'
const DEFAULT_START = '00:30'
const DEFAULT_END = '02:00'

/** HTML time input için HH:MM normalize */
function toTimeInputValue(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  // "00:30:00" → "00:30"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return fallback
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export default function AdminAyarlarPage() {
  const [startTime, setStartTime] = useState(DEFAULT_START)
  const [endTime, setEndTime] = useState(DEFAULT_END)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [START_KEY, END_KEY])

      if (error) throw error

      const map = Object.fromEntries((data || []).map((row) => [row.key, row.value]))
      setStartTime(toTimeInputValue(map[START_KEY], DEFAULT_START))
      setEndTime(toTimeInputValue(map[END_KEY], DEFAULT_END))
    } catch (err: unknown) {
      console.error('Ayarlar yüklenemedi:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ayarlar yüklenirken hata oluştu',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.rpc('set_auto_assign_hours', {
        p_start_time: startTime,
        p_end_time: endTime,
      })

      if (error) throw error

      const result = data as { success?: boolean; start_time?: string; end_time?: string } | null
      if (result?.start_time) setStartTime(toTimeInputValue(result.start_time, startTime))
      if (result?.end_time) setEndTime(toTimeInputValue(result.end_time, endTime))

      setMessage({
        type: 'success',
        text: `Kaydedildi: ${result?.start_time ?? startTime} — ${result?.end_time ?? endTime}`,
      })
    } catch (err: unknown) {
      console.error('Ayar kaydı hatası:', err)
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Kayıt sırasında hata oluştu',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6 text-orange-400" strokeWidth={1.5} />
          Ayarlar
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Sistem geneli yapılandırma. Saatler Europe/Istanbul zaman dilimine göredir.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-slate-900 border border-slate-800 rounded-md p-6 space-y-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-200 tracking-tight">
            Otomatik Atama Saatleri
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Bu aralıkta gelen ve kuryesi atanmamış paketler, gece vardiyacısı kuryeye otomatik atanır.
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500 text-sm">Ayarlar yükleniyor…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Başlangıç Saati
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Bitiş Saati
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </label>
          </div>
        )}

        {message && (
          <div
            className={`p-3 rounded-md text-sm border ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-red-950/40 border-red-800/50 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" strokeWidth={1.5} />
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
