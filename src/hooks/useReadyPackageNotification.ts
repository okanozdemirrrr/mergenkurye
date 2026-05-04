/**
 * @file src/hooks/useReadyPackageNotification.ts
 * @description Paket 'ready' durumuna geçtiğinde ses ve bildirim gönderen hook
 */
'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'

export function useReadyPackageNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasRequestedPermission = useRef(false)

  useEffect(() => {
    // 1. Bildirim izni iste (sadece bir kez)
    if (!hasRequestedPermission.current && typeof window !== 'undefined' && 'Notification' in window) {
      console.log('🔔 Mevcut bildirim izni:', Notification.permission)
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('🔔 Bildirim izni yanıtı:', permission)
          if (permission === 'granted') {
            console.log('✅ Bildirim izni verildi!')
          } else {
            console.warn('⚠️ Bildirim izni reddedildi veya göz ardı edildi')
          }
        })
      } else if (Notification.permission === 'granted') {
        console.log('✅ Bildirim izni zaten verilmiş')
      } else {
        console.warn('❌ Bildirim izni reddedilmiş - Tarayıcı ayarlarından açın')
      }
      hasRequestedPermission.current = true
    }

    // Audio element'i hazırla
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification.mp3')
      audioRef.current.volume = 1.0
    }

    // 2. Realtime dinleyici
    const channel = supabase
      .channel('ready-package-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'packages'
        },
        (payload: any) => {
          const oldStatus = payload.old?.status
          const newStatus = payload.new?.status

          console.log('📦 Paket güncellendi:', {
            id: payload.new.id,
            oldStatus,
            newStatus,
            willTrigger: newStatus === 'ready' && oldStatus !== 'ready'
          })

          // Sadece 'ready' durumuna GEÇİŞTE tetikle (spam önleme)
          if (newStatus === 'ready' && oldStatus !== 'ready') {
            console.log('🎉 Paket hazır durumuna geçti - Bildirim tetikleniyor!')

            // 3. Ses çal
            if (audioRef.current) {
              audioRef.current.play().catch(error => {
                console.warn('⚠️ Ses çalınamadı (autoplay engeli):', error)
              })
            }

            // 4. Tarayıcı bildirimi
            if (typeof window !== 'undefined' && 'Notification' in window) {
              console.log('🔔 Bildirim durumu:', Notification.permission)
              
              if (Notification.permission === 'granted') {
                console.log('📢 Bildirim gönderiliyor...')
                const notification = new Notification('Hazır paketiniz var !', {
                  body: `Sipariş #${payload.new.order_number || payload.new.id} hazır`,
                  icon: '/icon-192x192.png',
                  badge: '/icon-192x192.png',
                  tag: `ready-${payload.new.id}`,
                  requireInteraction: false
                })
                console.log('✅ Bildirim oluşturuldu:', notification)
              } else {
                console.warn('❌ Bildirim gönderilemedi - İzin durumu:', Notification.permission)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
