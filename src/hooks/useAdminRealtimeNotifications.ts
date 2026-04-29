/**
 * @file src/hooks/useAdminRealtimeNotifications.ts
 * @description Admin Paneli - Realtime Bildirim Hook
 * 
 * SENARYO:
 * - Supabase Realtime ile packages tablosunu dinle (INSERT)
 * - Şart: status === 'new_order' (herhangi bir restoran için)
 * - Aksiyon: Toast + Audio
 * - Initial load koruması (useRef)
 */
'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'

export function useAdminRealtimeNotifications(isLoggedIn: boolean) {
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
            console.log('✅ Admin audio unlocked')
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

  // Realtime subscription
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('⏸️ Admin bildirimleri durduruldu - Giriş yapılmamış')
      return
    }

    console.log('🔔 Admin Realtime bildirimleri başlatılıyor')

    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          console.log('📦 Admin Realtime INSERT event:', payload)

          // İLK RENDER KORUMASI
          if (isInitialMount.current) {
            console.log('⏭️ İlk render - bildirim atlandı')
            return
          }

          const newOrder = payload.new as any

          // Sadece 'new_order' statusundaki siparişler
          if (newOrder && newOrder.status === 'new_order') {
            console.log('🔔 SİSTEME YENİ SİPARİŞ DÜŞTÜ (Admin):', newOrder)

            // 1. SES ÇAL
            if (audioRef.current) {
              audioRef.current.currentTime = 0
              audioRef.current.play()
                .then(() => console.log('✅ Admin bildirimi sesi çalıyor'))
                .catch(err => console.error('❌ Ses çalma hatası:', err))
            }

            // 2. TOAST GÖSTER
            showToast(
              '🚀 Sisteme Yeni Sipariş Düştü!',
              `Sipariş #${newOrder.id} - ${newOrder.customer_name || 'Müşteri'}`
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin Realtime status:', status)

        if (status === 'SUBSCRIBED') {
          // 2 saniye sonra initial load korumasını kaldır
          setTimeout(() => {
            isInitialMount.current = false
            console.log('🔓 Admin initial load koruması kaldırıldı')
          }, 2000)
        }
      })

    return () => {
      console.log('🔌 Admin bildirimleri kapatılıyor')
      isInitialMount.current = true
      supabase.removeChannel(channel)
    }
  }, [isLoggedIn])
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
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
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
