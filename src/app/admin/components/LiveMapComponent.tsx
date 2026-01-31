/**
 * @file src/app/admin/components/LiveMapComponent.tsx
 * @description Canlı Malatya Haritası - Kurye ve Paket Takibi
 */
'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Maximize2, Minimize2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { Package, Courier } from '@/types'

interface LiveMapComponentProps {
  packages: Package[]
  couriers: Courier[]
}

// Harita merkezini güncelleme komponenti
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export function LiveMapComponent({ packages, couriers }: LiveMapComponentProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapCenter] = useState<[number, number]>([38.3552, 38.3095]) // Malatya merkez

  // Paket ikonu
  const packageIcon = L.divIcon({
    html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 14px;">📦</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })

  // Kurye ikonu
  const courierIcon = L.divIcon({
    html: `<div style="background: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px;">🏍️</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  })

  // Koordinatı olan paketleri filtrele
  const packagesWithCoords = packages.filter(
    pkg => pkg.latitude && pkg.longitude && pkg.status !== 'delivered' && pkg.status !== 'cancelled'
  )

  // Koordinatı olan kuryeleri filtrele
  const couriersWithCoords = couriers.filter(
    courier => courier.last_location?.latitude && courier.last_location?.longitude && courier.is_active
  )

  return (
    <>
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4' : 'relative h-full'}`}>
        <div className="relative h-full rounded-xl overflow-hidden border border-slate-700">
          {/* Büyüt/Küçült Butonu */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-4 right-4 z-[1000] bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg transition-colors"
            title={isFullscreen ? 'Küçült' : 'Büyüt'}
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          {/* Harita */}
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <MapUpdater center={mapCenter} />
            
            {/* Koyu tema harita katmanı */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Paket Markerları */}
            {packagesWithCoords.map(pkg => (
              <Marker
                key={`pkg-${pkg.id}`}
                position={[pkg.latitude!, pkg.longitude!]}
                icon={packageIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-blue-600">📦 {pkg.order_number || `#${pkg.id}`}</div>
                    <div className="text-xs mt-1">
                      <div><strong>Restoran:</strong> {pkg.restaurant?.name || 'Bilinmiyor'}</div>
                      <div><strong>Müşteri:</strong> {pkg.customer_name}</div>
                      <div><strong>Adres:</strong> {pkg.delivery_address}</div>
                      <div><strong>Tutar:</strong> {pkg.amount}₺</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Kurye Markerları */}
            {couriersWithCoords.map(courier => (
              <Marker
                key={`courier-${courier.id}`}
                position={[courier.last_location!.latitude, courier.last_location!.longitude]}
                icon={courierIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-blue-600">🏍️ {courier.full_name}</div>
                    <div className="text-xs mt-1">
                      <div><strong>Durum:</strong> {courier.is_active ? '✅ Aktif' : '❌ Pasif'}</div>
                      <div><strong>Telefon:</strong> {courier.phone || '-'}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Bilgi Paneli */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-800/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg text-xs">
            <div className="font-bold mb-2">📍 Canlı Takip</div>
            <div className="space-y-1">
              <div>📦 Paketler: {packagesWithCoords.length}</div>
              <div>🏍️ Kuryeler: {couriersWithCoords.length}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
