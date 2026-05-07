/**
 * @file src/app/restoran/components/CancelOrderModal.tsx
 * @description Restoran sipariş iptal modal'ı - Katı kurallarla
 */
'use client'

import { useState } from 'react'
import { Package } from '@/types'

interface CancelOrderModalProps {
  package: Package
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
  darkMode: boolean
}

export default function CancelOrderModal({
  package: pkg,
  restaurantId,
  onClose,
  onSuccess,
  darkMode
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  console.log('🎯 CancelOrderModal açıldı:', {
    packageId: pkg.id,
    orderNumber: pkg.order_number,
    restaurantId,
    packageData: pkg
  })

  const cancellationReasons = [
    'Ürün kalmadı',
    'Müşteri iptal etti',
    'Restoran kapalı',
    'Adres hatalı',
    'Müşteriye ulaşılamadı',
    'Diğer'
  ]

  const handleCancel = async () => {
    const reason = selectedReason === 'Diğer' ? customReason : selectedReason

    if (!reason.trim()) {
      alert('Lütfen iptal sebebini seçin veya yazın!')
      return
    }

    console.log('🔍 İptal işlemi başlatılıyor:', {
      packageId: pkg.id,
      packageIdType: typeof pkg.id,
      orderNumber: pkg.order_number,
      restaurantId: restaurantId,
      restaurantIdType: typeof restaurantId,
      cancellationReason: reason,
      fullPackage: pkg
    })

    setIsSubmitting(true)

    try {
      const payload = {
        packageId: pkg.id,
        restaurantId: restaurantId, // String olarak gönder (UUID)
        cancellationReason: reason
      }

      console.log('📤 API\'ye gönderilen payload:', payload)

      const response = await fetch('/api/restaurant-cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('📡 API yanıtı:', { 
        status: response.status, 
        statusText: response.statusText,
        data 
      })

      if (!response.ok) {
        // Sistem yapılandırma hatası (500 - API Key eksik)
        if (response.status === 500 && data.technicalDetails) {
          alert(
            `🔧 ${data.error}\n\n` +
            `${data.message}\n\n` +
            `📋 Teknik Detay: ${data.technicalDetails}\n\n` +
            `${data.debug?.hint ? '💡 Çözüm: ' + data.debug.hint : ''}`
          )
          return
        }

        // Paket bulunamadı (404)
        if (response.status === 404) {
          const debugInfo = data.debug ? 
            `\n\n🔍 Debug:\n` +
            `- Package ID: ${data.debug.packageId} (${data.debug.packageIdType})\n` +
            `- Hata: ${data.debug.errorMessage || 'Bilinmiyor'}\n` +
            `- Kod: ${data.debug.errorCode || 'Yok'}\n` +
            `${data.debug.errorHint ? '- İpucu: ' + data.debug.errorHint : ''}` 
            : ''
          
          alert(`❌ ${data.error}\n\n${data.message}${debugInfo}`)
          return
        }

        // Yetki hatası veya durum uygun değil (403)
        if (response.status === 403) {
          if (data.technicalDetails) {
            // Yetkilendirme hatası (RLS, API Key vb.)
            alert(
              `🔒 ${data.error}\n\n` +
              `${data.message}\n\n` +
              `📋 Teknik Detay: ${data.technicalDetails}\n\n` +
              `${data.debug?.hint ? '💡 Çözüm: ' + data.debug.hint : ''}`
            )
          } else if (data.currentStatus) {
            // Sipariş durumu uygun değil
            alert(
              `⚠️ ${data.error}\n\n` +
              `${data.message}\n\n` +
              `📊 Mevcut Durum: ${data.currentStatus}\n` +
              `💡 ${data.hint || ''}`
            )
          } else {
            // Genel yetki hatası
            alert(`❌ ${data.error}\n\n${data.message}`)
          }
          return
        }

        // Diğer hatalar
        const debugInfo = data.debug ? 
          `\n\n🔍 Debug:\n${JSON.stringify(data.debug, null, 2)}` 
          : ''
        
        alert(
          `❌ Hata (${response.status}): ${data.error}\n\n` +
          `${data.message || 'Bilinmeyen hata'}` +
          `${data.technicalDetails ? '\n\n📋 Teknik: ' + data.technicalDetails : ''}` +
          `${debugInfo}`
        )
        return
      }

      // Başarılı
      alert(`✅ ${data.message}\n\n📦 Sipariş #${data.orderNumber || pkg.order_number}\n${data.notifiedCourier ? '📱 Kurye bilgilendirildi.' : ''}`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('❌ İptal hatası:', error)
      
      // Network hatası
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert(
          `🌐 Bağlantı Hatası\n\n` +
          `Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.\n\n` +
          `Teknik: ${error.message}`
        )
        return
      }

      // Genel hata
      alert(
        `❌ Sipariş iptal edilirken bir hata oluştu!\n\n` +
        `${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n\n` +
        `Lütfen tekrar deneyin veya sistem yöneticisine bildirin.`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={`rounded-xl p-6 max-w-md w-full shadow-2xl ${
          darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            ⚠️ Siparişi İptal Et
          </h3>
          <button
            onClick={onClose}
            className={`text-2xl font-bold ${darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
          >
            ×
          </button>
        </div>

        {/* Sipariş Bilgisi */}
        <div className={`p-3 rounded-lg mb-4 ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
          <div className="text-sm">
            <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Sipariş No:</span>
            <span className={`ml-2 font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              #{pkg.order_number}
            </span>
          </div>
          <div className="text-sm mt-1">
            <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Müşteri:</span>
            <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {pkg.customer_name}
            </span>
          </div>
          <div className="text-sm mt-1">
            <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>Tutar:</span>
            <span className={`ml-2 font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              {pkg.amount}₺
            </span>
          </div>
        </div>

        {/* Uyarı Mesajı */}
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm font-semibold">
            ⚠️ Bu işlem geri alınamaz!
          </p>
          <p className="text-red-400 text-xs mt-1">
            Sipariş iptal edildiğinde kurye bilgilendirilecek ve admin paneline kayıt düşecektir. Kurye yola çıktıysa iptal edemezsiniz.
          </p>
        </div>

        {/* İptal Sebepleri */}
        <div className="mb-4">
          <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
            İptal Sebebi <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            {cancellationReasons.map(reason => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                  selectedReason === reason
                    ? darkMode
                      ? 'bg-orange-600 border-orange-600 text-white'
                      : 'bg-orange-500 border-orange-500 text-white'
                    : darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Özel Sebep Girişi */}
        {selectedReason === 'Diğer' && (
          <div className="mb-4">
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Açıklama
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="İptal sebebini yazın..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50`}
          >
            Vazgeç
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'Diğer' && !customReason.trim())}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '⏳ İptal Ediliyor...' : '❌ İptal Et'}
          </button>
        </div>
      </div>
    </div>
  )
}
