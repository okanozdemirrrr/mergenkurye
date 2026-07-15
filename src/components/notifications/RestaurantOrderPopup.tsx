/**
 * @file src/components/notifications/RestaurantOrderPopup.tsx
 * @description Restoran Paneli - Yeni Sipariş Bildirimi Popup
 */
'use client'

import { useEffect } from 'react'
import { Bell, User, Phone, MapPin, Store, Check } from 'lucide-react'
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

  useEffect(() => {
    playShortAudio()
  }, [])

  const handleStartPreparing = async () => {
    try {
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'getting_ready',
          getting_ready_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      onDismiss()
    } catch (error) {
      console.error('❌ Sipariş durumu güncellenemedi:', error)
      alert('Hata: Sipariş durumu güncellenemedi')
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-slow">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-md shadow-sm p-6 w-96 border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
            <Bell className="w-6 h-6 text-orange-600" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold">YENİ SİPARİŞ!</h3>
            {orderNumber && (
              <p className="text-sm opacity-90">#{orderNumber}</p>
            )}
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-md p-4 mb-4 space-y-2 border border-white/5 shadow-sm">
          <div className="flex items-start gap-2">
            <User size={18} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs opacity-75">Müşteri</p>
              <p className="font-bold">{customerName}</p>
            </div>
          </div>

          {customerPhone && (
            <div className="flex items-start gap-2">
              <Phone size={18} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs opacity-75">Telefon</p>
                <p className="font-bold">{customerPhone}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <MapPin size={18} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs opacity-75">Adres</p>
              <p className="font-bold text-sm">{customerAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Store size={18} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs opacity-75">Restoran</p>
              <p className="font-bold">{restaurantName}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleStartPreparing}
          className="w-full bg-white text-orange-600 font-bold py-4 rounded-md hover:bg-orange-50 transition-all shadow-sm inline-flex items-center justify-center gap-2"
        >
          <Check size={18} strokeWidth={1.5} />
          Hazırlanıyor Olarak İşaretle
        </button>

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
