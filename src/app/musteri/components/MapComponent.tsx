'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapComponentProps {
  center: [number, number]
  onLocationChange: (lat: number, lng: number) => void
}

export default function MapComponent({ center, onLocationChange }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [currentCenter, setCurrentCenter] = useState(center)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Haritayı oluştur
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 15,
      zoomControl: true
    })

    // OpenStreetMap tile layer ekle
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    mapRef.current = map

    // Harita hareket ettiğinde merkez koordinatları güncelle
    map.on('move', () => {
      const center = map.getCenter()
      setCurrentCenter([center.lat, center.lng])
      onLocationChange(center.lat, center.lng)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Center değiştiğinde haritayı güncelle
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, mapRef.current.getZoom())
    }
  }, [center])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Sabit Pin (Haritanın Ortasında) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none z-[1000]">
        <svg width="40" height="50" viewBox="0 0 24 30" fill="none">
          <path
            d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 14 8 14s8-8.5 8-14c0-4.42-3.58-8-8-8z"
            fill="#f59e0b"
            stroke="white"
            strokeWidth="1"
          />
          <circle cx="12" cy="8" r="3" fill="white" />
        </svg>
      </div>

      {/* Koordinat Göstergesi */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg z-[1000]">
        <p className="text-[11px] font-mono text-[#3c4043]">
          {currentCenter[0].toFixed(6)}, {currentCenter[1].toFixed(6)}
        </p>
      </div>
    </div>
  )
}
