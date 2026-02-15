/**
 * @file src/app/takip/components/CustomerTrackingMap.tsx
 * @description Müşteri Takip Haritası - Leaflet
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Package } from '@/types'
import { supabase } from '@/app/lib/supabase'

interface CourierLocation {
  latitude: number
  longitude: number
  updated_at?: string
  last_seen?: string
  accuracy?: number
  heading?: number
  speed?: number
}

interface CustomerTrackingMapProps {
  packageData: Package
}

export function CustomerTrackingMap({ packageData }: CustomerTrackingMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [courierLocation, setCourierLocation] = useState<CourierLocation | null>(null)
  const [previousLocation, setPreviousLocation] = useState<CourierLocation | null>(null)
  const [estimatedTime, setEstimatedTime] = useState('')
  const [locationAge, setLocationAge] = useState<string>('')

  // Konum yaşını hesapla
  useEffect(() => {
    if (!courierLocation?.last_seen) return

    const updateAge = () => {
      const lastSeen = new Date(courierLocation.last_seen!)
      const now = new Date()
      const diffMs = now.getTime() - lastSeen.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      if (diffMinutes < 1) {
        setLocationAge('Şimdi')
      } else if (diffMinutes === 1) {
        setLocationAge('1 dakika önce')
      } else if (diffMinutes < 60) {
        setLocationAge(`${diffMinutes} dakika önce`)
      } else {
        setLocationAge('1 saatten fazla')
      }
    }

    updateAge()
    const interval = setInterval(updateAge, 10000) // Her 10 saniyede güncelle
    return () => clearInterval(interval)
  }, [courierLocation?.last_seen])

  // Tahmini süre hesaplama
  useEffect(() => {
    if (!packageData) return

    switch (packageData.status) {
      case 'assigned':
        setEstimatedTime('40-45 dk içinde kapınızda')
        break
      case 'picking_up':
        setEstimatedTime('30-35 dk içinde kapınızda')
        break
      case 'on_the_way':
        setEstimatedTime('15-20 dk içinde kapınızda')
        break
      default:
        setEstimatedTime('Hazırlanıyor...')
    }
  }, [packageData])

  // Kurye konumunu çek ve realtime dinle
  useEffect(() => {
    if (!packageData.courier_id) return

    const fetchCourierLocation = async () => {
      const { data, error } = await supabase
        .from('couriers')
        .select('last_location')
        .eq('id', packageData.courier_id)
        .single()

      if (!error && data?.last_location) {
        const newLocation = data.last_location
        
        // Konum yaşı kontrolü (5 dakikadan eski mi?)
        if (newLocation.last_seen) {
          const lastSeen = new Date(newLocation.last_seen)
          const now = new Date()
          const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000
          
          if (diffMinutes > 5) {
            console.warn('⚠️ Konum verisi eski (5+ dakika):', diffMinutes.toFixed(1), 'dakika')
          }
        }
        
        // Önceki konumu sakla (animasyon için)
        if (courierLocation) {
          setPreviousLocation(courierLocation)
        }
        
        setCourierLocation(newLocation)
      }
    }

    fetchCourierLocation()

    // Her 5 saniyede bir güncelle (daha sık)
    const interval = setInterval(fetchCourierLocation, 5000)

    // Realtime subscription
    const channel = supabase
      .channel(`courier-${packageData.courier_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'couriers',
          filter: `id=eq.${packageData.courier_id}`
        },
        (payload: any) => {
          if (payload.new?.last_location) {
            console.log('🔄 Realtime konum güncellendi')
            
            // Önceki konumu sakla
            if (courierLocation) {
              setPreviousLocation(courierLocation)
            }
            
            setCourierLocation(payload.new.last_location)
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [packageData.courier_id, courierLocation])

  // Client-side rendering kontrolü
  useEffect(() => {
    setIsClient(true)
    
    // Leaflet CSS'ini dinamik olarak yükle
    if (typeof window !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
      link.crossOrigin = ''
      document.head.appendChild(link)
    }
  }, [])

  // SSR sırasında loading göster
  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-2">🗺️</div>
          <div className="text-sm">Harita yükleniyor...</div>
        </div>
      </div>
    )
  }

  // Client-side'da Leaflet'i import et
  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } = require('react-leaflet')
  const L = require('leaflet')

  // Kurye marker'ını yumuşak hareket ettiren component
  function AnimatedCourierMarker({ 
    position, 
    previousPosition, 
    icon, 
    courierName, 
    statusText 
  }: { 
    position: [number, number]
    previousPosition: [number, number] | null
    icon: any
    courierName: string
    statusText: string
  }) {
    const map = useMap()
    const markerRef = useRef<any>(null)

    useEffect(() => {
      if (!markerRef.current || !previousPosition) return

      const marker = markerRef.current
      const startLatLng = L.latLng(previousPosition[0], previousPosition[1])
      const endLatLng = L.latLng(position[0], position[1])

      // Animasyon süresi (ms)
      const duration = 2000
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        // Interpolate position
        const lat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * easeProgress
        const lng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * easeProgress

        marker.setLatLng([lat, lng])

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }, [position, previousPosition])

    return (
      <Marker
        ref={markerRef}
        position={position}
        icon={icon}
      >
        <Popup>
          <div className="text-sm">
            <div className="font-bold text-green-600">🏍️ Kurye</div>
            <div className="text-xs mt-1">
              <div><strong>Ad:</strong> {courierName}</div>
              <div><strong>Durum:</strong> {statusText}</div>
            </div>
          </div>
        </Popup>
      </Marker>
    )
  }

  // Teslimat noktası ikonu
  const deliveryIcon = L.divIcon({
    html: `
      <div style="
        background: #ef4444;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid #ef4444;
        box-shadow: 0 0 0 2px white, 0 0 10px rgba(239, 68, 68, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
      ">📍</div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })

  // Kurye ikonu (yön oklu)
  const getCourierIcon = (heading?: number) => {
    const rotation = heading || 0
    return L.divIcon({
      html: `
        <div style="
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${rotation}deg);
          transition: transform 0.5s ease-out;
        ">
          <div style="
            background: #22c55e;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid #22c55e;
            box-shadow: 0 0 0 2px white, 0 0 10px rgba(34, 197, 94, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          ">🏍️</div>
        </div>
      `,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    })
  }

  const courierIcon = getCourierIcon(courierLocation?.heading)

  // Harita merkezi (teslimat noktası veya kurye konumu)
  // UYARI: Konum null/undefined ise Malatya merkezi kullan (Google HQ değil!)
  const mapCenter: [number, number] = packageData.latitude && packageData.longitude
    ? [packageData.latitude, packageData.longitude]
    : courierLocation && courierLocation.latitude && courierLocation.longitude
    ? [courierLocation.latitude, courierLocation.longitude]
    : [38.3552, 38.3095] // Malatya merkez (fallback)

  // Rota çizgisi için koordinatlar
  const routeCoordinates: [number, number][] = []
  if (courierLocation && packageData.latitude && packageData.longitude) {
    routeCoordinates.push(
      [courierLocation.latitude, courierLocation.longitude],
      [packageData.latitude, packageData.longitude]
    )
  }

  const getStatusText = () => {
    switch (packageData.status) {
      case 'assigned':
        return 'Kurye Atandı'
      case 'picking_up':
        return 'Kurye Restoranda'
      case 'on_the_way':
        return 'Kurye Yolda'
      default:
        return 'Hazırlanıyor'
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Üst Bilgi Paneli */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent p-4">
        <div className="max-w-4xl mx-auto">
          {/* Logo ve Başlık */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📦</div>
              <div>
                <h1 className="text-xl font-bold text-white">Mergen Kurye</h1>
                <p className="text-sm text-slate-400">Siparişiniz Yolda</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Sipariş No</div>
              <div className="text-lg font-bold text-orange-400">{packageData.order_number}</div>
            </div>
          </div>

          {/* Durum Kartı */}
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-2xl">
                  🏍️
                </div>
                <div>
                  <div className="text-white font-semibold">{getStatusText()}</div>
                  <div className="text-sm text-slate-400">
                    {packageData.courier_name || 'Kurye bilgisi yükleniyor...'}
                  </div>
                  {locationAge && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      📍 {locationAge}
                      {courierLocation?.accuracy && courierLocation.accuracy < 50 && (
                        <span className="ml-1 text-green-400">• Yüksek doğruluk</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-400">{estimatedTime.split(' ')[0]}</div>
                <div className="text-xs text-slate-400">tahmini süre</div>
              </div>
            </div>
          </div>

          {/* Teslimat Bilgileri */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Restoran</div>
              <div className="text-sm text-white font-medium">
                🍽️ {packageData.restaurant?.name || 'Yükleniyor...'}
              </div>
            </div>
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Tutar</div>
              <div className="text-sm text-green-400 font-bold">{packageData.amount}₺</div>
            </div>
          </div>
        </div>
      </div>

      {/* Harita */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* Koyu tema harita katmanı */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Teslimat Noktası */}
        {packageData.latitude && packageData.longitude && (
          <Marker
            position={[packageData.latitude, packageData.longitude]}
            icon={deliveryIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold text-red-600">📍 Teslimat Adresi</div>
                <div className="text-xs mt-1">
                  <div><strong>Müşteri:</strong> {packageData.customer_name}</div>
                  <div><strong>Adres:</strong> {packageData.delivery_address}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Kurye Konumu - Animasyonlu */}
        {courierLocation && (
          <AnimatedCourierMarker
            position={[courierLocation.latitude, courierLocation.longitude]}
            previousPosition={previousLocation ? [previousLocation.latitude, previousLocation.longitude] : null}
            icon={courierIcon}
            courierName={packageData.courier_name || 'Yükleniyor...'}
            statusText={getStatusText()}
          />
        )}

        {/* Rota Çizgisi */}
        {routeCoordinates.length === 2 && (
          <Polyline
            positions={routeCoordinates}
            color="#f97316"
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>

      {/* Alt Bilgi */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="text-center">
              <div className="text-sm text-slate-400 mb-1">Teslimat Adresi</div>
              <div className="text-white font-medium">📍 {packageData.delivery_address}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
