'use client'

import { useEffect, useState, useRef } from 'react'
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

export default function CourierMap({ couriers }: any) {
  const [MapBridge, setMapBridge] = useState<any>(null)
  const mapPositionRef = useRef(getStoredMapPosition())

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
    }

    initMap()
  }, [])

  if (!MapBridge) {
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
    const svgIcon = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="20" y="28" text-anchor="middle" font-size="20" fill="white">🏍️</text>
      </svg>
    `
    
    return new L.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
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
    
    return null
  }

  const mapPosition = mapPositionRef.current

  return (
    <div className="h-[400px] w-full rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
      <MapContainer 
        center={mapPosition.center} 
        zoom={mapPosition.zoom} 
        style={{ height: '100%', width: '100%' }} 
        scrollWheelZoom={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {/* Harita olaylarını dinle */}
        <MapEventHandler />
        
        {/* Aktif kurye markerları */}
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
