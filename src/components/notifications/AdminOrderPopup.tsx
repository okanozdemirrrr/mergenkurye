/**
 * @file src/components/notifications/AdminOrderPopup.tsx
 * @description Admin Paneli - Yeni Sipariş Bildirimi Popup
 */
'use client'

import { useEffect } from 'react'
import { AlertCircle, User, Phone, MapPin, Store, Check } from 'lucide-react'
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
  const { playShortAudio } = useNotification()

  useEffect(() => {
    playShortAudio()
  }, [])

  const handleAcknowledge = () => {
    onDismiss()
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-slow">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-md shadow-sm p-6 w-96 border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center animate-pulse">
            <AlertCircle className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
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

          {restaurantName && (
            <div className="flex items-start gap-2">
              <Store size={18} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs opacity-75">Restoran</p>
                <p className="font-bold">{restaurantName}</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleAcknowledge}
          className="w-full bg-white text-purple-600 font-bold py-4 rounded-md hover:bg-purple-50 transition-all shadow-sm inline-flex items-center justify-center gap-2"
        >
          <Check size={18} strokeWidth={1.5} />
          Görüldü
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
