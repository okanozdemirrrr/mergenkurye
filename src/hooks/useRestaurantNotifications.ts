/**
 * @file src/hooks/useRestaurantNotifications.ts
 * @description Restoran Paneli - Yeni Sipariş Bildirimleri Hook
 * 
 * ÖZELLİKLER:
 * - Supabase Realtime dinleme (INSERT/UPDATE)
 * - status === 'new_order' filtresi
 * - restaurant_id kontrolü
 * - Popup state yönetimi
 */
'use client'

import { useState, useEffect } from 'react'
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

export function useRestaurantNotifications(restaurantId: number | null) {
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null)

  useEffect(() => {
    if (!restaurantId) return

    console.log('🔔 Restoran bildirimleri dinleniyor, restaurant_id:', restaurantId)

    // Realtime subscription
    const channel = supabase
      .channel('restaurant-new-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT ve UPDATE
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('📦 Realtime event:', payload)

          const order = payload.new as any

          // Sadece 'new_order' statusundaki siparişleri göster
          if (order && order.status === 'new_order') {
            console.log('🔔 YENİ SİPARİŞ TETİKLENDİ:', order)

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
      })

    // Cleanup
    return () => {
      console.log('🔌 Restoran bildirimleri kapatılıyor')
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  // Popup'ı kapat
  const dismissNotification = () => {
    setNewOrder(null)
  }

  return {
    newOrder,
    dismissNotification
  }
}
