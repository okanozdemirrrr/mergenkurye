/**
 * @file src/components/notifications/AdminOrderPopup.tsx
 * @description Admin Paneli - Yeni Sipariş Bildirimi Popup
 * 
 * ÖZELLİKLER:
 * - Sticky bottom-right popup
 * - Kapatılamaz (sadece "Görüldü" butonu ile)
 * - Looping audio
 * - Sipariş detayları gösterimi
 * - Veritabanı güncellemesi YOK (sadece UI acknowledgment)
 */
'use client'

import { useEffect } from 'react'
import { useNotification } from '@/contexts/NotificationContext'

interface AdminOrderPopupProps {
  orderId: number
  orderNumber?: string
  customerName: string
  customerPhone?: string
  customerAddress: string
  restaurantName?: string
  onDismiss: () => void
}

export function AdminOrderPopup({
  orderId,
  orderNumber,
  customerName,
  customerPhone,
  customerAddress,
  restaurantName,
  onDismiss
}: AdminOrderPopupProps) {
  const { playLoopingAudio, stopLoopingAudio } = useNotification()

  // Component mount olduğunda audio başlat
  useEffect(() => {
    playLoopingAudio()

    // Cleanup: Component unmount olduğunda audio durdur
    return () => {
      stopLoopingAudio()
    }
  }, [])

  // "Görüldü" butonuna tıklandığında
  const handleAcknowledge = () => {
    // 1. Audio'yu durdur
    stopLoopingAudio()

    // 2. Popup'ı kapat (VERİTABANI GÜNCELLEMESİ YOK!)
    onDismiss()
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-slow">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl shadow-2xl p-6 w-96 border-4 border-white">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
            <span className="text-3xl">🚨</span>
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

          {restaurantName && (
            <div className="flex items-start gap-2">
              <span className="text-lg">🏪</span>
              <div className="flex-1">
                <p className="text-xs opacity-75">Restoran</p>
                <p className="font-bold">{restaurantName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Aksiyon Butonu */}
        <button
          onClick={handleAcknowledge}
          className="w-full bg-white text-purple-600 font-bold py-4 rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg"
        >
          ✓ Görüldü
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
