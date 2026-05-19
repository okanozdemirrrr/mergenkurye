/**
 * @file src/hooks/useCourierLocationBroadcast.ts
 * @description Kurye Anlık Konum Yayını (BROADCAST — Veritabanına YAZMIYOR)
 *
 * MİMARİ:
 * - navigator.geolocation ile konumu alır
 * - Supabase Realtime Broadcast kanalına fırlatır (WebSocket, 0 DB write)
 * - Admin haritası bu kanalı dinler ve marker'ı günceller
 * - 10 saniyede bir konum güncellenir
 */
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

const BROADCAST_CHANNEL = 'courier-live-locations' // Sabit kanal adı
const LOCATION_INTERVAL_MS = 10_000 // 10 saniye

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSubscribedRef = useRef(false)

  const broadcastLocation = useCallback(() => {
    if (!isSubscribedRef.current || !channelRef.current) return
    if (!navigator.geolocation) {
      console.warn('⚠️ Tarayıcı geolocation desteklemiyor')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const payload = {
          courierId,
          courierName,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        }

        channelRef.current!.send({
          type: 'broadcast',
          event: 'location_update',
          payload
        })

        console.log('📡 Konum broadcast edildi:', {
          lat: payload.latitude.toFixed(5),
          lng: payload.longitude.toFixed(5)
        })
      },
      (error) => {
        console.warn('⚠️ Konum alınamadı:', error.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5000
      }
    )
  }, [courierId, courierName])

  useEffect(() => {
    // Aktif değilse veya courierId yoksa broadcast yapma
    if (!isActive || !courierId) return

    // Kanal oluştur ve abone ol
    const channel = supabase.channel(BROADCAST_CHANNEL, {
      config: { broadcast: { self: false } } // Kendi mesajını alma
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true
        console.log('✅ Kurye konum kanalına bağlandı:', courierId)

        // İlk konumu hemen gönder
        broadcastLocation()

        // 10 saniyede bir gönder
        intervalRef.current = setInterval(broadcastLocation, LOCATION_INTERVAL_MS)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('⚠️ Broadcast kanal hatası:', status)
        isSubscribedRef.current = false
      }
    })

    channelRef.current = channel

    return () => {
      // Temizlik: interval ve kanal kapat
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isSubscribedRef.current = false
      supabase.removeChannel(channel)
      console.log('🔌 Kurye konum kanalı kapatıldı:', courierId)
    }
  }, [courierId, isActive, broadcastLocation])
}
