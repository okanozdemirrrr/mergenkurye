'use client'

import { useEffect, useState, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

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

export default function CourierMap({ couriers }: CourierMapProps) {
  const [MapBridge, setMapBridge] = useState<any>(null)
  const mapPositionRef = useRef(getStoredMapPosition())

  useEffect(() => {
    // Leaflet'i sadece TARAYICIDA (useEffect içinde) yükle
    import('react-leaflet').then((mod) => {
      const L = require('leaflet')
      
      // İkon hatasını burada fixle
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      })
      
      setMapBridge({ ...mod, L })
    })
  }, [])

  if (!MapBridge || !couriers) {
    return (
      <div className="h-[400px] w-full bg-slate-800 rounded-2xl flex items-center justify-center text-white font-bold">
        🗺️ Harita Yükleniyor...
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, useMapEvents, L } = MapBridge

  // Sadece aktif ve koordinatı olan kuryeler
  const activeCouriersWithCoords = couriers.filter((courier: Courier) => {
    if (!courier.is_active) return false
    if (!courier.last_lat || !courier.last_lng) return false
    
    const lat = Number(courier.last_lat)
    const lng = Number(courier.last_lng)
    
    if (isNaN(lat) || isNaN(lng)) return false
    if (lat === 0 || lng === 0) return false
    if (lat < 35 || lat > 45 || lng < 30 || lng > 40) return false
    
    return true
  })

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
  const getMotorcycleColor = (courier: Courier) => {
    if (courier.status === 'on_the_way' || courier.status === 'picking_up') {
      return '#f97316' // Orange-500 (Paket taşıyor)
    }
    return '#22c55e' // Green-500 (Boşta)
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
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Harita olaylarını dinle */}
        <MapEventHandler />
        
        {/* Aktif kurye markerları */}
        {activeCouriersWithCoords.map((courier: Courier) => {
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
