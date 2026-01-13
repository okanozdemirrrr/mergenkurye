'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet marker ikonlarını düzelt (Next.js için gerekli)
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
  status?: string
}

interface CourierMapProps {
  couriers: Courier[]
}

export default function CourierMap({ couriers }: CourierMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Samsun/Merkez koordinatları
  const samsunCenter: [number, number] = [41.2867, 36.3300]

  // HER ŞEYİ GÖSTER - FİLTRE YOK!
  const allCouriers = couriers || []

  console.log('🗺️ CourierMap - Gelen tüm kuryeler:', allCouriers)
  console.log('🗺️ CourierMap - Kurye sayısı:', allCouriers.length)
  
  allCouriers.forEach(courier => {
    console.log(`🚴 ${courier.full_name}: lat=${courier.last_lat}, lng=${courier.last_lng}, active=${courier.isActive}`)
  })

  if (!mounted) {
    return (
      <div className="w-full h-96 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
        <div className="text-slate-500">🗺️ Harita yükleniyor...</div>
      </div>
    )
  }

  // Kurye durumuna göre marker rengi
  const getMarkerIcon = (courier: Courier) => {
    let color = '#6b7280' // Varsayılan gri
    
    if (!courier.isActive) {
      color = '#9ca3af' // Pasif kuryeler için açık gri
    } else if (courier.status === 'idle') {
      color = '#10b981' // Yeşil - Boşta
    } else if (courier.status === 'assigned') {
      color = '#3b82f6' // Mavi - Atanmış
    } else if (courier.status === 'picking_up') {
      color = '#f59e0b' // Sarı - Alıyor
    } else if (courier.status === 'on_the_way') {
      color = '#ef4444' // Kırmızı - Yolda
    }

    // Kurye isminin ilk harfini marker içinde göster
    const initial = courier.full_name?.charAt(0) || '?'

    return new L.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
          <circle cx="12.5" cy="12.5" r="8" fill="white"/>
          <text x="12.5" y="17" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="${color}">${initial}</text>
        </svg>
      `)}`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    })
  }

  return (
    <div className="w-full h-96 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <MapContainer
        center={samsunCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <style jsx global>{`
          .courier-tooltip {
            background: rgba(0, 0, 0, 0.8) !important;
            border: none !important;
            border-radius: 4px !important;
            color: white !important;
            font-size: 12px !important;
            padding: 4px 8px !important;
          }
          .courier-tooltip::before {
            border-top-color: rgba(0, 0, 0, 0.8) !important;
          }
        `}</style>
        
        {/* HER KURYEYİ GÖSTER - FİLTRE YOK */}
        {allCouriers.map((courier) => {
          // Eğer konum yoksa Samsun merkezine koy
          const lat = courier.last_lat || 41.2867
          const lng = courier.last_lng || 36.3300
          
          return (
            <Marker
              key={courier.id}
              position={[lat, lng]}
              icon={getMarkerIcon(courier)}
            >
              <Tooltip permanent direction="top" offset={[0, -45]} className="courier-tooltip">
                <span className="font-bold text-sm">{courier.full_name}</span>
              </Tooltip>
              <Popup>
                <div className="text-center p-2">
                  <div className="font-bold text-lg mb-1">🚴 {courier.full_name}</div>
                  <div className={`text-sm px-2 py-1 rounded-full ${
                    !courier.isActive ? 'bg-gray-100 text-gray-700' :
                    courier.status === 'idle' ? 'bg-green-100 text-green-700' :
                    courier.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    courier.status === 'picking_up' ? 'bg-yellow-100 text-yellow-700' :
                    courier.status === 'on_the_way' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {!courier.isActive ? '⚫ Pasif' :
                     courier.status === 'idle' ? '🟢 Boşta' :
                     courier.status === 'assigned' ? '🔵 Paket Bekliyor' :
                     courier.status === 'picking_up' ? '🟡 Alıyor' :
                     courier.status === 'on_the_way' ? '🔴 Teslimatta' : '⚫ Bilinmiyor'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Aktif: {courier.isActive ? 'Evet' : 'Hayır'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {courier.last_lat ? 'Gerçek konum' : 'Varsayılan konum'}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      
      {/* Harita altında kurye bilgisi */}
      <div className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
        📍 Haritada {allCouriers.length} kurye gösteriliyor (FİLTRE YOK - HEPSI GÖSTERİLİYOR)
        {allCouriers.length === 0 && (
          <div className="text-xs text-red-600 mt-1">
            ❌ Couriers tablosunda veri yok! SQL'i çalıştırın.
          </div>
        )}
      </div>
    </div>
  )
}