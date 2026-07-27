'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { CheckCircle2, MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

// Leaflet varsayılan ikon sorunu (React/Webpack)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface CustomerLocationPoint {
  id: string
  phone_number: string
  latitude: number
  longitude: number
  label: string
  created_at?: string
}

interface CustomerMapProps {
  locations: CustomerLocationPoint[]
  selectedLocationId?: string | null
  onSelectLocation: (location: CustomerLocationPoint) => void
  darkMode?: boolean
  className?: string
}

/** Küçük kart haritalarında gri karo sorununu giderir */
function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [map])
  return null
}

function MiniMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const center: [number, number] = [latitude, longitude]

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false}
      keyboard={false}
      touchZoom={false}
      boxZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <InvalidateSize />
      <Marker position={center} interactive={false} />
    </MapContainer>
  )
}

/**
 * Müşteri konum geçmişi — her kayıt için ayrı küçük harita kartı (grid).
 * Kart veya "Seç" tıklanınca konum seçilir; seçili kart yeşil çerçeve alır.
 */
export default function CustomerMap({
  locations,
  selectedLocationId = null,
  onSelectLocation,
  darkMode = true,
  className,
}: CustomerMapProps) {
  if (locations.length === 0) return null

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className || ''}`}
    >
      {locations.map((loc) => {
        const isSelected = selectedLocationId === loc.id
        const label = loc.label?.trim() || 'Kayıtlı konum'

        return (
          <div
            key={loc.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectLocation(loc)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectLocation(loc)
              }
            }}
            className={`rounded-md overflow-hidden border-2 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-green-500/60 ${
              isSelected
                ? 'border-green-500 bg-green-500/10 shadow-sm shadow-green-500/20'
                : darkMode
                ? 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Etiket başlığı */}
            <div
              className={`px-3 py-2.5 flex items-center gap-2 border-b ${
                isSelected
                  ? 'border-green-500/40'
                  : darkMode
                  ? 'border-slate-700'
                  : 'border-gray-100'
              }`}
            >
              {isSelected ? (
                <CheckCircle2
                  className="w-5 h-5 text-green-400 shrink-0"
                  strokeWidth={1.5}
                />
              ) : (
                <MapPin
                  className={`w-5 h-5 shrink-0 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`}
                  strokeWidth={1.5}
                />
              )}
              <span
                className={`text-base font-bold truncate ${
                  isSelected
                    ? 'text-green-400'
                    : darkMode
                    ? 'text-white'
                    : 'text-gray-900'
                }`}
              >
                {label}
              </span>
            </div>

            {/* Mini harita */}
            <div
              className="relative h-36 w-full pointer-events-none"
              aria-hidden
            >
              <MiniMap latitude={loc.latitude} longitude={loc.longitude} />
            </div>

            {/* Seç butonu */}
            <div className="p-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectLocation(loc)
                }}
                className={`w-full py-2 px-3 text-sm font-semibold rounded-md transition-colors ${
                  isSelected
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {isSelected ? 'Seçildi' : 'Seç'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
