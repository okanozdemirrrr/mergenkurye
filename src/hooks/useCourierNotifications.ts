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

    const channelName = `courier-packages-${Date.now()}`
    console.log('📡 Channel oluşturuluyor:', channelName)
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // TÜM EVENT'LERİ DİNLE
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          console.log('🎉🎉🎉 REALTIME EVENT GELDİ! 🎉🎉🎉')
          console.log('📦 Event Type:', payload.eventType)
          console.log('📦 Full Payload:', JSON.stringify(payload, null, 2))

          const oldOrder = payload.old as any
          const newOrder = payload.new as any

          console.log('🔍 Detaylı kontrol:')
          console.log('  - eventType:', payload.eventType)
          console.log('  - newOrder.id:', newOrder.id)
          console.log('  - newOrder.status:', newOrder.status)
          console.log('  - newOrder.courier_id:', newOrder.courier_id, 'TYPE:', typeof newOrder.courier_id)
          console.log('  - oldOrder.courier_id:', oldOrder.courier_id, 'TYPE:', typeof oldOrder.courier_id)
          console.log('  - courierId:', courierId, 'TYPE:', typeof courierId)

          // Yeni atama kontrolü: status 'assigned' oldu VE önceden bu kuryeye ait değildi VE UPDATE event
          const isNewAssignment = 
            payload.eventType === 'UPDATE' &&
            newOrder.status === 'assigned' &&
            String(newOrder.courier_id) === String(courierId) &&
            String(oldOrder.courier_id) !== String(courierId)

          console.log('  - isNewAssignment:', isNewAssignment)

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
