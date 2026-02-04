/**
 * @file src/app/admin/components/LiveMapComponent.tsx
 * @description Canlı Malatya Haritası - Kurye ve Paket Takibi
 */
'use client'

import { useState, useEffect } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Package, Courier } from '@/types'

interface Restaurant {
  id: number | string
  name: string
  latitude?: number
  longitude?: number
  phone?: string
  address?: string
}

interface LiveMapComponentProps {
  packages: Package[]
  couriers: Courier[]
  restaurants: Restaurant[]
}

// Harita merkezini güncelleme komponenti
function MapUpdater({ center }: { center: [number, number] }) {
  // @ts-ignore - Leaflet dinamik import
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

export function LiveMapComponent({ packages, couriers, restaurants }: LiveMapComponentProps) {
  const [isClient, setIsClient] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapCenter] = useState<[number, number]>([38.3552, 38.3095]) // Malatya merkez

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
      <div className="h-full flex items-center justify-center bg-slate-800 rounded-xl text-slate-400">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-2">🗺️</div>
          <div className="text-sm">Harita yükleniyor...</div>
        </div>
      </div>
    )
  }

  // Client-side'da Leaflet'i import et
  const { MapContainer, TileLayer, Marker, Popup } = require('react-leaflet')
  const L = require('leaflet')

  // Paket durumuna göre ikon oluştur
  const getPackageIcon = (pkg: Package) => {
    // Sahipsiz paket: Kırmızı pulse effect
    const isUnassigned = !pkg.courier_id
    
    if (isUnassigned) {
      return L.divIcon({
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #ef4444;
              opacity: 0.4;
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            "></div>
            <div style="
              background: #ef4444;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid #ef4444;
              box-shadow: 0 0 0 2px white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              position: relative;
              z-index: 1;
            ">📦</div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.4; }
              50% { transform: scale(1.3); opacity: 0.1; }
            }
          </style>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      })
    }
    
    // Atanmış paket: Yeşil sabit
    return L.divIcon({
      html: `
        <div style="
          background: #22c55e;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid #22c55e;
          box-shadow: 0 0 0 2px white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">📦</div>
      `,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    })
  }

  // Kurye durumuna göre ikon oluştur
  const getCourierIcon = (courier: Courier) => {
    // Kuryenin üzerindeki aktif paketleri bul
    const courierPackages = packages.filter(
      pkg => pkg.courier_id === courier.id && 
      pkg.status !== 'delivered' && 
      pkg.status !== 'cancelled'
    )

    let color = '#22c55e' // Varsayılan: Yeşil (Boşta)
    let statusText = 'BOŞTA'

    if (courierPackages.length > 0) {
      // Hiyerarşi: Kırmızı > Sarı > Yeşil
      
      // 1. En az 1 paket restorandan alınmış mı? (picking_up veya on_the_way)
      const hasPickedUpPackage = courierPackages.some(
        pkg => pkg.status === 'picking_up' || pkg.status === 'on_the_way'
      )
      
      if (hasPickedUpPackage) {
        color = '#ef4444' // Kırmızı: Teslimat yapıyor
        statusText = 'TESLİMATTA'
      } else {
        // 2. Kabul edilmiş paket var mı? (assigned)
        const hasAssignedPackage = courierPackages.some(
          pkg => pkg.status === 'assigned'
        )
        
        if (hasAssignedPackage) {
          color = '#eab308' // Sarı: Restoran yolunda
          statusText = 'RESTORAN YOLUNDA'
        }
      }
    }

    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid ${color};
          box-shadow: 0 0 0 2px white, 0 0 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        ">🏍️</div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    })
  }

  // Restoran ikonu oluştur (isimle birlikte)
  const getRestaurantIcon = (name: string) => {
    return L.divIcon({
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
          <div style="
            background: #f97316;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid #f97316;
            box-shadow: 0 0 0 2px white, 0 0 8px rgba(249, 115, 22, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          ">🍽️</div>
          <div style="
            background: rgba(249, 115, 22, 0.95);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${name}</div>
        </div>
      `,
      className: '',
      iconSize: [100, 50],
      iconAnchor: [50, 25],
      popupAnchor: [0, -25]
    })
  }

  // Koordinatı olan paketleri filtrele (atanmış + atanmamış)
  const packagesWithCoords = packages.filter(
    pkg => pkg.latitude && pkg.longitude && 
    pkg.status !== 'delivered' && pkg.status !== 'cancelled'
  )
  
  // Aktif operasyondaki paketler (sayı için)
  const activeOperationPackages = packagesWithCoords.filter(
    pkg => pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way'
  )

  // Koordinatı olan kuryeleri filtrele
  const couriersWithCoords = couriers.filter(
    courier => courier.last_location?.latitude && courier.last_location?.longitude && courier.is_active
  )

  // TÜM restoranları göster (koordinatı olanlar)
  const restaurantsWithCoords = restaurants.filter(
    restaurant => restaurant.latitude && restaurant.longitude
  )

  // Debug
  console.log('📦 Toplam paket:', packages.length)
  console.log('🍽️ Toplam restoran:', restaurants.length)
  console.log('🍽️ Koordinatlı restoran:', restaurantsWithCoords.length, restaurantsWithCoords)

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

            {/* Restoran Markerları */}
            {restaurantsWithCoords.map(restaurant => {
              if (!restaurant) return null
              
              // Bu restorana ait aktif paketler
              const restaurantPackages = packages.filter(
                pkg => pkg.restaurant_id === restaurant.id && 
                pkg.status !== 'delivered' && 
                pkg.status !== 'cancelled'
              )
              
              return (
                <Marker
                  key={`restaurant-${restaurant.id}`}
                  position={[restaurant.latitude!, restaurant.longitude!]}
                  icon={getRestaurantIcon(restaurant.name)}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold text-orange-600">🍽️ {restaurant.name}</div>
                      <div className="text-xs mt-1">
                        {restaurant.phone && <div><strong>Telefon:</strong> {restaurant.phone}</div>}
                        {restaurant.address && <div><strong>Adres:</strong> {restaurant.address}</div>}
                        <div className="mt-1">
                          <strong>Aktif Siparişler:</strong> {restaurantPackages.length}
                        </div>
                        {restaurantPackages.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {restaurantPackages.map(pkg => (
                              <div key={pkg.id} className="text-[10px] bg-slate-100 p-1 rounded">
                                📦 {pkg.order_number || `#${pkg.id}`} - {
                                  pkg.status === 'waiting' ? '⏳ Bekliyor' :
                                  pkg.status === 'assigned' ? '👤 Atandı' :
                                  pkg.status === 'picking_up' ? '🏃 Alınıyor' :
                                  pkg.status === 'on_the_way' ? '🚗 Yolda' : pkg.status
                                }
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Paket Markerları */}
            {packagesWithCoords.map(pkg => (
              <Marker
                key={`pkg-${pkg.id}`}
                position={[pkg.latitude!, pkg.longitude!]}
                icon={getPackageIcon(pkg)}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-orange-600">📦 {pkg.order_number || `#${pkg.id}`}</div>
                    <div className="text-xs mt-1">
                      <div><strong>Restoran:</strong> {pkg.restaurant?.name || 'Bilinmiyor'}</div>
                      <div><strong>Müşteri:</strong> {pkg.customer_name}</div>
                      <div><strong>Adres:</strong> {pkg.delivery_address}</div>
                      <div><strong>Tutar:</strong> {pkg.amount}₺</div>
                      <div className="mt-1">
                        <strong>Durum:</strong> {
                          !pkg.courier_id ? '🔴 SAHİPSİZ' : '🟢 ATANMIŞ'
                        }
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Kurye Markerları */}
            {couriersWithCoords.map(courier => {
              const courierPackages = packages.filter(
                pkg => pkg.courier_id === courier.id && 
                pkg.status !== 'delivered' && 
                pkg.status !== 'cancelled'
              )
              
              return (
                <Marker
                  key={`courier-${courier.id}`}
                  position={[courier.last_location!.latitude, courier.last_location!.longitude]}
                  icon={getCourierIcon(courier)}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold text-orange-600">🏍️ {courier.full_name}</div>
                      <div className="text-xs mt-1">
                        <div><strong>Durum:</strong> {courier.is_active ? '✅ Aktif' : '❌ Pasif'}</div>
                        <div><strong>Telefon:</strong> {courier.phone || '-'}</div>
                        <div className="mt-1">
                          <strong>Üzerindeki Paketler:</strong> {courierPackages.length}
                        </div>
                        {courierPackages.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {courierPackages.map(pkg => (
                              <div key={pkg.id} className="text-[10px] bg-slate-100 p-1 rounded">
                                📦 {pkg.order_number || `#${pkg.id}`} - {
                                  pkg.status === 'assigned' ? '⏳ Atandı' :
                                  pkg.status === 'picking_up' ? '🏃 Alıyor' :
                                  pkg.status === 'on_the_way' ? '🚗 Yolda' : pkg.status
                                }
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      </div>
    </>
  )
}
