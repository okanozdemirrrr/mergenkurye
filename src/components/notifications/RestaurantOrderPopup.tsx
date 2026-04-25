/**
 * @file src/components/notifications/RestaurantOrderPopup.tsx
 * @description Restoran Paneli - Yeni Sipariş Bildirimi Popup
 * 
 * ÖZELLİKLER:
 * - Sticky bottom-right popup
 * - Kapatılamaz (sadece "Hazırlanıyor" butonu ile)
 * - Looping audio
 * - Sipariş detayları gösterimi
 */
'use client'

import { useEffect } from 'react'
import { useNotification } from '@/contexts/NotificationContext'
import { supabase } from '@/app/lib/supabase'

interface RestaurantOrderPopupProps {
  orderId: number
  orderNumber?: string
  customerName: string
  customerPhone?: string
  customerAddress: string
  restaurantName: string
  onDismiss: () => void
}

export function RestaurantOrderPopup({
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  restaurantName,
  onDismiss
}: RestaurantOrderPopupProps) {
  const { playShortAudio } = useNotification()

  // Component mount olduğunda audio başlat (TEK SEFERLIK)
  useEffect(() => {
    playShortAudio() // 4 saniye çalar, otomatik durur
  }, [])

  // "Hazırlanıyor" butonuna tıklandığında
  const handleStartPreparing = async () => {
    try {
      // 1. Veritabanında status'u güncelle
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'getting_ready',
          getting_ready_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // 2. Popup'ı kapat
      onDismiss()
    } catch (error) {
      console.error('❌ Sipariş durumu güncellenemedi:', error)
      alert('Hata: Sipariş durumu güncellenemedi')
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-slow">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl shadow-2xl p-6 w-96 border-4 border-white">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
            <span className="text-3xl">🔔</span>
          </div>
          <div>
            <h3 className="text-xl font-bold">YENİ SİPARİŞ!</h3>
            {orderNumber && (
              <p className="text-sm opacity-90">#{orderNumber}</p>
            )}
          </div>
        </div>

        {/* Sipariş Detayları */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg">👤</span>
            <div className="flex-1">
              <p className="text-xs opacity-75">Müşteri</p>
              <p className="font-bold">{customerName}</p>
            </div>
          </div>

          {customerPhone && (
            <div className="flex items-start gap-2">
              <span className="text-lg">📞</span>
              <div className="flex-1">
                <p className="text-xs opacity-75">Telefon</p>
                <p className="font-bold">{customerPhone}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <span className="text-lg">📍</span>
            <div className="flex-1">
              <p className="text-xs opacity-75">Adres</p>
              <p className="font-bold text-sm">{customerAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">🏪</span>
            <div className="flex-1">
              <p className="text-xs opacity-75">Restoran</p>
              <p className="font-bold">{restaurantName}</p>
            </div>
          </div>
        </div>

        {/* Aksiyon Butonu */}
        <button
          onClick={handleStartPreparing}
          className="w-full bg-white text-orange-600 font-bold py-4 rounded-xl hover:bg-orange-50 transition-all transform hover:scale-105 shadow-lg"
        >
          ✅ Hazırlanıyor Olarak İşaretle
        </button>

        {/* Animasyon için CSS */}
        <style jsx>{`
          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  )
}
