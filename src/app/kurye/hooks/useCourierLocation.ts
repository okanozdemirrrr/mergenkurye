/**
 * @file src/app/kurye/hooks/useCourierLocation.ts
 * @description Kurye GPS Konum Takibi Hook'u (Foreground + Background + Broadcast)
 * 
 * KONUM AKIŞI:
 * 1. GPS'ten konum al → Filtreleri uygula
 * 2. Veritabanına yaz (couriers.last_location) — yedek/fallback
 * 3. Supabase Broadcast ile anlık olarak admin haritasına gönder (sıfır gecikme)
 */

import { useRef, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { applyAllFilters } from '../utils/locationFilters'

const BROADCAST_CHANNEL = 'courier-live-locations'
const BROADCAST_EVENT = 'location_update'

interface UseCourierLocationProps {
  courierId: string | null
  isLoggedIn: boolean
  courierName?: string
}

export function useCourierLocation({ courierId, isLoggedIn, courierName }: UseCourierLocationProps) {
  // Son geçerli konum (sıçrama filtresi için)
  const lastValidLocationRef = useRef<{ latitude: number, longitude: number, timestamp: number } | null>(null)
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // 📡 Broadcast ile konumu admin haritasına anlık gönder (DB'ye YAZMAZ)
  const broadcastLocation = (latitude: number, longitude: number, accuracy: number | null, speed: number | null, heading: number | null, timestamp: number) => {
    const channel = broadcastChannelRef.current
    if (!channel || !courierId) return

    channel.send({
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
      console.log('📡 Broadcast gönderildi:', { lat: latitude.toFixed(5), lng: longitude.toFixed(5) })
    }).catch((err: any) => {
      console.error('❌ Broadcast gönderilemedi:', err)
    })
  }

  // Konum güncellemesi fonksiyonu - ULTRA GÜÇLENDİRİLMİŞ FİLTRELEME - ORİJİNAL MANTIK
  const updateCourierLocation = async (courierIdParam: string) => {
    try {
      // Capacitor Geolocation plugin'ini kullan (daha güvenilir)
      const { Geolocation } = await import('@capacitor/geolocation')
      
      // İzin kontrolü
      const permission = await Geolocation.checkPermissions()
      console.log('📍 Konum izni durumu:', permission)
      
      if (permission.location !== 'granted') {
        console.log('📍 Konum izni isteniyor...')
        const requestResult = await Geolocation.requestPermissions()
        if (requestResult.location !== 'granted') {
          console.error('❌ Konum izni reddedildi')
          return
        }
      }

      // DONANIM ZORLAMASI: GPS ONLY - CACHE YOK
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,  // ✅ GPS kullan (WiFi/IP/Baz istasyonu değil)
        timeout: 20000,            // 20 saniye bekle
        maximumAge: 0              // ✅ CACHE KULLANMA - Her zaman yeni GPS verisi al
      })

      const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords
      const timestamp = position.timestamp

      console.log('🛰️ GPS Verisi Alındı:', { 
        lat: latitude.toFixed(6), 
        lng: longitude.toFixed(6), 
        accuracy: accuracy ? `${accuracy.toFixed(0)}m` : 'N/A',
        timestamp: new Date(timestamp).toISOString()
      })

      // TÜM FİLTRELERİ UYGULA
      const isValid = applyAllFilters(
        latitude,
        longitude,
        accuracy,
        timestamp,
        lastValidLocationRef.current
      )

      if (!isValid) {
        console.error('❌ Konum filtreleri geçemedi, veritabanına yazılmayacak')
        return
      }

      // ✅ TÜM FİLTRELER GEÇTİ - VERİ GÜVENİLİR
      console.log('📍 Onaylanan Konum:', { 
        latitude: latitude.toFixed(6), 
        longitude: longitude.toFixed(6), 
        accuracy: `${accuracy?.toFixed(0)}m`,
        speed: speed ? `${(speed * 3.6).toFixed(1)} km/h` : 'durgun',
        heading: heading ? `${heading.toFixed(0)}°` : 'bilinmiyor',
        altitude: altitude ? `${altitude.toFixed(0)}m` : 'bilinmiyor'
      })

      // Son geçerli konumu güncelle (sıçrama filtresi için)
      lastValidLocationRef.current = {
        latitude,
        longitude,
        timestamp
      }

      // Veritabanına kaydet
      const locationData = {
        latitude,
        longitude,
        accuracy: accuracy || null,
        altitude: altitude || null,
        heading: heading || null,
        speed: speed || null,
        updated_at: new Date(timestamp).toISOString(),
        last_seen: new Date().toISOString()
      }

      const { error } = await supabase
        .from('couriers')
        .update({
          last_location: locationData
        })
        .eq('id', courierIdParam)

      if (error) {
        console.error('❌ Konum güncellenemedi:', error)
      } else {
        console.log('✅ Konum veritabanına kaydedildi')
      }

      // 📡 Broadcast ile anlık gönder (DB'den bağımsız)
      broadcastLocation(latitude, longitude, accuracy, speed, heading, timestamp)
    } catch (error: any) {
      console.error('❌ Konum alınamadı:', error)
      console.error('❌ Hata mesajı:', error.message)
      
      // Fallback: Web API kullan (aynı filtrelerle)
      console.log('🔄 Web Geolocation API deneniyor...')
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords
            const timestamp = position.timestamp
            
            // AYNI FİLTRELERİ UYGULA
            const isValid = applyAllFilters(
              latitude,
              longitude,
              accuracy,
              timestamp,
              lastValidLocationRef.current
            )

            if (!isValid) {
              console.error('❌ Web API konum filtreleri geçemedi')
              return
            }
            
            console.log('✅ Web API konum geçerli:', { latitude, longitude, accuracy })
            
            // Son geçerli konumu güncelle
            lastValidLocationRef.current = {
              latitude,
              longitude,
              timestamp
            }
            
            try {
              // 📡 Broadcast ile anlık gönder
              broadcastLocation(latitude, longitude, accuracy, null, null, timestamp)

              await supabase
                .from('couriers')
                .update({
                  last_location: {
                    latitude,
                    longitude,
                    accuracy,
                    updated_at: new Date(timestamp).toISOString(),
                    last_seen: new Date().toISOString()
                  }
                })
                .eq('id', courierIdParam)
              console.log('✅ Web API ile konum kaydedildi')
            } catch (err) {
              console.error('❌ Web API konum kaydetme hatası:', err)
            }
          },
          (err) => console.error('❌ Web API konum hatası:', err),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        )
      }
    }
  }

  // Arka plan konum takibi başlat - ORİJİNAL MANTIK
  const startBackgroundLocationTracking = async (courierIdParam: string) => {
    try {
      // Platform kontrolü - sadece mobil cihazlarda çalıştır
      if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Mobile')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bgGeoModule = await import('@capacitor-community/background-geolocation') as any
          const BackgroundGeolocationPlugin = bgGeoModule.BackgroundGeolocationPlugin ?? bgGeoModule.default?.BackgroundGeolocationPlugin ?? bgGeoModule.default
          
          console.log('🔄 Arka plan konum takibi başlatılıyor...')
          
          // Watcher ekle
          const watcherId = await BackgroundGeolocationPlugin.addWatcher(
            {
              backgroundMessage: 'Konumunuz Takip Ediliyor',
              backgroundTitle: 'Alda Gel Kurye Aktif',
              requestPermissions: true,
              stale: false,
              distanceFilter: 10 // 10 metre hareket ettiğinde güncelle
            },
            async (location: { latitude: number; longitude: number; accuracy: number; speed: number | null; bearing: number | null; time: number | null } | undefined, error: Error | undefined) => {
              if (error) {
                console.error('❌ Arka plan konum hatası:', error)
                return
              }

              if (!location) {
                console.error('❌ Konum null geldi, işlenmiyor')
                return
              }

              const { latitude, longitude, accuracy, speed, bearing, time } = location
              const timestamp = time || Date.now()

              console.log('📍 Arka plan konum alındı:', { latitude, longitude, accuracy })

              // ARKA PLAN FİLTRELEME - AYNI KURALLAR
              const isValid = applyAllFilters(
                latitude,
                longitude,
                accuracy,
                timestamp,
                lastValidLocationRef.current
              )

              if (!isValid) {
                console.error('❌ Arka plan konum filtreleri geçemedi')
                return
              }

              console.log('✅ Arka plan: Tüm filtreler geçti')

              // Son geçerli konumu güncelle
              lastValidLocationRef.current = {
                latitude,
                longitude,
                timestamp
              }

              console.log('✅ Arka plan konum geçerli, kaydediliyor')

              // Veritabanına kaydet
              try {
                await supabase
                  .from('couriers')
                  .update({
                    last_location: {
                      latitude,
                      longitude,
                      accuracy: accuracy || null,
                      heading: bearing || null,
                      speed: speed || null,
                      updated_at: new Date(timestamp).toISOString(),
                      last_seen: new Date().toISOString()
                    }
                  })
                  .eq('id', courierIdParam)
                
                console.log('✅ Arka plan konum kaydedildi')
              } catch (err) {
                console.error('❌ Arka plan konum kaydetme hatası:', err)
              }

              // 📡 Broadcast ile anlık gönder
              broadcastLocation(latitude, longitude, accuracy, speed, bearing, timestamp)
            }
          )

          console.log('✅ Arka plan konum takibi başlatıldı, watcher ID:', watcherId)
          
          // Watcher ID'yi sakla (temizlik için)
          return watcherId
        } catch (importError) {
          console.log('ℹ️ Background geolocation paketi yüklü değil (web platformu)')
          return null
        }
      } else {
        console.log('ℹ️ Background geolocation sadece mobil cihazlarda desteklenir')
        return null
      }
    } catch (error) {
      console.error('❌ Arka plan konum takibi başlatılamadı:', error)
      return null
    }
  }

  // Arka plan konum takibini durdur - ORİJİNAL MANTIK
  const stopBackgroundLocationTracking = async (watcherId: string) => {
    try {
      // Platform kontrolü - sadece mobil cihazlarda çalıştır
      if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Mobile')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bgGeoModule2 = await import('@capacitor-community/background-geolocation') as any
          const BackgroundGeolocationPlugin2 = bgGeoModule2.BackgroundGeolocationPlugin ?? bgGeoModule2.default?.BackgroundGeolocationPlugin ?? bgGeoModule2.default
          await BackgroundGeolocationPlugin2.removeWatcher({ id: watcherId })
          console.log('🛑 Arka plan konum takibi durduruldu')
        } catch (importError) {
          console.log('ℹ️ Background geolocation paketi yüklü değil (web platformu)')
        }
      } else {
        console.log('ℹ️ Background geolocation sadece mobil cihazlarda desteklenir')
      }
    } catch (error) {
      console.error('❌ Arka plan konum takibi durdurulamadı:', error)
    }
  }

  // 📡 Broadcast kanalını kur (subscribe)
  useEffect(() => {
    if (!isLoggedIn || !courierId) return

    const channel = supabase.channel(BROADCAST_CHANNEL, {
      config: { broadcast: { self: false } }
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 Kurye broadcast kanalına bağlandı:', BROADCAST_CHANNEL)
      }
    })

    broadcastChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      broadcastChannelRef.current = null
      console.log('📡 Kurye broadcast kanalından ayrıldı')
    }
  }, [isLoggedIn, courierId])

  // Konum takibini başlat
  useEffect(() => {
    if (!isLoggedIn || !courierId) return

    // İlk konum güncellemesi - HEMEN yap
    console.log('📍 İlk konum güncellemesi başlatılıyor...')
    updateCourierLocation(courierId)

    // 5 saniye sonra bir daha güncelle (ilk güncelleme başarısız olursa)
    setTimeout(() => {
      console.log('📍 İkinci konum güncellemesi...')
      updateCourierLocation(courierId)
    }, 5000)

    // Arka plan konum takibini başlat
    let backgroundWatcherId: string | null = null
    startBackgroundLocationTracking(courierId).then(watcherId => {
      backgroundWatcherId = watcherId
    })

    // Her 10 saniyede bir konum güncelle
    const locationInterval = setInterval(() => {
      updateCourierLocation(courierId)
    }, 10000) // 10 saniye

    return () => {
      clearInterval(locationInterval)
      
      if (backgroundWatcherId) {
        stopBackgroundLocationTracking(backgroundWatcherId)
      }
    }
  }, [isLoggedIn, courierId])

  return {
    updateCourierLocation,
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking
  }
}
