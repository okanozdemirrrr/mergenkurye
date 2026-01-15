'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Courier {
  id: string
  full_name?: string
  last_lat?: number | null
  last_lng?: number | null
  is_active?: boolean
  status?: 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'
  activePackageCount?: number
}

interface CourierMapProps {
  couriers: Courier[]
}

// LocalStorage'dan harita pozisyonunu oku
const getStoredMapPosition = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('courierMapPosition')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        center: [parsed.lat, parsed.lng] as [number, number],
        zoom: parsed.zoom
      }
    }
  } catch (error) {
    console.error('LocalStorage okuma hatası:', error)
  }
  
  // Default: Atakum, Samsun
  return {
    center: [41.3500, 36.2200] as [number, number],
    zoom: 13
  }
}

// LocalStorage'a harita pozisyonunu kaydet
const saveMapPosition = (lat: number, lng: number, zoom: number) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('courierMapPosition', JSON.stringify({ lat, lng, zoom }))
  } catch (error) {
    console.error('LocalStorage yazma hatası:', error)
  }
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

export default function CourierMap({ couriers }: CourierMapProps) {
  const [mounted, setMounted] = useState(false)
  const mapPositionRef = useRef(getStoredMapPosition())

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-96 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
        <div className="text-slate-500">🗺️ Harita yükleniyor...</div>
      </div>
    )
  }

  // Sadece aktif ve koordinatı olan kuryeler
  const activeCouriersWithCoords = couriers.filter(courier => {
    if (!courier.is_active) return false
    
    const lat = Number(courier.last_lat)
    const lng = Number(courier.last_lng)
    return !isNaN(lat) && lat !== 0 && !isNaN(lng) && lng !== 0
  })

  // Motor ikonu rengini belirle
  const getMotorcycleColor = (courier: Courier) => {
    // Paket taşıyorsa (on_the_way veya picking_up) → Turuncu
    if (courier.status === 'on_the_way' || courier.status === 'picking_up') {
      return '#f97316' // Orange-500
    }
    // Boşta (idle) → Yeşil
    return '#22c55e' // Green-500
  }

  const mapPosition = mapPositionRef.current!

  return (
    <div className="w-full h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
      <MapContainer
        center={mapPosition.center}
        zoom={mapPosition.zoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Harita olaylarını dinle */}
        <MapEventHandler />
        
        {/* Aktif kurye markerları */}
        {activeCouriersWithCoords.map((courier) => {
          const lat = Number(courier.last_lat)
          const lng = Number(courier.last_lng)
          const color = getMotorcycleColor(courier)
          
          return (
            <Marker
              key={courier.id}
              position={[lat, lng]}
              icon={createMotorcycleIcon(color)}
            >
              <Popup>
                <div className="text-center p-2 min-w-[150px]">
                  <div className="font-bold text-lg mb-2">🚴 {courier.full_name}</div>
                  
                  <div className={`text-sm px-3 py-1 rounded-full mb-2 ${
                    courier.status === 'on_the_way' || courier.status === 'picking_up'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {courier.status === 'on_the_way' ? '🚗 Teslimatta' :
                     courier.status === 'picking_up' ? '🏃 Alıyor' :
                     '🟢 Boşta'}
                  </div>
                  
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    📦 {courier.activePackageCount || 0} Aktif Paket
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
