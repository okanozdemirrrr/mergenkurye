'use client'

import { useRef, useState } from 'react'
import { Home, Building2, GraduationCap, MapPin, Loader2, X } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { getCurrentPosition } from '@/utils/getCurrentPosition'
import { normalizePhoneTR } from '@/utils/normalizePhoneTR'

interface SaveCustomerLocationModalProps {
  phoneNumber: string
  customerName?: string
  onClose: () => void
  onSaved: (label: string) => void
}

const QUICK_LABELS = [
  { key: 'ev', label: 'Ev', Icon: Home },
  { key: 'is', label: 'İş/Sanayi', Icon: Building2 },
  { key: 'yurt', label: 'Yurt/Okul', Icon: GraduationCap },
] as const

export default function SaveCustomerLocationModal({
  phoneNumber,
  customerName,
  onClose,
  onSaved,
}: SaveCustomerLocationModalProps) {
  const [saving, setSaving] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  // React render'ını beklemeden, aynı milisaniyedeki ikinci çağrıyı da engeller.
  const savingLockRef = useRef(false)

  const saveLocation = async (label: string) => {
    if (savingLockRef.current) return
    const normalizedPhone = normalizePhoneTR(phoneNumber)
    if (!normalizedPhone) {
      setError('Geçerli bir müşteri telefonu yok, konum kaydedilemez.')
      return
    }

    savingLockRef.current = true
    setSaving(true)
    setError('')
    setStatusText('GPS konumu alınıyor...')

    try {
      const coords = await getCurrentPosition()

      setStatusText('Konum kaydediliyor...')
      const { error: insertError } = await supabase
        .from('customer_locations')
        .insert([
          {
            phone_number: normalizedPhone,
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: label.trim(),
          },
        ])

      if (insertError) throw insertError

      onSaved(label.trim())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Konum kaydedilemedi'
      setError(message)
      setStatusText('')
    } finally {
      savingLockRef.current = false
      setSaving(false)
    }
  }

  const handleCustomSave = () => {
    const trimmed = customLabel.trim()
    if (!trimmed) {
      setError('Lütfen bir adres ismi yazın.')
      return
    }
    saveLocation(trimmed)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[10000] flex items-end sm:items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-md shadow-sm my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.5} />
              Konumu Kaydet
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {customerName ? `${customerName} · ` : ''}
              {phoneNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {saving && (
            <div className="flex items-center gap-2 text-sm text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded-md px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.5} />
              {statusText || 'İşleniyor...'}
            </div>
          )}

          {/* Hızlı etiketler — tek dokunuşta kaydeder */}
          <div className="grid grid-cols-1 gap-2.5">
            {QUICK_LABELS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => saveLocation(label)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-4 py-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white text-base font-semibold rounded-md transition-colors disabled:opacity-50"
              >
                <Icon className="w-6 h-6 text-gray-400 shrink-0" strokeWidth={1.5} />
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setShowCustomInput(true)
                setError('')
              }}
              disabled={saving}
              className={`w-full flex items-center gap-3 px-4 py-4 border text-base font-semibold rounded-md transition-colors disabled:opacity-50 ${
                showCustomInput
                  ? 'bg-orange-600 border-orange-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border-slate-700 text-white'
              }`}
            >
              <MapPin className="w-6 h-6 text-gray-400 shrink-0" strokeWidth={1.5} />
              Diğer
            </button>
          </div>

          {/* Özel etiket girişi */}
          {showCustomInput && (
            <div className="space-y-2.5 pt-1">
              <input
                type="text"
                inputMode="text"
                autoFocus
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCustomSave()
                  }
                }}
                // Capacitor klavyesi açılınca input ve Kaydet butonu görünür kalsın
                onFocus={(e) =>
                  setTimeout(
                    () => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }),
                    300
                  )
                }
                placeholder="Örn: Mavi apartman arka kapı"
                maxLength={80}
                disabled={saving}
                className="w-full px-3 py-3.5 bg-slate-950 border border-slate-700 rounded-md text-white text-base placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleCustomSave}
                disabled={saving}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-base font-bold rounded-md transition-colors disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center pt-1">
            Etiket seçildiği anda bulunduğunuz GPS konumu kaydedilir.
          </p>
        </div>
      </div>
    </div>
  )
}
