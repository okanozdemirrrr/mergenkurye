/**
 * @file src/hooks/useCourierLocationBroadcast.ts
 * @description Kurye Anlık Konum Yayını (BROADCAST — watchPosition tabanlı)
 *
 * MİMARİ:
 * - navigator.geolocation.watchPosition ile cihazın GPS donanımına doğrudan bağlanır.
 * - Mobil işletim sistemlerinin (iOS/Android) arka planda setInterval'i dondurmasını (throttle) engeller.
 * - Supabase Realtime Broadcast kanalına fırlatır (WebSocket, 0 DB write).
 * - Aşırı yükü engellemek için 10 saniyelik bir throttle (sınırlandırma) uygular.
 */
'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'

const BROADCAST_CHANNEL = 'courier-live-locations'
const THROTTLE_INTERVAL_MS = 10_000 // En fazla 10 saniyede bir gönder

interface LocationBroadcastOptions {
  courierId: string
  courierName: string
  isActive: boolean // Sadece aktif kuryeler yayın yapar
}

export function useCourierLocationBroadcast({
  courierId,
  courierName,
  isActive
}: LocationBroadcastOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastBroadcastTimeRef = useRef<number>(0)
  const isSubscribedRef = useRef(false)

  useEffect(() => {
    // Aktif değilse veya courierId yoksa takip başlatma
    if (!isActive || !courierId) return

    // 1. Kanala abone ol
    const channel = supabase.channel(BROADCAST_CHANNEL, {
      config: { broadcast: { self: false } }
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true
        console.log('✅ Kurye konum kanalına bağlandı:', courierId)
      } else {
        isSubscribedRef.current = false
      }
    })

    channelRef.current = channel

    // 2. watchPosition ile GPS donanımını dinle (mobil arkaplan/kilit koruması sağlar)
    if (!navigator.geolocation) {
      console.error('⚠️ Cihazda GPS/Geolocation desteği bulunamadı.')
    } else {
      console.log('📡 Cihaz GPS donanımı dinleniyor (watchPosition)...')
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now()
          // En fazla 10 saniyede bir broadcast et (Throttle)
          if (now - lastBroadcastTimeRef.current >= THROTTLE_INTERVAL_MS) {
            if (isSubscribedRef.current && channelRef.current) {
              const payload = {
                courierId,
                courierName,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString()
              }

              channelRef.current.send({
                type: 'broadcast',
                event: 'location_update',
                payload
              })

              lastBroadcastTimeRef.current = now
              console.log('📡 Konum watchPosition üzerinden yayınlandı:', {
                lat: payload.latitude.toFixed(5),
                lng: payload.longitude.toFixed(5),
                accuracy: payload.accuracy
              })
            }
          }
        },
        (error) => {
          console.warn('⚠️ GPS Watch Hatası:', error.message, error.code)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      )
    }

    return () => {
      // Temizlik: Watcher durdur ve kanaldan ayrıl
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      isSubscribedRef.current = false
      supabase.removeChannel(channel)
      console.log('🔌 Kurye konum takibi durduruldu:', courierId)
    }
  }, [courierId, courierName, isActive])
}
