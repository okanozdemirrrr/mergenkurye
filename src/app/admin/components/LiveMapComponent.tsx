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
  onRefresh?: () => void
}

// Harita merkezini güncelleme komponenti
function MapUpdater({ center }: { center: [number, number] }) {
  try {
    // @ts-ignore - Leaflet dinamik import
    const { useMap } = require('react-leaflet')
    const map = useMap()
    useEffect(() => {
      if (map) {
        map.setView(center, map.getZoom())
      }
    }, [center, map])
  } catch (e) {
    // Leaflet yüklenmemişse hata yok
  }
  return null
}

export function LiveMapComponent({ packages, couriers, restaurants, onRefresh }: LiveMapComponentProps) {
  const [isClient, setIsClient] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapCenter] = useState<[number, number]>([41.494714153011856, 36.07827997146362]) // Samsun merkez - restoranların ortası
  const [todayHeatmapPoints, setTodayHeatmapPoints] = useState<Array<{ lat: number, lng: number }>>([])

  // Bugünün tüm siparişlerinin koordinatlarını çek
  useEffect(() => {
    console.log('🗺️ Yoğunluk noktaları effect çalıştı, isClient:', isClient)
    
    if (!isClient) {
      console.log('⏳ Client henüz hazır değil, bekleniyor...')
      return
    }

    const fetchTodayOrders = async () => {
      try {
        console.log('🗺️ fetchTodayOrders başladı')
        
        // Son 24 saatin siparişlerini göster
        const twentyFourHoursAgo = new Date()
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

        const { supabase } = await import('../../lib/supabase')
        console.log('🗺️ Supabase import edildi')
        
        // Sadece aktif paketleri çek (teslim edilmemiş ve iptal edilmemiş)
        const { data, error } = await supabase
          .from('packages')
          .select('latitude, longitude, created_at, status')
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .not('status', 'in', '("delivered","cancelled")')

        console.log('🗺️ Supabase sorgusu tamamlandı')
        
        if (error) {
          console.error('❌ Supabase hatası:', error)
          throw error
        }

        console.log('🗺️ Çekilen aktif paketler:', data?.length || 0)
        console.log('🗺️ İlk 3 paket:', data?.slice(0, 3))

        const points = (data || [])
          .filter(pkg => {
            const hasCoords = pkg.latitude && pkg.longitude
            if (!hasCoords) {
              console.log('❌ Koordinatsız paket:', pkg)
            }
            return hasCoords
          })
          .map(pkg => ({ lat: pkg.latitude!, lng: pkg.longitude! }))

        // Eski verileri temizle ve yeni verileri set et
        setTodayHeatmapPoints([])
        setTimeout(() => {
          setTodayHeatmapPoints(points)
          console.log('✅ Yoğunluk noktaları set edildi:', points.length)
          console.log('🗺️ İlk 3 nokta:', points.slice(0, 3))
        }, 100)
      } catch (error) {
        console.error('❌ Yoğunluk noktaları yüklenemedi:', error)
      }
    }

    console.log('🗺️ fetchTodayOrders çağrılıyor...')
    fetchTodayOrders()

    // Her 2 dakikada bir yenile (daha sık güncelleme)
    const interval = setInterval(fetchTodayOrders, 120000)
    return () => clearInterval(interval)
  }, [isClient])

  // Client-side rendering kontrolü
  useEffect(() => {
    console.log('🗺️ setIsClient(true) çağrılıyor')
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

  // Uygulama foreground'a geldiğinde haritayı yenile
  useEffect(() => {
    if (!isClient) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🗺️ Uygulama foreground\'a geldi, harita yenileniyor...')
        // Harita verilerini yeniden çek
        const fetchData = async () => {
          const twentyFourHoursAgo = new Date()
          twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

          const { supabase } = await import('../../lib/supabase')
          
          const { data, error } = await supabase
            .from('packages')
            .select('latitude, longitude, created_at, status')
            .gte('created_at', twentyFourHoursAgo.toISOString())
            .not('status', 'in', '("delivered","cancelled")')

          if (!error && data) {
            const points = data
              .filter(pkg => pkg.latitude && pkg.longitude)
              .map(pkg => ({ lat: pkg.latitude!, lng: pkg.longitude! }))
            
            // Eski verileri temizle
            setTodayHeatmapPoints([])
            setTimeout(() => {
              setTodayHeatmapPoints(points)
              console.log('✅ Harita yenilendi, nokta sayısı:', points.length)
            }, 100)
          }
        }
        fetchData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isClient])

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

    // İsmi kısalt (sadece ilk isim)
    const firstName = courier.full_name?.split(' ')[0] || 'Kurye'

    return L.divIcon({
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
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
          <div style="
            background: rgba(0, 0, 0, 0.75);
            color: white;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
            white-space: nowrap;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            pointer-events: none;
          ">${firstName}</div>
        </div>
      `,
      className: '',
      iconSize: [32, 45],
      iconAnchor: [16, 22],
      popupAnchor: [0, -22]
    })
  }

  // Restoran ikonu oluştur (basit versiyon)
  const getRestaurantIcon = (name: string) => {
    return L.divIcon({
      html: `
        <div style="
          background: #f97316;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">🍽️</div>
      `,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
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

  // Debug - İlk restoranın koordinatlarını kontrol et
  if (restaurantsWithCoords.length > 0) {
    const firstRestaurant = restaurantsWithCoords[0]
    console.log('🍽️ İlk restoran koordinatları:', {
      name: firstRestaurant.name,
      lat: firstRestaurant.latitude,
      lng: firstRestaurant.longitude,
      latType: typeof firstRestaurant.latitude,
      lngType: typeof firstRestaurant.longitude
    })
  }

  // Debug
  console.log('📦 Toplam paket:', packages.length)
  console.log('🍽️ Toplam restoran:', restaurants.length)
  console.log('🍽️ Koordinatlı restoran:', restaurantsWithCoords.length, restaurantsWithCoords)
  console.log('🍽️ Restaurants data:', restaurants)

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

          {/* Manuel Temizlik Butonu */}
          <button
            onClick={async () => {
              console.log('🧹 Manuel harita temizliği başlatıldı')
              setTodayHeatmapPoints([])
              
              const twentyFourHoursAgo = new Date()
              twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

              const { supabase } = await import('../../lib/supabase')
              
              const { data, error } = await supabase
                .from('packages')
                .select('latitude, longitude, created_at, status')
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .not('status', 'in', '("delivered","cancelled")')

              if (!error && data) {
                const points = data
                  .filter(pkg => pkg.latitude && pkg.longitude)
                  .map(pkg => ({ lat: pkg.latitude!, lng: pkg.longitude! }))
                
                setTimeout(() => {
                  setTodayHeatmapPoints(points)
                  console.log('✅ Manuel temizlik tamamlandı, nokta sayısı:', points.length)
                }, 100)
              }
              
              if (onRefresh) onRefresh()
            }}
            className="absolute top-4 right-16 z-[1000] bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg shadow-lg transition-colors text-sm font-medium"
            title="Haritayı Yenile"
          >
            🧹 Temizle
          </button>

          {/* Harita */}
          <MapContainer
            center={mapCenter}
            zoom={12}
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
              
              console.log('🍽️ Restoran marker oluşturuluyor:', restaurant.name, restaurant.latitude, restaurant.longitude)
              
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

            {/* Yoğunluk İzleme Noktaları - Bugünün tüm siparişleri */}
            {todayHeatmapPoints.map((point, index) => {
              const heatmapIcon = L.divIcon({
                html: `
                  <div style="
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    opacity: 0.7;
                    pointer-events: none;
                    box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
                  "></div>
                `,
                className: '',
                iconSize: [8, 8],
                iconAnchor: [4, 4]
              })

              return (
                <Marker
                  key={`heatmap-${index}`}
                  position={[point.lat, point.lng]}
                  icon={heatmapIcon}
                  interactive={false}
                />
              )
            })}
          </MapContainer>
        </div>
      </div>
    </>
  )
}
