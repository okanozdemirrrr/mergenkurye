/**
 * @file src/hooks/useCourierLocationBroadcast.ts
 * @description Kurye Anlık Konum Yayını (Supabase Broadcast + Background Geolocation Watcher)
 *
 * MİMARİ:
 * - Bu hook, cihaz ekranı kilitliyken veya uygulama arka plandayken Android Doze Mode
 *   tarafından öldürülmeyen Foreground Service ve Background Geolocation yapısını kurar.
 * - Mesafe filtresi (distanceFilter) 15 metreye ayarlanmıştır.
 * - Konum değiştiğinde Supabase Broadcast kanalı üzerinden anlık yayını gerçekleştirir (DB I/O harcamaz).
 */
'use client'

import { useRef, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

const BROADCAST_CHANNEL = 'courier-live-locations'
const BROADCAST_EVENT = 'location_update'

interface LocationBroadcastOptions {
  courierId: string
  courierName: string
  isActive: boolean
}

export function useCourierLocationBroadcast({
  courierId,
  courierName,
  isActive
}: LocationBroadcastOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const watcherIdRef = useRef<string | null>(null)
  const webWatcherRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive || !courierId) {
      console.log('📡 Broadcast devre dışı: isActive=', isActive, 'courierId=', courierId)
      return
    }

    // Broadcast kanalını oluştur ve subscribe ol
    const channel = supabase.channel(BROADCAST_CHANNEL, {
      config: { broadcast: { self: false } }
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 Kurye broadcast kanalına bağlandı:', BROADCAST_CHANNEL)
      }
    })

    channelRef.current = channel

    // Arka plan konum takibini (Background Watcher) başlat
    const startTracking = async () => {
      try {
        if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Mobile')) {
          const bgGeoModule = await import('@capacitor-community/background-geolocation') as any
          const BackgroundGeolocationPlugin = bgGeoModule.BackgroundGeolocationPlugin ?? bgGeoModule.default?.BackgroundGeolocationPlugin ?? bgGeoModule.default

          console.log('🔄 Arka plan konum takibi ve Foreground Service başlatılıyor...')

          // Watcher ekle
          const watcherId = await BackgroundGeolocationPlugin.addWatcher(
            {
              backgroundTitle: 'Mergen MERGEN aktif',
              backgroundMessage: 'konum paylaşıyor',
              requestPermissions: true,
              stale: false,
              distanceFilter: 15 // Mesafe filtresi 15 metre
            },
            async (location: any, error: any) => {
              if (error) {
                console.error('❌ Arka plan konum hatası:', error)
                return
              }

              if (!location) return

              const { latitude, longitude, accuracy, speed, bearing, time } = location
              const timestamp = time || Date.now()

              // Temel doğruluk filtresi
              if (!latitude || !longitude || latitude === 0 || longitude === 0) return
              if (accuracy && accuracy > 100) return

              // Supabase Broadcast ile anlık gönder (DB'ye yazmaz)
              if (channelRef.current) {
                channelRef.current.send({
                  type: 'broadcast',
                  event: BROADCAST_EVENT,
                  payload: {
                    courierId,
                    courierName: courierName || 'Kurye',
                    latitude,
                    longitude,
                    accuracy: accuracy || null,
                    speed: speed || null,
                    heading: bearing || null,
                    timestamp: new Date(timestamp).toISOString()
                  }
                }).then(() => {
                  console.log('📡 Background Geolocation Broadcast gönderildi:', {
                    lat: latitude.toFixed(5),
                    lng: longitude.toFixed(5),
                    acc: accuracy?.toFixed(0) + 'm'
                  })
                }).catch((err: any) => {
                  console.error('❌ Broadcast gönderilemedi:', err)
                })
              }
            }
          )

          watcherIdRef.current = watcherId
          console.log('✅ Arka plan konum watcher başarıyla kuruldu, ID:', watcherId)
        } else {
          // Web platformu fallback
          startWebFallback()
        }
      } catch (capacitorError) {
        console.warn('⚠️ Capacitor Background Geolocation API hatası/desteklenmiyor, Web Geolocation API\'ye geçiliyor...', capacitorError)
        startWebFallback()
      }
    }

    const startWebFallback = () => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        console.log('🔄 Web Geolocation watchPosition başlatılıyor...')
        const webId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy, speed, heading } = position.coords
            const timestamp = position.timestamp

            if (!latitude || !longitude || latitude === 0 || longitude === 0) return
            if (accuracy && accuracy > 100) return

            if (channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: BROADCAST_EVENT,
                payload: {
                  courierId,
                  courierName: courierName || 'Kurye',
                  latitude,
                  longitude,
                  accuracy: accuracy || null,
                  speed: speed || null,
                  heading: heading || null,
                  timestamp: new Date(timestamp).toISOString()
                }
              }).then(() => {
                console.log('📡 Web Geolocation Broadcast gönderildi:', { lat: latitude.toFixed(5), lng: longitude.toFixed(5) })
              }).catch(() => {})
            }
          },
          (err) => console.error('❌ Web Geolocation watchPosition hatası:', err.message),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
        webWatcherRef.current = webId
      }
    }

    startTracking()

    return () => {
      // Temizlik işlemleri
      const stopTracking = async () => {
        // Mobile watcher temizliği
        if (watcherIdRef.current) {
          try {
            const bgGeoModule = await import('@capacitor-community/background-geolocation') as any
            const BackgroundGeolocationPlugin = bgGeoModule.BackgroundGeolocationPlugin ?? bgGeoModule.default?.BackgroundGeolocationPlugin ?? bgGeoModule.default
            await BackgroundGeolocationPlugin.removeWatcher({ id: watcherIdRef.current })
            console.log('🛑 Arka plan konum watcher durduruldu')
          } catch (e) {
            console.error('❌ Arka plan watcher durdurulurken hata:', e)
          }
          watcherIdRef.current = null
        }

        // Web watcher temizliği
        if (webWatcherRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.clearWatch(webWatcherRef.current)
          console.log('🛑 Web Geolocation watchPosition durduruldu')
          webWatcherRef.current = null
        }

        // Kanal temizliği
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
          console.log('📡 Kurye broadcast kanalından ayrıldı')
        }
      }

      stopTracking()
    }
  }, [courierId, courierName, isActive])
}
