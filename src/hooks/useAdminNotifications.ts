/**
 * @file src/hooks/useAdminNotifications.ts
 * @description Admin Paneli - Yeni Sipariş Bildirimleri Hook
 * 
 * ÖZELLİKLER:
 * - Supabase Realtime dinleme (INSERT/UPDATE)
 * - status === 'new_order' filtresi
 * - Tüm restoranlar için dinleme
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
  restaurant_id?: number
  restaurant?: {
    name: string
  }
}

export function useAdminNotifications() {
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null)

  useEffect(() => {
    console.log('🔔 Admin bildirimleri dinleniyor')

    // Realtime subscription (TÜM restoranlar)
    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT ve UPDATE
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          console.log('📦 Admin Realtime event:', payload)

          const order = payload.new as any

          // Sadece 'new_order' statusundaki siparişleri göster
          if (order && order.status === 'new_order') {
            console.log('🔔 YENİ SİPARİŞ TETİKLENDİ (Admin):', order)

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
        console.log('📡 Admin Realtime status:', status)
      })

    // Cleanup
    return () => {
      console.log('🔌 Admin bildirimleri kapatılıyor')
      supabase.removeChannel(channel)
    }
  }, [])

  // Popup'ı kapat
  const dismissNotification = () => {
    setNewOrder(null)
  }

  return {
    newOrder,
    dismissNotification
  }
}
