/**
 * @file src/hooks/useRestaurantNotifications.ts
 * @description Restoran Paneli - Yeni Sipariş Bildirimleri Hook
 * 
 * ÖZELLİKLER:
 * - Supabase Realtime dinleme (SADECE INSERT)
 * - status === 'new_order' filtresi
 * - restaurant_id kontrolü
 * - Popup state yönetimi
 * - SADECE GİRİŞ YAPILDIĞINDA AKTİF
 * - İlk render koruması (useRef)
 * - ID bazlı hayalet bildirim koruması
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'

interface NewOrder {
  id: number
  order_number?: string
  customer_name: string
  customer_phone?: string
  delivery_address: string
  restaurant_id: number
  restaurant?: {
    name: string
  }
}

export function useRestaurantNotifications(restaurantId: number | null, isLoggedIn: boolean = false) {
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null)
  const isInitialMount = useRef(true)
  const notifiedOrderIds = useRef<Set<number>>(new Set()) // Bildirim yapılan sipariş ID'leri

  useEffect(() => {
    // KRİTİK: Sadece giriş yapılmışsa ve restaurant ID varsa dinle
    if (!isLoggedIn || !restaurantId) {
      console.log('⏸️ Restoran bildirimleri durduruldu - Giriş yapılmamış veya restaurant ID yok')
      return
    }

    console.log('🔔 Restoran bildirimleri dinleniyor, restaurant_id:', restaurantId)

    // Realtime subscription
    const channel = supabase
      .channel('restaurant-new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // SADECE YENİ SİPARİŞLER
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('📦 Realtime event:', payload)

          // İLK RENDER KORUMASI - Sayfa yüklenirken ses çalma
          if (isInitialMount.current) {
            console.log('⏭️ İlk render - bildirim atlandı')
            return
          }

          const order = payload.new as any

          // Sadece 'new_order' statusundaki siparişleri göster
          if (order && order.status === 'new_order' && payload.eventType === 'INSERT') {
            // HAYALET BİLDİRİM KORUMASI - Bu sipariş ID'si için daha önce bildirim yapıldı mı?
            if (notifiedOrderIds.current.has(order.id)) {
              console.log('⚠️ Bu sipariş için zaten bildirim yapıldı, atlanıyor:', order.id)
              return
            }

            console.log('🔔 YENİ SİPARİŞ TETİKLENDİ:', order)

            // Bu sipariş ID'sini kaydet
            notifiedOrderIds.current.add(order.id)

            setNewOrder({
              id: order.id,
              order_number: order.order_number,
              customer_name: order.customer_name,
              customer_phone: order.customer_phone,
              delivery_address: order.delivery_address,
              restaurant_id: order.restaurant_id,
              restaurant: order.restaurant
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Restoran Realtime status:', status)
        
        // İlk render korumasını kaldır (subscription başarılı olduktan sonra)
        if (status === 'SUBSCRIBED') {
          setTimeout(() => {
            isInitialMount.current = false
            console.log('🔓 İlk render koruması kaldırıldı - bildirimler aktif')
          }, 2000) // 2 saniye bekle
        }
      })

    // Cleanup
    return () => {
      console.log('🔌 Restoran bildirimleri kapatılıyor')
      isInitialMount.current = true // Reset protection
      notifiedOrderIds.current.clear() // Bildirim ID'lerini temizle
      supabase.removeChannel(channel)
    }
  }, [restaurantId, isLoggedIn]) // isLoggedIn dependency eklendi

  // Popup'ı kapat
  const dismissNotification = () => {
    setNewOrder(null)
  }

  return {
    newOrder,
    dismissNotification
  }
}
