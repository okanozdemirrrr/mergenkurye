/**
 * @file src/hooks/useCourierNotifications.ts
 * @description Kurye Paneli - Atanan Paket Bildirimleri Hook
 * 
 * ÖZELLİKLER:
 * - Supabase Realtime dinleme (UPDATE)
 * - status === 'assigned' && courier_id kontrolü
 * - Kısa audio (3-4 saniye)
 * - Native push notification
 * - SADECE GİRİŞ YAPILDIĞINDA AKTİF
 */
'use client'

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useNotification } from '@/contexts/NotificationContext'

export function useCourierNotifications(courierId: string | null, isLoggedIn: boolean = false) {
  const { playShortAudio, showNativeNotification, requestNotificationPermission } = useNotification()

  // Login olduğunda notification izni iste
  useEffect(() => {
    if (isLoggedIn && courierId) {
      requestNotificationPermission().then(permission => {
        console.log('🔔 Notification permission:', permission)
      })
    }
  }, [courierId, isLoggedIn])

  // Realtime subscription
  useEffect(() => {
    // KRİTİK: Sadece giriş yapılmışsa ve courier ID varsa dinle
    if (!isLoggedIn || !courierId) {
      console.log('⏸️ Kurye bildirimleri durduruldu - Giriş yapılmamış veya courier ID yok')
      return
    }

    console.log('🔔 Kurye bildirimleri dinleniyor, courier_id:', courierId)

    const channel = supabase
      .channel('courier-assigned-packages')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'packages',
          filter: `courier_id=eq.${courierId}`
        },
        (payload) => {
          console.log('📦 Kurye Realtime event:', payload)

          const oldOrder = payload.old as any
          const newOrder = payload.new as any

          // Yeni atama kontrolü: status 'assigned' oldu VE önceden bu kuryeye ait değildi
          const isNewAssignment = 
            newOrder.status === 'assigned' &&
            newOrder.courier_id === courierId &&
            oldOrder.courier_id !== courierId

          if (isNewAssignment) {
            console.log('🔔 YENİ PAKET ATANDI:', newOrder)

            // 1. Kısa audio çal (3-4 saniye)
            playShortAudio()

            // 2. Native notification göster
            const customerAddress = newOrder.delivery_address || 'Adres belirtilmemiş'
            const restaurantAddress = newOrder.restaurant?.address || 'Restoran adresi belirtilmemiş'

            showNativeNotification(
              '🚀 Yeni Paketiniz Var!',
              `Yeni paketiniz var!\n\nMüşteri Adresi: ${customerAddress}\n\nRestoran Adresi: ${restaurantAddress}`
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Kurye Realtime status:', status)
      })

    // Cleanup
    return () => {
      console.log('🔌 Kurye bildirimleri kapatılıyor')
      supabase.removeChannel(channel)
    }
  }, [courierId, isLoggedIn]) // isLoggedIn dependency eklendi

  return {
    // Kurye için popup yok, sadece native notification
  }
}
