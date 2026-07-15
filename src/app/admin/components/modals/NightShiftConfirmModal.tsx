'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Courier } from '@/types'

interface NightShiftConfirmModalProps {
  courier: Courier
  onClose: () => void
  onSuccess: () => void
}

export function NightShiftConfirmModal({ courier, onClose, onSuccess }: NightShiftConfirmModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: rpcError } = await supabase.rpc('set_night_shift_courier', {
        p_courier_id: courier.id,
      })

      if (rpcError) throw rpcError

      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('Gece vardiyası atama hatası:', err)
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-md max-w-md w-full shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Gece Vardiyacısı Yap</h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-300 leading-relaxed tracking-tight">
            <span className="font-semibold text-slate-100">{courier.full_name}</span> kuryesini gece
            vardiyacısı yapmak istediğinize emin misiniz?
          </p>
          <p className="text-sm text-amber-400/90 mt-3 leading-relaxed tracking-tight">
            Gece 00:30 - 02:00 arası tüm paketler otomatik olarak bu kuryeye atanacaktır.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-950/50 border border-red-800/50 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium border border-slate-700 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium border border-indigo-500/50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  )
}
