'use client'

import { useEffect, useState, useRef, memo } from 'react'
import 'leaflet/dist/leaflet.css'

// LocalStorage helpers
const getStoredMapPosition = () => {
  if (typeof window === 'undefined') {
    return { center: [41.3500, 36.2200] as [number, number], zoom: 13 }
  }
  
  try {
    const stored = localStorage.getItem('courierMapPosition')
    if (stored) {
      const parsed = JSON.parse(stored)
      return { center: [parsed.lat, parsed.lng] as [number, number], zoom: parsed.zoom }
    }
  } catch (error) {
    console.error('LocalStorage okuma hatası:', error)
  }
  
  return { center: [41.3500, 36.2200] as [number, number], zoom: 13 }
}

const saveMapPosition = (lat: number, lng: number, zoom: number) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('courierMapPosition', JSON.stringify({ lat, lng, zoom }))
  } catch (error) {
    console.error('LocalStorage yazma hatası:', error)
  }
}

// Kurye verilerini karşılaştır (memo için)
const areCouriersEqual = (prevCouriers: any[], nextCouriers: any[]) => {
  if (!prevCouriers || !nextCouriers) return false
  if (prevCouriers.length !== nextCouriers.length) return false
  
  // Her kuryenin id, lat, lng, status ve is_active değerlerini kontrol et
  return prevCouriers.every((prev, index) => {
    const next = nextCouriers[index]
    return (
      prev.id === next.id &&
      prev.last_lat === next.last_lat &&
      prev.last_lng === next.last_lng &&
      prev.status === next.status &&
      prev.is_active === next.is_active &&
      prev.activePackageCount === next.activePackageCount
    )
  })
}

function CourierMap({ couriers }: any) {
  const [MapBridge, setMapBridge] = useState<any>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  
  // Initial pozisyon - sadece bir kez okunur, sonra değişmez
  const initialPositionRef = useRef(getStoredMapPosition())
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Leaflet'i dinamik olarak yükle (Hata almamak için şart)
    const initMap = async () => {
      const L = (await import('leaflet')).default
      const ReactLeaflet = await import('react-leaflet')

      // İkon fixlemesi (Karakter hatası almamak için doğrudan URL veriyoruz)
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      })

      setMapBridge({ ...ReactLeaflet, L })
      setIsMapReady(true)
    }

    initMap()
  }, [])

  if (!MapBridge || !isMapReady) {
    return (
      <div className="h-[400px] w-full bg-slate-900 animate-pulse flex items-center justify-center text-white font-bold">
        🗺️ Harita Yükleniyor...
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents } = MapBridge
  const L = MapBridge.L

  // Sadece aktif ve koordinatı olan kuryeler
  const activeCouriers = couriers && couriers.filter((c: any) => 
    c.last_lat && 
    c.last_lng && 
    c.is_active &&
    !isNaN(Number(c.last_lat)) &&
    !isNaN(Number(c.last_lng)) &&
    Number(c.last_lat) !== 0 &&
    Number(c.last_lng) !== 0
  )

  // Motor ikonu oluştur
  const createMotorcycleIcon = (color: string) => {
    // SVG'yi base64 yerine direkt URL encode ile kullan (emoji sorunu yok)
    const svgIcon = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
        <circle cx="20" cy="20" r="12" fill="white" opacity="0.3"/>
        <path d="M20 10 L25 20 L20 30 L15 20 Z" fill="white"/>
      </svg>
    `
    
    // URL encode kullan (btoa yerine)
    const encodedSvg = encodeURIComponent(svgIcon)
    
    return new L.Icon({
      iconUrl: `data:image/svg+xml,${encodedSvg}`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    })
  }

  // Motor ikonu rengini belirle
  const getMotorcycleColor = (status: string) => {
    // Paket taşıyorsa (on_the_way veya picking_up) → Turuncu
    if (status === 'on_the_way' || status === 'picking_up') {
      return '#f97316' // Orange-500
    }
    // Boşta (idle) → Yeşil
    return '#22c55e' // Green-500
  }

  // Harita olaylarını dinleyen component
  function MapEventHandler() {
    const map = useMapEvents({
      moveend: () => {
        const center = map.getCenter()
        const zoom = map.getZoom()
        saveMapPosition(center.lat, center.lng, zoom)
      },
      zoomend: () => {
        const center = map.getCenter()
        const zoom = map.getZoom()
        saveMapPosition(center.lat, center.lng, zoom)
      }
    })
    
    // Map instance'ı sakla (ilk render'da)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = map
    }
    
    return null
  }

  const initialPosition = initialPositionRef.current

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
      <MapContainer 
        center={initialPosition.center} 
        zoom={initialPosition.zoom} 
        style={{ height: '100%', width: '100%' }} 
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* Harita olaylarını dinle */}
        <MapEventHandler />
        
        {/* Aktif kurye markerları - key ile React'e "bu aynı kurye" diyoruz */}
        {activeCouriers && activeCouriers.map((c: any) => {
          const color = getMotorcycleColor(c.status || 'idle')
          
          return (
            <Marker 
              key={c.id}
              position={[Number(c.last_lat), Number(c.last_lng)]}
              icon={createMotorcycleIcon(color)}
            >
              <Popup>
                <div className="text-center p-2 min-w-[150px]">
                  <div className="font-bold text-lg mb-2 text-slate-900">
                    🚴 {c.full_name || 'Kurye'}
                  </div>
                  
                  <div className={`text-sm px-3 py-1 rounded-full mb-2 ${
                    c.status === 'on_the_way' || c.status === 'picking_up'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {c.status === 'on_the_way' ? '🚗 Teslimatta' :
                     c.status === 'picking_up' ? '🏃 Alıyor' :
                     '🟢 Boşta'}
                  </div>
                  
                  <div className="text-sm font-semibold text-slate-700">
                    📦 {c.activePackageCount || 0} Aktif Paket
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

// React.memo ile sarmala - sadece couriers değiştiğinde render et
export default memo(CourierMap, (prevProps, nextProps) => {
  return areCouriersEqual(prevProps.couriers, nextProps.couriers)
})
