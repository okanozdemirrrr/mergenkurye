'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface UpdateAmountModalProps {
  packageId: number
  currentAmount: number
  packageStatus: string
  orderNumber?: string
  onClose: () => void
  onSuccess: () => void
  darkMode: boolean
}

export default function UpdateAmountModal({
  packageId,
  currentAmount,
  packageStatus,
  orderNumber,
  onClose,
  onSuccess,
  darkMode
}: UpdateAmountModalProps) {
  const [newAmount, setNewAmount] = useState(currentAmount.toString())
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Tutar güncellenebilir mi kontrol et
  const canUpdateAmount = !['on_the_way', 'delivered', 'cancelled'].includes(packageStatus)

  const handleUpdate = async () => {
    // Validasyon
    const amount = parseFloat(newAmount)
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Lütfen geçerli bir tutar girin!')
      return
    }

    if (amount === currentAmount) {
      setErrorMessage('Yeni tutar mevcut tutarla aynı!')
      return
    }

    setIsUpdating(true)
    setErrorMessage('')

    try {
      // Önce paketin durumunu kontrol et (race condition için)
      const { data: pkg, error: fetchError } = await supabase
        .from('packages')
        .select('status')
        .eq('id', packageId)
        .single()

      if (fetchError) throw fetchError

      // Eğer kurye tam o saniyede paketi aldıysa
      if (['on_the_way', 'delivered', 'cancelled'].includes(pkg.status)) {
        setErrorMessage('⚠️ Paket yola çıktığı için tutar artık değiştirilemez!')
        setIsUpdating(false)
        return
      }

      // Tutarı güncelle
      const { error: updateError } = await supabase
        .from('packages')
        .update({ amount })
        .eq('id', packageId)

      if (updateError) throw updateError

      console.log('✅ Tutar başarıyla güncellendi:', { packageId, oldAmount: currentAmount, newAmount: amount })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('❌ Tutar güncellenirken hata:', error)
      setErrorMessage('Tutar güncellenemedi: ' + error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`rounded-xl p-6 max-w-md w-full border shadow-2xl ${
          darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            💰 Tutarı Güncelle
          </h3>
          <button
            onClick={onClose}
            className={`text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            ×
          </button>
        </div>

        {/* Sipariş No */}
        {orderNumber && (
          <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Sipariş No:</p>
            <p className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{orderNumber}</p>
          </div>
        )}

        {/* Güncellenebilir mi kontrolü */}
        {!canUpdateAmount ? (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-red-300 text-sm">
              ⚠️ Bu sipariş artık yola çıktığı, teslim edildiği veya iptal edildiği için tutar değiştirilemez.
            </p>
          </div>
        ) : (
          <>
            {/* Mevcut Tutar */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Mevcut Tutar
              </label>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {currentAmount}₺
                </p>
              </div>
            </div>

            {/* Yeni Tutar */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Yeni Tutar
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border text-lg font-bold ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                } outline-none transition-colors`}
                placeholder="Yeni tutarı girin"
                autoFocus
              />
            </div>

            {/* Hata Mesajı */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                <p className="text-red-300 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Butonlar */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  darkMode
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                İptal
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  darkMode
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUpdating ? '⏳ Güncelleniyor...' : '✅ Güncelle'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
