/**
 * @file src/hooks/useRestaurantRealtimeNotifications.ts
 * @description Restoran Paneli - Realtime Bildirim Hook
 *
 * SENARYO:
 * - Supabase Realtime ile packages tablosunu dinle (INSERT)
 * - Şart: restaurant_id === mevcut restoran ID && platform === 'web'
 * - Aksiyon: Toast + Looping Audio (alert.mp3)
 * - Initial load koruması (useRef)
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

// Global ses nesnesi — bileşen dışında, döngüsel alarm
let alertAudio: HTMLAudioElement | null = null

if (typeof window !== 'undefined' && !alertAudio) {
  alertAudio = new Audio('/alert.mp3')
  alertAudio.loop = true
  alertAudio.volume = 0.8
}

/** Sipariş kartına / Hazırla'ya tıklanınca alarmı sustur */
export function stopRestaurantAlert() {
  if (alertAudio) {
    alertAudio.pause()
    alertAudio.currentTime = 0
  }
}

/** Yeni web siparişinde döngüsel alarmı başlat */
export function playRestaurantAlert() {
  if (alertAudio) {
    alertAudio.currentTime = 0
    alertAudio
      .play()
      .then(() => console.log('✅ Web sipariş alarmı çalıyor (loop)'))
      .catch((e) => console.log('Otomatik oynatma engellendi', e))
  }
}

export function useRestaurantRealtimeNotifications(
  restaurantId: number | null,
  isLoggedIn: boolean
) {
  const isInitialMount = useRef(true)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // İlk etkileşimde tarayıcı autoplay kilidini aç
  useEffect(() => {
    if (typeof window === 'undefined') return

    const unlockAudio = () => {
      if (alertAudio) {
        alertAudio.volume = 0
        alertAudio
          .play()
          .then(() => {
            alertAudio!.pause()
            alertAudio!.currentTime = 0
            alertAudio!.volume = 0.8
            setAudioUnlocked(true)
            console.log('✅ Restoran audio unlocked')
          })
          .catch(() => {
            alertAudio!.volume = 0.8
          })
      }
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }

    document.addEventListener('click', unlockAudio, { once: true })
    document.addEventListener('touchstart', unlockAudio, { once: true })

    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!isLoggedIn || !restaurantId) {
      console.log('⏸️ Restoran bildirimleri durduruldu - Giriş yapılmamış')
      return
    }

    console.log('🔔 Restoran Realtime bildirimleri başlatılıyor, restaurant_id:', restaurantId)

    const channel = supabase
      .channel(`restaurant-orders-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('📦 Restoran Realtime INSERT event:', payload)

          if (isInitialMount.current) {
            console.log('⏭️ İlk render - bildirim atlandı')
            return
          }

          const newOrder = payload.new as Record<string, unknown>

          const isNewWebOrder =
            newOrder?.status === 'new_order' &&
            newOrder?.platform === 'web'

          if (!isNewWebOrder) return

          console.log('🔔 YENİ WEB SİPARİŞİ (Restoran):', newOrder)

          showToast(
            '🌐 Yeni Web Siparişi!',
            `Sipariş #${newOrder.order_number || newOrder.id} - ${newOrder.customer_name}`
          )
        }
      )
      .subscribe((status) => {
        console.log('📡 Restoran Realtime status:', status)

        if (status === 'SUBSCRIBED') {
          setTimeout(() => {
            isInitialMount.current = false
            console.log('🔓 Restoran initial load koruması kaldırıldı')
          }, 2000)
        }
      })

    return () => {
      console.log('🔌 Restoran bildirimleri kapatılıyor')
      isInitialMount.current = true
      stopRestaurantAlert()
      supabase.removeChannel(channel)
    }
  }, [restaurantId, isLoggedIn])

  return { audioUnlocked }
}

function showToast(title: string, body: string) {
  if (typeof window === 'undefined') return

  const toastContainer = document.createElement('div')
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
