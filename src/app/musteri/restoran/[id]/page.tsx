'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { Category, Product } from '@/types/menu'
import { useCart } from '@/app/context/CartContext'
import ProductModal from './components/ProductModal'
import CartSidebar from './components/CartSidebar'
import AddressModal from '../../components/AddressModal'
import ReviewsSection from './components/ReviewsSection'

interface Restaurant {
  id: string
  name: string
  minimum_order_value: number
  delivery_fee: number
  rating: number
  estimated_delivery_time: string
  logo_url?: string
  cover_image_url?: string
}

export const dynamic = 'force-dynamic'

export default function RestaurantMenuPage() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params.id as string
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu')
  const [averageRating, setAverageRating] = useState<number | null>(null)
  
  const { addToCart, getCartItemCount } = useCart()

  useEffect(() => {
    fetchRestaurantData()
    fetchAverageRating()
    
    // Adresi yükle
    const address = localStorage.getItem('customer_address')
    if (address) {
      setSelectedAddress(address)
    }
  }, [restaurantId])

  const fetchAverageRating = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating_taste, rating_delivery')
        .eq('restaurant_id', restaurantId)

      if (error) throw error

      if (data && data.length > 0) {
        const avg = data.reduce((acc, review) => {
          return acc + (review.rating_taste + review.rating_delivery) / 2
        }, 0) / data.length
        setAverageRating(avg)
      }
    } catch (error) {
      console.error('Ortalama puan yüklenemedi:', error)
    }
  }

  const fetchRestaurantData = async () => {
    try {
      // Restoran bilgilerini çek
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

      if (restaurantError) throw restaurantError
      setRestaurant(restaurantData)

      // Kategorileri çek
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Ürünleri çek
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('display_order')

      if (productsError) throw productsError
      setProducts(productsData || [])
    } catch (error) {
      console.error('Veri yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAdd = (product: Product) => {
    addToCart(product, 1)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address)
    setShowAddressModal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🍔</div>
          <p className="text-[#6f6f6f]">Menü yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[20px] font-bold text-[#3c4043] mb-2">Restoran bulunamadı</h2>
          <button
            onClick={() => router.back()}
            className="text-[#f59e0b] hover:underline"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-32">
      {/* Hero Section - Cover Image + Logo */}
      <div className="relative w-full h-[280px] bg-gradient-to-br from-[#fef3c7] to-[#fde68a]">
        {restaurant.cover_image_url ? (
          <img 
            src={restaurant.cover_image_url} 
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">
            🍽️
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#3c4043] hover:bg-white transition-all shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        {/* Cart Button - Fixed Floating */}
        <button
          onClick={() => setShowCart(true)}
          className="fixed top-4 right-4 z-50 px-5 py-2.5 bg-[#f59e0b] text-white rounded-full font-bold text-[14px] hover:bg-[#d97706] transition-all shadow-lg flex items-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {getCartItemCount() > 0 && (
            <span className="bg-white text-[#f59e0b] text-[11px] font-bold px-2 py-0.5 rounded-full">
              {getCartItemCount()}
            </span>
          )}
        </button>
        
        {/* Logo Overlap */}
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-2xl border-4 border-white overflow-hidden">
            {restaurant.logo_url ? (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white text-3xl font-bold">
                {restaurant.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border-b border-[#e8e8e8] pt-16 pb-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-[28px] font-bold text-[#3c4043] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-3 text-[13px] text-[#6f6f6f]">
                <span className="flex items-center gap-1">
                  <span className="text-[#f59e0b]">⭐</span>
                  <span className="font-semibold text-[#3c4043]">
                    {averageRating ? averageRating.toFixed(1) : restaurant.rating}
                  </span>
                </span>
                <span>•</span>
                <span>{restaurant.estimated_delivery_time}</span>
                <span>•</span>
                <span className="font-semibold">Min. {restaurant.minimum_order_value}₺</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddressModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#f7f7f7] border border-[#e8e8e8] rounded-lg hover:border-[#f59e0b] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="text-[12px] font-semibold text-[#3c4043] max-w-[200px] truncate">
                {selectedAddress || 'Adresini Seç'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Category Navigation */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#e8e8e8] shadow-sm">
        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6 border-b border-[#e8e8e8]">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-3 px-2 font-semibold text-[14px] border-b-2 transition-colors ${
                activeTab === 'menu'
                  ? 'border-[#f59e0b] text-[#f59e0b]'
                  : 'border-transparent text-[#6f6f6f] hover:text-[#3c4043]'
              }`}
            >
              🍽️ Menü
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-3 px-2 font-semibold text-[14px] border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-[#f59e0b] text-[#f59e0b]'
                  : 'border-transparent text-[#6f6f6f] hover:text-[#3c4043]'
              }`}
            >
              ⭐ Yorumlar
            </button>
          </div>
        </div>

        {/* Category Bar (only show on menu tab) */}
        {activeTab === 'menu' && (
          <div className="max-w-7xl mx-auto px-6 py-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {categories.map(category => {
                const categoryProducts = products.filter(p => p.category_id === category.id)
                if (categoryProducts.length === 0) return null
                
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      const element = document.getElementById(`category-${category.id}`)
                      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="flex-shrink-0 px-4 py-2 bg-[#f7f7f7] hover:bg-[#f59e0b] hover:text-white rounded-full text-[13px] font-semibold text-[#3c4043] transition-all"
                  >
                    {category.icon_url && <span className="mr-1">{category.icon_url}</span>}
                    {category.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {activeTab === 'menu' ? (
        <main className="max-w-7xl mx-auto px-6 py-6">
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.category_id === category.id && p.is_visible !== false)
          
          if (categoryProducts.length === 0) return null

          return (
            <div key={category.id} id={`category-${category.id}`} className="mb-12 scroll-mt-24">
              <h2 className="text-[24px] font-bold text-[#3c4043] mb-6" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {category.name}
              </h2>

              <div className="space-y-4">
                {categoryProducts.map(product => (
                  <div
                    key={product.id}
                    className="bg-white border border-[#e8e8e8] rounded-2xl overflow-hidden hover:shadow-xl hover:border-[#f59e0b] transition-all group"
                  >
                    <div
                      onClick={() => handleProductClick(product)}
                      className="w-full flex items-center gap-4 p-4 cursor-pointer"
                    >
                      {/* Ürün Görseli - Sol */}
                      <div className="flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-[#fef3c7] to-[#fde68a] relative">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {/* Skeleton Loader */}
                            <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                            <span className="absolute text-4xl">🍽️</span>
                          </div>
                        )}
                      </div>

                      {/* Ürün Bilgileri - Sağ */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[17px] font-bold text-[#3c4043] mb-1 group-hover:text-[#f59e0b] transition-colors" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {product.name}
                        </h3>

                        {product.description && (
                          <p className="text-[13px] text-[#6f6f6f] mb-3 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-[20px] font-bold text-[#f59e0b]">
                            {product.price}₺
                          </span>
                          
                          {/* Hızlı Ekle Butonu */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickAdd(product)
                            }}
                            className="px-5 py-2 bg-[#f59e0b] text-white rounded-lg font-semibold text-[13px] hover:bg-[#d97706] transition-all hover:scale-105 flex items-center gap-2 shadow-md"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        
        {/* Boş Durum */}
        {categories.every(cat => products.filter(p => p.category_id === cat.id && p.is_visible !== false).length === 0) && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-[20px] font-bold text-[#3c4043] mb-2">
              Menü Henüz Hazır Değil
            </h3>
            <p className="text-[14px] text-[#6f6f6f]">
              Restoran menüsünü yakında ekleyecek
            </p>
          </div>
        )}
      </main>
      ) : (
        <ReviewsSection restaurantId={restaurantId} />
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <CartSidebar
          restaurant={restaurant}
          onClose={() => setShowCart(false)}
        />
      )}

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
