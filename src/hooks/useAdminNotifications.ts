/**
 * @file src/hooks/useAdminNotifications.ts
 * @description Admin Paneli - Yeni Sipariş Bildirimleri Hook
 * 
 * ÖZELLİKLER:
 * - Supabase Realtime dinleme (INSERT/UPDATE)
 * - status === 'new_order' filtresi
 * - Tüm restoranlar için dinleme
 * - Popup state yönetimi
 * - Bildirim sesi (looping audio)
 * - SADECE GİRİŞ YAPILDIĞINDA AKTİF
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useNotification } from '@/contexts/NotificationContext'

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

export function useAdminNotifications(isLoggedIn: boolean = false) {
  const [newOrder, setNewOrder] = useState<NewOrder | null>(null)
  const { showNativeNotification } = useNotification()

  useEffect(() => {
    // KRİTİK: Sadece giriş yapılmışsa dinle
    if (!isLoggedIn) {
      console.log('⏸️ Admin bildirimleri durduruldu - Giriş yapılmamış')
      return
    }

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

            // BASIT SES ÇALMA - Autoplay policy bypass
            setTimeout(() => {
              try {
                const audio = new Audio('/notification.mp3')
                audio.volume = 0.8
                audio.loop = true
                
                // User interaction olmadan çalmaya zorla
                const playPromise = audio.play()
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('✅ Ses başarıyla çalıyor')
                      // 10 saniye sonra durdur
                      setTimeout(() => {
                        audio.pause()
                        audio.currentTime = 0
                      }, 10000)
                    })
                    .catch(error => {
                      console.error('❌ Ses çalamadı:', error)
                      // Fallback: Kullanıcı etkileşimi gerekiyor
                      document.addEventListener('click', function playOnClick() {
                        audio.play()
                        document.removeEventListener('click', playOnClick)
                      }, { once: true })
                    })
                }
              } catch (error) {
                console.error('❌ Audio oluşturulamadı:', error)
              }
            }, 100)

            // Native notification göster
            showNativeNotification(
              'Yeni Sipariş!',
              `${order.customer_name} - ${order.restaurant?.name || 'Restoran'}`
            )

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
        
        // Connection durumunu logla
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin realtime bağlantısı başarılı')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Admin realtime bağlantı hatası')
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Admin realtime timeout')
        } else if (status === 'CLOSED') {
          console.warn('🔌 Admin realtime bağlantısı kapandı')
        }
      })

    // Connection durumunu periyodik kontrol et
    const connectionCheck = setInterval(() => {
      console.log('🔍 Admin realtime connection check:', channel.state)
    }, 30000) // 30 saniyede bir

    // Cleanup
    return () => {
      console.log('🔌 Admin bildirimleri kapatılıyor')
      clearInterval(connectionCheck)
      supabase.removeChannel(channel)
    }
  }, [isLoggedIn]) // isLoggedIn dependency eklendi

  // Popup'ı kapat
  const dismissNotification = () => {
    setNewOrder(null)
  }

  return {
    newOrder,
    dismissNotification
  }
}
