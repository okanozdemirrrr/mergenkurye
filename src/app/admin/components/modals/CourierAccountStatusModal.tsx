'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Courier } from '@/types'

interface CourierAccountStatusModalProps {
  courier: Courier
  onClose: () => void
  onSuccess: () => void
}

export function CourierAccountStatusModal({ courier, onClose, onSuccess }: CourierAccountStatusModalProps) {
  const [accountStatus, setAccountStatus] = useState<'active' | 'suspended' | 'terminated'>(
    (courier as any).account_status || 'active'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const updates: any = { account_status: accountStatus }
      
      // Eğer hesap kapatılıyorsa, is_active'i de false yap
      if (accountStatus === 'terminated' || accountStatus === 'suspended') {
        updates.is_active = false
        updates.status = 'idle'
      }

      const { error: updateError } = await supabase
        .from('couriers')
        .update(updates)
        .eq('id', courier.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Hesap durumu güncelleme hatası:', err)
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          👤 Hesap Durumu Yönetimi
        </h2>

        <div className="mb-4">
          <p className="text-slate-600 mb-2">
            <strong>{courier.full_name}</strong> için hesap durumunu değiştir:
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="accountStatus"
              value="active"
              checked={accountStatus === 'active'}
              onChange={(e) => setAccountStatus(e.target.value as any)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-semibold text-green-600">✅ Aktif</div>
              <div className="text-xs text-slate-500">Normal hesap, giriş yapabilir</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="accountStatus"
              value="suspended"
              checked={accountStatus === 'suspended'}
              onChange={(e) => setAccountStatus(e.target.value as any)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-semibold text-orange-600">⏸️ Askıya Alındı</div>
              <div className="text-xs text-slate-500">Geçici olarak giriş yapamaz</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="accountStatus"
              value="terminated"
              checked={accountStatus === 'terminated'}
              onChange={(e) => setAccountStatus(e.target.value as any)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-semibold text-red-600">❌ İşten Çıkarıldı</div>
              <div className="text-xs text-slate-500">Kalıcı olarak giriş yapamaz</div>
            </div>
          </label>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}
