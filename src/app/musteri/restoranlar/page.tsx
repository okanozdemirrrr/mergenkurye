'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, FileText, User } from 'lucide-react'
import { calculateDistance, formatDistance } from '@/app/lib/distanceUtils'
import AddressModal from '../components/AddressModal'
import NotificationBell from '../components/NotificationBell'

interface Restaurant {
  id: string
  name: string
  logo_url?: string
  cover_image_url?: string
  delivery_fee?: number
  min_order_amount?: number
  rating?: number
  estimated_delivery_time?: string
  category?: string
  is_open?: boolean
  has_campaign?: boolean
  latitude?: number
  longitude?: number
}

const CATEGORIES = [
  { name: 'Tümü', icon: '🍽️' },
  { name: 'Burger', icon: '🍔' },
  { name: 'Pizza', icon: '🍕' },
  { name: 'Döner', icon: '🥙' },
  { name: 'Tatlı', icon: '🍰' },
  { name: 'Kahve', icon: '☕' },
  { name: 'Tavuk', icon: '🍗' },
  { name: 'Kebap', icon: '🍖' }
]

const MAX_DISTANCE_METERS = 10000 // 10 km

export default function RestoranlarPage() {
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [selectedAddress, setSelectedAddress] = useState('')
  const [customerLat, setCustomerLat] = useState<number | null>(null)
  const [customerLng, setCustomerLng] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Oturum kontrolü
    const customerId = localStorage.getItem('customer_id')
    const name = localStorage.getItem('customer_name')
    const address = localStorage.getItem('customer_address')
    
    if (!customerId) {
      router.push('/musteri')
      return
    }

    setCustomerName(name || 'Misafir')
    setSelectedAddress(address || '')

    // Müşteri koordinatlarını al
    fetchCustomerLocation(customerId)
    fetchRestaurants()
  }, [router])

  // Menü dışına tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const fetchCustomerLocation = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('latitude, longitude')
        .eq('id', customerId)
        .single()

      if (error) throw error

      if (data?.latitude && data?.longitude) {
        setCustomerLat(data.latitude)
        setCustomerLng(data.longitude)
      } else {
        // Varsayılan: Samsun 19 Mayıs
        setCustomerLat(41.492892)
        setCustomerLng(36.081592)
      }
    } catch (error) {
      console.error('Müşteri konumu alınamadı:', error)
      // Varsayılan konum
      setCustomerLat(41.492892)
      setCustomerLng(36.081592)
    }
  }

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name')

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Restoranlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mesafe ve kategori filtreleme
  const filteredRestaurants = useMemo(() => {
    if (!customerLat || !customerLng) return restaurants

    return restaurants
      .map(restaurant => {
        // Restoran koordinatları yoksa varsayılan mesafe
        if (!restaurant.latitude || !restaurant.longitude) {
          return { ...restaurant, distance: 0 }
        }

        const distance = calculateDistance(
          customerLat,
          customerLng,
          restaurant.latitude,
          restaurant.longitude
        )

        return { ...restaurant, distance }
      })
      .filter(restaurant => {
        // 10 km sınırı
        if (restaurant.distance > MAX_DISTANCE_METERS) return false
        
        // Kategori filtresi
        if (selectedCategory !== 'Tümü' && restaurant.category !== selectedCategory) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        // Açık restoranlar önce
        if (a.is_open && !b.is_open) return -1
        if (!a.is_open && b.is_open) return 1
        
        // Sonra mesafeye göre
        return a.distance - b.distance
      })
  }, [restaurants, customerLat, customerLng, selectedCategory])

  // Açık ve kapalı restoranları ayır
  const openRestaurants = filteredRestaurants.filter(r => r.is_open !== false)
  const closedRestaurants = filteredRestaurants.filter(r => r.is_open === false)

  const handleLogout = () => {
    localStorage.removeItem('customer_id')
    localStorage.removeItem('customer_name')
    localStorage.removeItem('customer_address')
    router.push('/musteri')
  }

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address)
    setShowAddressModal(false)
    // Sayfayı yenile (yeni adrese göre restoranları filtrele)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🛵</div>
          <p className="text-[#6f6f6f]">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e8e8] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image 
              src="/logo.png" 
              alt="Alda Gel" 
              width={120} 
              height={40}
              className="cursor-pointer"
              onClick={() => router.push('/musteri')}
            />
            
            <button
              onClick={() => setShowAddressModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e8e8] rounded-lg hover:border-[#f59e0b] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="text-[14px] font-semibold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {selectedAddress || 'Adresini Seç'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[14px] text-[#6f6f6f]">
              Hoş geldin, <span className="font-semibold text-[#3c4043]">{customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f59e0b] rounded-full flex items-center justify-center text-white font-bold text-[14px]">
                {customerName.charAt(0).toUpperCase()}
              </div>
            </div>
            
            {/* Hamburger Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-300 hover:text-[#f59e0b] transition-colors cursor-pointer"
              >
                <Menu size={20} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        router.push('/musteri/siparislerim')
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-slate-700 transition-colors text-left"
                    >
                      <FileText size={18} />
                      <span className="text-[14px] font-medium">📜 Geçmiş Siparişlerim</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        router.push('/musteri/profil')
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-slate-700 transition-colors text-left"
                    >
                      <User size={18} />
                      <span className="text-[14px] font-medium">👤 Profilim</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Notification Bell - Hamburger ile Çıkış arasında */}
            <NotificationBell />
            
            <button
              onClick={handleLogout}
              className="text-[13px] text-[#6f6f6f] hover:text-[#f59e0b] transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Kategori Barı */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-semibold transition-all ${
                  selectedCategory === category.name
                    ? 'bg-[#f59e0b] text-white shadow-md'
                    : 'bg-[#f7f7f7] text-[#3c4043] hover:bg-[#e8e8e8]'
                }`}
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Açık Restoranlar */}
        {openRestaurants.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[20px] font-bold text-[#3c4043] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              Restoranlar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} router={router} />
              ))}
            </div>
          </div>
        )}

        {/* Kapalı Restoranlar */}
        {closedRestaurants.length > 0 && (
          <div>
            <h2 className="text-[18px] font-bold text-[#6f6f6f] mb-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              Geçici Olarak Kapalı
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} router={router} isClosed />
              ))}
            </div>
          </div>
        )}

        {/* Sonuç Bulunamadı */}
        {filteredRestaurants.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-[20px] font-bold text-[#3c4043] mb-2">
              Restoran Bulunamadı
            </h3>
            <p className="text-[14px] text-[#6f6f6f]">
              Bu kategoride veya konumunuzda restoran bulunmuyor
            </p>
          </div>
        )}
      </main>
      
      {/* Address Modal */}
      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          onAddressSelect={handleAddressSelect}
        />
      )}
    </div>
  )
}

// Restoran Kartı Komponenti
function RestaurantCard({ 
  restaurant, 
  router, 
  isClosed = false 
}: { 
  restaurant: Restaurant & { distance?: number }
  router: any
  isClosed?: boolean
}) {
  return (
    <div
      onClick={() => !isClosed && router.push(`/musteri/restoran/${restaurant.id}`)}
      className={`bg-white border border-[#e8e8e8] rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
        isClosed ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#f59e0b]'
      }`}
    >
      {/* Kapak Fotoğrafı */}
      <div className="relative h-[160px] bg-gradient-to-br from-[#fef3c7] to-[#fde68a]">
        {restaurant.cover_image_url ? (
          <img 
            src={restaurant.cover_image_url} 
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🍽️
          </div>
        )}
        
        {/* Kampanya Badge */}
        {restaurant.has_campaign && !isClosed && (
          <div className="absolute top-3 left-3 bg-[#f59e0b] text-white px-3 py-1 rounded-full text-[11px] font-bold">
            Fırsat
          </div>
        )}

        {/* Kapalı Badge */}
        {isClosed && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-[#3c4043] px-4 py-2 rounded-lg font-bold text-[14px]">
              Kapalı
            </span>
          </div>
        )}
      </div>

      {/* İçerik */}
      <div className="p-4">
        <h3 className="text-[16px] font-bold text-[#3c4043] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          {restaurant.name}
        </h3>

        <div className="flex items-center gap-2 text-[13px] text-[#6f6f6f] mb-2">
          <span className="flex items-center gap-1">
            ⭐ {restaurant.rating || '4.5'}
          </span>
          <span>•</span>
          <span>{restaurant.estimated_delivery_time || '20-30 dk'}</span>
          {restaurant.distance !== undefined && restaurant.distance > 0 && (
            <>
              <span>•</span>
              <span>{formatDistance(restaurant.distance)}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[#6f6f6f]">
            Min. {restaurant.min_order_amount || 0}₺
          </span>
          {restaurant.delivery_fee !== undefined && (
            <span className="text-[#f59e0b] font-semibold">
              {restaurant.delivery_fee === 0 ? 'Ücretsiz Teslimat' : `${restaurant.delivery_fee}₺ Teslimat`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
