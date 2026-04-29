/**
 * @file src/hooks/useCourierRealtimeNotifications.ts
 * @description Kurye Paneli - Realtime Bildirim Hook (Foreground Protection)
 * 
 * SENARYO:
 * - Supabase Realtime ile packages tablosunu dinle (UPDATE)
 * - Şart: status === 'assigned' && courier_id === kendi ID'si
 * - Aksiyon: Toast + Audio (uygulama açıkken native push düşmeyebilir)
 * - Initial load koruması (useRef)
 * 
 * NOT: Bu sadece FOREGROUND koruma. Asıl bildirim Admin'den FCM ile gelir.
 */
'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { notificationService } from '@/utils/courierPushNotificationService'

export function useCourierRealtimeNotifications(
  courierId: string | null,
  isLoggedIn: boolean
) {
  const isInitialMount = useRef(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Audio'yu hazırla
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Audio oluştur
    audioRef.current = new Audio(`/notification.mp3?v=${Date.now()}`)
    audioRef.current.volume = 0.8

    // Audio unlock için kullanıcı etkileşimi bekle
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.volume = 0
        audioRef.current.play()
          .then(() => {
            audioRef.current!.pause()
            audioRef.current!.currentTime = 0
            audioRef.current!.volume = 0.8
            console.log('✅ Kurye audio unlocked')
          })
          .catch(() => {})
      }
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }

    document.addEventListener('click', unlockAudio, { once: true })
    document.addEventListener('touchstart', unlockAudio, { once: true })

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // FCM Token kaydı (Native Push için)
  useEffect(() => {
    if (!isLoggedIn || !courierId) return

    // FCM token'ı kaydet
    notificationService.initialize(courierId)

    return () => {
      notificationService.cleanup()
    }
  }, [courierId, isLoggedIn])

  // Realtime subscription (Foreground protection)
  useEffect(() => {
    if (!isLoggedIn || !courierId) {
      console.log('⏸️ Kurye bildirimleri durduruldu - Giriş yapılmamış')
      return
    }

    console.log('🔔 Kurye Realtime bildirimleri başlatılıyor, courier_id:', courierId)

    const channel = supabase
      .channel(`courier-assignments-${courierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'packages',
          filter: `courier_id=eq.${courierId}`
        },
        (payload) => {
          console.log('📦 Kurye Realtime UPDATE event:', payload)

          // İLK RENDER KORUMASI
          if (isInitialMount.current) {
            console.log('⏭️ İlk render - bildirim atlandı')
            return
          }

          const oldOrder = payload.old as any
          const newOrder = payload.new as any

          // Yeni atama kontrolü: status 'assigned' oldu VE önceden bu kuryeye ait değildi
          const isNewAssignment =
            newOrder.status === 'assigned' &&
            String(newOrder.courier_id) === String(courierId) &&
            String(oldOrder.courier_id) !== String(courierId)

          if (isNewAssignment) {
            console.log('🔔 YENİ PAKET ATANDI (Kurye Foreground):', newOrder)

            // 1. SES ÇAL
            if (audioRef.current) {
              audioRef.current.currentTime = 0
              audioRef.current.play()
                .then(() => console.log('✅ Kurye bildirimi sesi çalıyor'))
                .catch(err => console.error('❌ Ses çalma hatası:', err))
            }

            // 2. TOAST GÖSTER
            const restaurantName = newOrder.restaurant?.name || 'Restoran'
            const customerAddress = newOrder.delivery_address || 'Adres belirtilmemiş'
            
            showToast(
              '🚀 YENİ SİPARİŞ!',
              `${restaurantName} - ${customerAddress}`
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Kurye Realtime status:', status)

        if (status === 'SUBSCRIBED') {
          // 2 saniye sonra initial load korumasını kaldır
          setTimeout(() => {
            isInitialMount.current = false
            console.log('🔓 Kurye initial load koruması kaldırıldı')
          }, 2000)
        }
      })

    return () => {
      console.log('🔌 Kurye bildirimleri kapatılıyor')
      isInitialMount.current = true
      supabase.removeChannel(channel)
    }
  }, [courierId, isLoggedIn])
}

// Toast gösterme fonksiyonu
function showToast(title: string, body: string) {
  if (typeof window === 'undefined') return

  const toastContainer = document.createElement('div')
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 999999;
    max-width: 90%;
    animation: slideDown 0.3s ease-out;
    font-family: system-ui, -apple-system, sans-serif;
  `

  toastContainer.innerHTML = `
    <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
      ${title}
    </div>
    <div style="font-size: 14px; opacity: 0.95;">
      ${body}
    </div>
  `

  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(toastContainer)

  setTimeout(() => {
    toastContainer.style.animation = 'slideDown 0.3s ease-out reverse'
    setTimeout(() => {
      if (document.body.contains(toastContainer)) {
        document.body.removeChild(toastContainer)
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }, 300)
  }, 5000)
}
