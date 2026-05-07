/**
 * @file src/app/admin/components/modals/CourierPaymentSettingsModal.tsx
 * @description Kurye Ödeme Ayarları Modalı
 * Admin panelinde kurye başına ödeme türü (paket başı/saatlik) ve ücret belirleme
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Courier } from '@/types'

interface CourierPaymentSettingsModalProps {
  courier: Courier
  onClose: () => void
  onSuccess: () => void
}

export function CourierPaymentSettingsModal({
  courier,
  onClose,
  onSuccess
}: CourierPaymentSettingsModalProps) {
  const [paymentType, setPaymentType] = useState<'paket_basi' | 'saatlik'>('paket_basi')
  const [packageRate, setPackageRate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Mevcut ayarları yükle
  useEffect(() => {
    if (courier.payment_type) {
      setPaymentType(courier.payment_type as 'paket_basi' | 'saatlik')
    }
    if (courier.package_rate) {
      setPackageRate(courier.package_rate.toString())
    }
  }, [courier])

  const handleSave = async () => {
    if (!packageRate || isNaN(Number(packageRate)) || Number(packageRate) <= 0) {
      setError('Geçerli bir ücret giriniz')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('couriers')
        .update({
          payment_type: paymentType,
          package_rate: Number(packageRate)
        })
        .eq('id', courier.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Ayarlar kaydedilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">
            💰 Kazanç Şekli Ayarları
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Kurye Bilgisi */}
        <div className="mb-6 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">Kurye:</p>
          <p className="font-bold text-slate-900">{courier.full_name}</p>
        </div>

        {/* Ödeme Türü Seçimi */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Ödeme Türü
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="paymentType"
                value="paket_basi"
                checked={paymentType === 'paket_basi'}
                onChange={(e) => setPaymentType(e.target.value as 'paket_basi')}
                className="w-4 h-4 text-orange-600"
              />
              <div>
                <div className="font-medium text-slate-900">📦 Paket Başı</div>
                <div className="text-xs text-slate-600">Her teslim edilen paket için sabit ücret</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="paymentType"
                value="saatlik"
                checked={paymentType === 'saatlik'}
                onChange={(e) => setPaymentType(e.target.value as 'saatlik')}
                className="w-4 h-4 text-orange-600"
              />
              <div>
                <div className="font-medium text-slate-900">⏰ Saatlik</div>
                <div className="text-xs text-slate-600">Sabit maaş + paket başı ek ücret</div>
              </div>
            </label>
          </div>
        </div>

        {/* Ücret Girişi */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {paymentType === 'paket_basi' ? 'Paket Başı Ücret (TL)' : 'Paket Başı Ek Ücret (TL)'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={packageRate}
            onChange={(e) => setPackageRate(e.target.value)}
            placeholder={paymentType === 'paket_basi' ? 'Örn: 65.00' : 'Örn: 13.00'}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
          {paymentType === 'saatlik' && (
            <p className="text-xs text-slate-600 mt-1">
              * Sabit maaş ayrıca manuel takip edilir, burada sadece paket başı ek ücret girilir
            </p>
          )}
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}