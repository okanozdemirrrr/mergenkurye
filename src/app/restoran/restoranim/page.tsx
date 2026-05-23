/**
 * @file src/app/restoran/restoranim/page.tsx
 * @description Restoran Dijital Varlık Yönetim Merkezi
 * Mağaza kimliği, menü, stok ve yorum yönetimi tek çatı altında
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Upload, Save, Image as ImageIcon, Star, MessageSquare, Eye, EyeOff, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ProductOptionsManager, { OptionGroup } from '../components/ProductOptionsManager'

interface Restaurant {
  id: string
  name: string
  description?: string
  working_hours?: string
  cover_image_url?: string
  logo_url?: string
  minimum_order_value?: number
}

interface Category {
  id: string
  name: string
  restaurant_id: string
  display_order: number
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  category_id: string
  image_url?: string
  is_available: boolean
  display_order: number
  upsell_product_ids?: string[]
  options?: OptionGroup[]
}

interface Review {
  id: string
  customer_id: string
  restaurant_id: string
  order_id: number
  taste_rating: number
  delivery_rating: number
  comment?: string
  restaurant_reply?: string
  created_at: string
  replied_at?: string
  customer?: {
    full_name: string
  }
}

export default function RestoranımPage() {
  const [activeTab, setActiveTab] = useState<'branding' | 'menu' | 'reviews'>('branding')
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Branding Form
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    description: '',
    working_hours: '',
    minimum_order_value: '0'
  })
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    loadRestaurantData()

    // Ürün güncellemelerini dinle
    const handleProductsUpdate = (event: any) => {
      if (event.detail?.products) {
        setProducts(event.detail.products)
      }
    }

    window.addEventListener('products-updated', handleProductsUpdate)

    return () => {
      window.removeEventListener('products-updated', handleProductsUpdate)
    }
  }, [])

  const loadRestaurantData = async () => {
    try {
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) return

      // Restaurant bilgileri
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

      if (restaurantError) throw restaurantError

      setRestaurant(restaurantData)
      setBrandingForm({
        name: restaurantData.name || '',
        description: restaurantData.description || '',
        working_hours: restaurantData.working_hours || '',
        minimum_order_value: restaurantData.minimum_order_value?.toString() || '0'
      })
      setCoverPreview(restaurantData.cover_image_url || null)
      setLogoPreview(restaurantData.logo_url || null)

      // Kategoriler
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: true })

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Ürünler
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('category_id', (categoriesData || []).map(c => c.id))
        .order('display_order', { ascending: true })

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Yorumlar
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:customers!reviews_customer_id_fkey(full_name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (reviewsError) throw reviewsError
      setReviews(reviewsData || [])

    } catch (error) {
      console.error('Veri yüklenemedi:', error)
      setErrorMessage('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'cover' | 'logo'): Promise<string | null> => {
    try {
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurantId}_${type}_${Date.now()}.${fileExt}`
      const filePath = `${type === 'cover' ? 'restaurant-covers' : 'restaurant-logos'}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Resim yüklenemedi:', error)
      return null
    }
  }

  const saveBranding = async () => {
    try {
      setLoading(true)
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) {
        setErrorMessage('❌ Restoran ID bulunamadı')
        setLoading(false)
        return
      }

      let coverUrl = restaurant?.cover_image_url
      let logoUrl = restaurant?.logo_url

      // Kapak fotoğrafı yükle
      if (coverImageFile) {
        console.log('Kapak fotoğrafı yükleniyor...')
        const url = await handleImageUpload(coverImageFile, 'cover')
        if (url) {
          coverUrl = url
          console.log('Kapak URL:', url)
        } else {
          setErrorMessage('❌ Kapak fotoğrafı yüklenemedi')
          setLoading(false)
          return
        }
      }

      // Logo yükle
      if (logoFile) {
        console.log('Logo yükleniyor...')
        const url = await handleImageUpload(logoFile, 'logo')
        if (url) {
          logoUrl = url
          console.log('Logo URL:', url)
        } else {
          setErrorMessage('❌ Logo yüklenemedi')
          setLoading(false)
          return
        }
      }

      // Minimum sepet tutarını validate et
      const minimumOrderValue = parseFloat(brandingForm.minimum_order_value)
      if (isNaN(minimumOrderValue) || minimumOrderValue < 0) {
        setErrorMessage('❌ Geçerli bir minimum sepet tutarı girin')
        setLoading(false)
        return
      }

      // Güncelle
      console.log('Veritabanı güncelleniyor...')
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: brandingForm.name,
          description: brandingForm.description,
          working_hours: brandingForm.working_hours,
          minimum_order_value: minimumOrderValue,
          cover_image_url: coverUrl,
          logo_url: logoUrl
        })
        .eq('id', restaurantId)

      if (error) {
        console.error('Veritabanı hatası:', error)
        throw error
      }

      setSuccessMessage('✅ Mağaza bilgileri başarıyla güncellendi!')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadRestaurantData()
    } catch (error: any) {
      console.error('Kayıt hatası:', error)
      setErrorMessage(`❌ Kayıt sırasında hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const toggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: !currentStatus })
        .eq('id', productId)

      if (error) throw error

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_available: !currentStatus } : p
      ))

      setSuccessMessage('✅ Stok durumu güncellendi!')
      setTimeout(() => setSuccessMessage(''), 2000)
    } catch (error) {
      console.error('Stok güncellenemedi:', error)
      setErrorMessage('❌ Stok güncellenemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const saveReply = async (reviewId: string, reply: string) => {
    try {
      setLoading(true)
      
      console.log('Yanıt kaydediliyor:', { reviewId, reply })
      
      const { data, error } = await supabase
        .from('reviews')
        .update({ 
          restaurant_reply: reply,
          replied_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()

      if (error) {
        console.error('Supabase hatası:', error)
        throw error
      }

      console.log('Yanıt kaydedildi:', data)

      setSuccessMessage('✅ Yanıt kaydedildi ve müşteriye bildirim gönderildi!')
      setTimeout(() => setSuccessMessage(''), 3000)
      await loadRestaurantData()
    } catch (error: any) {
      console.error('Yanıt kaydedilemedi:', error)
      setErrorMessage(`❌ Yanıt kaydedilemedi: ${error.message || 'Bilinmeyen hata'}`)
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 py-6 px-4">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/90 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🏪 Restoranım</h1>
          <p className="text-slate-400">Dijital varlıklarınızı tek yerden yönetin</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'branding'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🎨 Mağaza Kimliği
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🍽️ Menü & Stok
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⭐ Yorumlar
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'branding' && (
            <BrandingTab
              key="branding"
              brandingForm={brandingForm}
              setBrandingForm={setBrandingForm}
              coverPreview={coverPreview}
              logoPreview={logoPreview}
              setCoverImageFile={setCoverImageFile}
              setLogoFile={setLogoFile}
              setCoverPreview={setCoverPreview}
              setLogoPreview={setLogoPreview}
              saveBranding={saveBranding}
              loading={loading}
            />
          )}
          {activeTab === 'menu' && (
            <MenuTab
              key="menu"
              categories={categories}
              products={products}
              toggleProductAvailability={toggleProductAvailability}
              onProductUpdate={loadRestaurantData}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              key="reviews"
              reviews={reviews}
              saveReply={saveReply}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Branding Tab Component
function BrandingTab({ brandingForm, setBrandingForm, coverPreview, logoPreview, setCoverImageFile, setLogoFile, setCoverPreview, setLogoPreview, saveBranding, loading }: any) {
  const [isActive, setIsActive] = useState(true)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Restoran durumunu yükle
  useEffect(() => {
    const loadRestaurantStatus = async () => {
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) return

      const { data, error } = await supabase
        .from('restaurants')
        .select('is_active')
        .eq('id', restaurantId)
        .single()

      if (!error && data) {
        setIsActive(data.is_active ?? true)
      }
    }

    loadRestaurantStatus()
  }, [])

  const toggleRestaurantStatus = async () => {
    try {
      setToggleLoading(true)
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) {
        setToastMessage('❌ Restoran ID bulunamadı')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
        return
      }

      const newStatus = !isActive

      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: newStatus })
        .eq('id', restaurantId)

      if (error) throw error

      setIsActive(newStatus)
      setToastMessage(newStatus ? '✅ Restoran siparişe açıldı!' : '⏸️ Restoran siparişe kapatıldı!')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error: any) {
      console.error('Durum güncellenemedi:', error)
      setToastMessage('❌ Durum güncellenemedi')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setToggleLoading(false)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverImageFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-900 rounded-xl p-6 border border-slate-800"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-2xl border border-slate-700"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="text-xl font-bold text-white mb-6">Mağaza Görünümü</h2>

      {/* Çalışma Durumu Toggle */}
      <div className="mb-8 p-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl border-2 border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Restoran Durumu</h3>
            <p className={`text-sm font-medium ${isActive ? 'text-green-400' : 'text-red-400'}`}>
              {isActive ? '🟢 Restoran Şuan Siparişe Açık' : '🔴 Restoran Şuan Siparişe Kapalı'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isActive ? 'Müşteriler sipariş verebilir' : 'Müşteriler sipariş veremez'}
            </p>
          </div>
          
          {/* Toggle Switch */}
          <button
            onClick={toggleRestaurantStatus}
            disabled={toggleLoading}
            className={`relative inline-flex h-14 w-28 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive 
                ? 'bg-green-600 focus:ring-green-500' 
                : 'bg-red-600 focus:ring-red-500'
            }`}
          >
            <span
              className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                isActive ? 'translate-x-16' : 'translate-x-2'
              }`}
            >
              {toggleLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
                </div>
              )}
            </span>
            <span className={`absolute text-xs font-bold ${isActive ? 'left-3 text-white' : 'right-3 text-white'}`}>
              {isActive ? 'AÇIK' : 'KAPALI'}
            </span>
          </button>
        </div>
      </div>

      {/* Cover Image */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Kapak Fotoğrafı (1200x400 önerilir)
        </label>
        <div className="relative">
          {coverPreview ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-slate-700">
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setCoverPreview(null)
                  setCoverImageFile(null)
                }}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
              <Upload size={32} className="text-slate-500 mb-2" />
              <span className="text-sm text-slate-500">Kapak fotoğrafı yükle</span>
              <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Logo (400x400 önerilir)
        </label>
        <div className="relative">
          {logoPreview ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-slate-700">
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setLogoPreview(null)
                  setLogoFile(null)
                }}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
              <ImageIcon size={24} className="text-slate-500 mb-1" />
              <span className="text-xs text-slate-500">Logo yükle</span>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Restoran Adı</label>
          <input
            type="text"
            value={brandingForm.name}
            onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
            placeholder="Örn: Öküz Burger"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Açıklama</label>
          <textarea
            value={brandingForm.description}
            onChange={(e) => setBrandingForm({ ...brandingForm, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none resize-none"
            placeholder="Restoranınızı tanıtın..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Çalışma Saatleri</label>
          <input
            type="text"
            value={brandingForm.working_hours}
            onChange={(e) => setBrandingForm({ ...brandingForm, working_hours: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
            placeholder="Örn: 09:00 - 23:00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Sepet Tutarı (₺)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={brandingForm.minimum_order_value}
            onChange={(e) => setBrandingForm({ ...brandingForm, minimum_order_value: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
            placeholder="Örn: 50.00"
          />
          <p className="text-xs text-slate-500 mt-1">
            Müşterinin sipariş verebilmesi için gereken minimum tutar
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveBranding}
        disabled={loading}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Save size={20} />
        {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
      </button>
    </motion.div>
  )
}

// Menu Tab Component
function MenuTab({ categories, products, toggleProductAvailability, onProductUpdate, setActiveTab }: any) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingProduct(null)
    setShowEditModal(false)
  }

  const openDeleteModal = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingProduct(product)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setDeletingProduct(null)
    setShowDeleteModal(false)
  }

  const openUpsellModal = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpsellProduct(product)
    setShowUpsellModal(true)
  }

  const closeUpsellModal = () => {
    setUpsellProduct(null)
    setShowUpsellModal(false)
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      setDeleteLoading(true)
      
      // Güvenlik: Sadece kendi restoranının ürününü silebilir
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) {
        alert('❌ Restoran ID bulunamadı')
        return
      }

      // Ürünün bu restorana ait olduğunu kontrol et
      const { data: productCheck, error: checkError } = await supabase
        .from('products')
        .select('restaurant_id')
        .eq('id', deletingProduct.id)
        .single()

      if (checkError || !productCheck) {
        alert('❌ Ürün bulunamadı')
        return
      }

      if (productCheck.restaurant_id !== restaurantId) {
        alert('❌ Bu ürünü silme yetkiniz yok')
        return
      }

      // Ürünü sil
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingProduct.id)
        .eq('restaurant_id', restaurantId) // Ekstra güvenlik

      if (error) throw error

      closeDeleteModal()
      await onProductUpdate()
      
      // Başarı mesajı
      const event = new CustomEvent('show-toast', { 
        detail: { message: '✅ Ürün başarıyla silindi!', type: 'success' } 
      })
      window.dispatchEvent(event)
    } catch (error: any) {
      console.error('Ürün silinemedi:', error)
      alert('❌ Ürün silinemedi: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        {/* Yeni Ürün Ekle Butonu */}
        <button
          onClick={() => {
            if (categories.length === 0) {
              // Kategori yoksa uyarı göster ve scroll yap
              alert('⚠️ Önce bir kategori oluşturmalısınız!\n\nAşağıdaki alandan kategori ekleyebilirsiniz.')
              const categorySection = document.getElementById('category-section')
              categorySection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else {
              // Kategori varsa modal aç
              setShowAddModal(true)
            }
          }}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-2xl">+</span>
          Yeni Ürün Ekle
        </button>

        {categories.length === 0 ? (
          <div id="category-section" className="bg-slate-900 rounded-xl p-8 border border-slate-800">
            <div className="text-center mb-6">
              <p className="text-slate-400 text-lg font-semibold mb-2">📂 Henüz kategori eklenmemiş</p>
              <p className="text-slate-500 text-sm">Ürün eklemek için önce bir kategori oluşturun</p>
            </div>
            
            {/* Kategori Ekleme Formu */}
            <CategoryAddForm onSuccess={onProductUpdate} />
          </div>
        ) : (
          <div id="category-section" className="space-y-4">
            {/* Kategori Ekleme Formu (Kategoriler varken de göster) */}
            <CategoryAddForm onSuccess={onProductUpdate} />
            
            {categories.map((category: Category) => (
            <div key={category.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-4">{category.name}</h3>
              <div className="space-y-3">
                {products
                  .filter((p: Product) => p.category_id === category.id)
                  .map((product: Product) => (
                    <div
                      key={product.id}
                      onClick={() => openEditModal(product)}
                      className="relative flex items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-orange-500 hover:shadow-lg transition-all"
                    >
                      {/* Product Image */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
                          <ImageIcon size={24} className="text-slate-500" />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{product.name}</h4>
                        <p className="text-sm text-slate-400">{product.description || 'Açıklama yok'}</p>
                        <p className="text-orange-500 font-bold mt-1">{product.price.toFixed(2)} ₺</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Upsell Button */}
                        <button
                          onClick={(e) => openUpsellModal(product, e)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all text-xs font-medium"
                          title="Yan Ürünleri Yönet"
                        >
                          🔗 Yan Ürünler
                        </button>

                        {/* Stock Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleProductAvailability(product.id, product.is_available)
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                            product.is_available
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                          title={product.is_available ? 'Stokta' : 'Tükendi'}
                        >
                          {product.is_available ? (
                            <Eye size={18} />
                          ) : (
                            <EyeOff size={18} />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => openDeleteModal(product, e)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                          title="Ürünü Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          </div>
        )}
      </motion.div>

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductAddModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            setShowAddModal(false)
            await onProductUpdate()
          }}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={closeEditModal}
          onSuccess={async () => {
            closeEditModal()
            await onProductUpdate()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-600/20 rounded-full">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Ürünü Sil</h2>
                  <p className="text-sm text-slate-400">Bu işlem geri alınamaz</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-300 mb-4">
                <span className="font-bold text-white">{deletingProduct.name}</span> ürününü kalıcı olarak silmek istediğinize emin misiniz?
              </p>
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  ⚠️ Bu ürün veritabanından tamamen silinecek ve müşteri panelinde görünmeyecektir.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="flex-1 h-12 border-2 border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="flex-1 h-12 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Upsell Modal */}
      {showUpsellModal && upsellProduct && (
        <UpsellModal
          product={upsellProduct}
          allProducts={products}
          onClose={closeUpsellModal}
          onSuccess={async () => {
            closeUpsellModal()
            await onProductUpdate()
          }}
        />
      )}
    </>
  )
}

// Product Add Modal Component
function ProductAddModal({ 
  categories, 
  onClose, 
  onSuccess,
  setActiveTab 
}: { 
  categories: Category[]; 
  onClose: () => void; 
  onSuccess: () => void;
  setActiveTab: (tab: 'branding' | 'menu' | 'reviews') => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: categories[0]?.id || ''
  })
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return null

    try {
      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `product_${restaurantId}_${Date.now()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, imageFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Resim yüklenemedi:', error)
      return null
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')

      // Validasyon
      if (!formData.name.trim()) {
        setError('Ürün adı boş olamaz')
        return
      }

      if (!formData.category_id) {
        setError('Kategori seçmelisiniz')
        return
      }

      const price = parseFloat(formData.price)
      if (isNaN(price) || price <= 0) {
        setError('Geçerli bir fiyat girin')
        return
      }

      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) {
        setError('Restoran ID bulunamadı')
        return
      }

      // Resim yükle
      let imageUrl = null
      if (imageFile) {
        imageUrl = await handleImageUpload()
      }

      // En yüksek display_order'ı bul
      const { data: existingProducts } = await supabase
        .from('products')
        .select('display_order')
        .eq('category_id', formData.category_id)
        .order('display_order', { ascending: false })
        .limit(1)

      const nextDisplayOrder = existingProducts && existingProducts.length > 0 
        ? existingProducts[0].display_order + 1 
        : 0

      // Yeni ürün ekle
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          restaurant_id: restaurantId,
          category_id: formData.category_id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: price,
          image_url: imageUrl,
          is_available: true,
          display_order: nextDisplayOrder,
          options: optionGroups
        })

      if (insertError) throw insertError

      onSuccess()
    } catch (error: any) {
      console.error('Ürün eklenemedi:', error)
      setError(error.message || 'Ürün eklenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-2xl font-bold text-white">Yeni Ürün Ekle</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Kategori *
            </label>
            
            {categories.length === 0 ? (
              // Empty State: Kategori yoksa
              <div className="space-y-3">
                <select
                  disabled
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                >
                  <option>Lütfen önce bir kategori oluşturun</option>
                </select>
                
                {/* Kategori Oluştur Butonu */}
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-amber-300 text-sm font-medium">
                      ⚠️ Kategori bulunamadı
                    </p>
                    <p className="text-amber-300/70 text-xs mt-0.5">
                      Ürün eklemek için önce bir kategori oluşturmalısınız
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Modal'ı kapat ve kategori bölümüne yönlendir
                      onClose()
                      setTimeout(() => {
                        const categorySection = document.getElementById('category-section')
                        categorySection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 300)
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    + Yeni Kategori Oluştur
                  </button>
                </div>
              </div>
            ) : (
              // Normal State: Kategoriler varsa
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none"
              >
                <option value="">Kategori seçin...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ürün Görseli
            </label>
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-slate-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setImagePreview(null)
                    setImageFile(null)
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <Upload size={32} className="text-slate-500 mb-2" />
                <span className="text-sm text-slate-500">Görsel yükle</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ürün Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
              placeholder="Örn: Öküz Burger"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none resize-none"
              placeholder="Ürün açıklaması..."
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fiyat (₺) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Opsiyon Yönetimi */}
          <div className="border-t border-slate-800 pt-4">
            <ProductOptionsManager
              options={optionGroups}
              onChange={setOptionGroups}
              darkMode={true}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 h-12 border-2 border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Ekleniyor...' : 'Ürünü Ekle'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Product Edit Modal Component
function ProductEditModal({ product, onClose, onSuccess }: { product: Product; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || '',
    price: product.price.toString()
  })
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(
    product.options ? (typeof product.options === 'string' ? JSON.parse(product.options) : product.options) : []
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return product.image_url || null

    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `product_${product.id}_${Date.now()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, imageFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Resim yüklenemedi:', error)
      return null
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')

      // Validasyon
      if (!formData.name.trim()) {
        setError('Ürün adı boş olamaz')
        return
      }

      const price = parseFloat(formData.price)
      if (isNaN(price) || price <= 0) {
        setError('Geçerli bir fiyat girin')
        return
      }

      // Resim yükle
      let imageUrl = product.image_url
      if (imageFile) {
        const url = await handleImageUpload()
        if (url) imageUrl = url
      }

      // Güncelle
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: price,
          image_url: imageUrl,
          options: optionGroups
        })
        .eq('id', product.id)

      if (updateError) throw updateError

      onSuccess()
    } catch (error: any) {
      console.error('Ürün güncellenemedi:', error)
      setError(error.message || 'Ürün güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-2xl font-bold text-white">Ürünü Düzenle</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ürün Görseli
            </label>
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-slate-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setImagePreview(null)
                    setImageFile(null)
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <Upload size={32} className="text-slate-500 mb-2" />
                <span className="text-sm text-slate-500">Görsel yükle</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Ürün Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
              placeholder="Örn: Öküz Burger"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none resize-none"
              placeholder="Ürün açıklaması..."
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fiyat (₺) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Opsiyon Yönetimi */}
          <div className="border-t border-slate-800 pt-4">
            <ProductOptionsManager
              options={optionGroups}
              onChange={setOptionGroups}
              darkMode={true}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 h-12 border-2 border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Reviews Tab Component
function ReviewsTab({ reviews, saveReply }: any) {
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({})
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null)

  const handleReplyChange = (reviewId: string, text: string) => {
    setReplyTexts(prev => ({ ...prev, [reviewId]: text }))
  }

  const handleSaveReply = async (reviewId: string) => {
    const reply = replyTexts[reviewId]
    if (reply && reply.trim()) {
      setSavingReplyId(reviewId)
      await saveReply(reviewId, reply.trim())
      setReplyTexts(prev => ({ ...prev, [reviewId]: '' }))
      setSavingReplyId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {reviews.length === 0 ? (
        <div className="bg-slate-900 rounded-xl p-12 border border-slate-800 text-center">
          <Star size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Henüz yorum yapılmamış</p>
          <p className="text-slate-500 text-sm mt-2">İlk yorumlar burada görünecek</p>
        </div>
      ) : (
        reviews.map((review: Review) => (
          <div key={review.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            {/* Customer Info */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-white">{review.customer?.full_name || 'Müşteri'}</h4>
                <p className="text-sm text-slate-500">{formatDate(review.created_at)}</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold">{review.taste_rating}</span>
                  </div>
                  <p className="text-xs text-slate-500">Lezzet</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-blue-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold">{review.delivery_rating}</span>
                  </div>
                  <p className="text-xs text-slate-500">Teslimat</p>
                </div>
              </div>
            </div>

            {/* Comment */}
            {review.comment && (
              <div className="bg-slate-800 rounded-lg p-4 mb-4">
                <p className="text-slate-300">{review.comment}</p>
              </div>
            )}

            {/* Restaurant Reply */}
            {review.restaurant_reply ? (
              <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-orange-500" />
                  <span className="text-sm font-medium text-orange-500">Restoran Yanıtı</span>
                  <span className="text-xs text-slate-500">
                    {review.replied_at && formatDate(review.replied_at)}
                  </span>
                </div>
                <p className="text-slate-300">{review.restaurant_reply}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={replyTexts[review.id] || ''}
                  onChange={(e) => handleReplyChange(review.id, e.target.value)}
                  placeholder="Müşteriye yanıt yazın..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none resize-none"
                />
                <button
                  onClick={() => handleSaveReply(review.id)}
                  disabled={!replyTexts[review.id]?.trim() || savingReplyId === review.id}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {savingReplyId === review.id ? 'Gönderiliyor...' : 'Yanıtı Gönder'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </motion.div>
  )
}


// Upsell Modal Component
function UpsellModal({ product, allProducts, onClose, onSuccess }: { 
  product: Product
  allProducts: Product[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>(product.upsell_product_ids || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Mevcut ürünü hariç tut
  const availableProducts = allProducts.filter(p => p.id !== product.id)

  const toggleUpsell = (productId: string) => {
    setSelectedUpsells(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')

      const { error: updateError } = await supabase
        .from('products')
        .update({ upsell_product_ids: selectedUpsells })
        .eq('id', product.id)

      if (updateError) throw updateError

      onSuccess()
    } catch (error: any) {
      console.error('Yan ürünler kaydedilemedi:', error)
      setError(error.message || 'Yan ürünler kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-800"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🔗 Yan Ürünleri Yönet
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                <span className="font-semibold text-white">{product.name}</span> için önerilen ürünler
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
            <p className="text-purple-300 text-sm">
              💡 Müşteri bu ürünü sepete eklediğinde, seçtiğiniz yan ürünler öneri olarak gösterilecektir.
            </p>
          </div>

          {/* Selected Count */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-slate-300 text-sm">
              Seçilen yan ürün sayısı: <span className="font-bold text-white">{selectedUpsells.length}</span>
            </p>
            {selectedUpsells.length > 0 && (
              <button
                onClick={() => setSelectedUpsells([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Tümünü Temizle
              </button>
            )}
          </div>

          {/* Products Grid */}
          {availableProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>Başka ürün bulunmuyor</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableProducts.map((p) => {
                const isSelected = selectedUpsells.includes(p.id)
                
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleUpsell(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-900/20'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-slate-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Product Image */}
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                        <ImageIcon size={20} className="text-slate-500" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-slate-400 truncate">{p.description || 'Açıklama yok'}</p>
                      <p className="text-purple-400 font-bold text-sm mt-0.5">{p.price.toFixed(2)} ₺</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 border-2 border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}


// Category Add Form Component
function CategoryAddForm({ onSuccess }: { onSuccess: () => void }) {
  const [categoryName, setCategoryName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      setError('Kategori adı boş olamaz')
      return
    }

    try {
      setLoading(true)
      setError('')

      const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
      if (!restaurantId) {
        setError('Restoran ID bulunamadı')
        return
      }

      // En yüksek display_order'ı bul
      const { data: existingCategories } = await supabase
        .from('categories')
        .select('display_order')
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: false })
        .limit(1)

      const nextDisplayOrder = existingCategories && existingCategories.length > 0 
        ? existingCategories[0].display_order + 1 
        : 0

      // Kategori ekle
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          restaurant_id: restaurantId,
          name: categoryName.trim(),
          display_order: nextDisplayOrder
        })

      if (insertError) throw insertError

      // Başarı
      setCategoryName('')
      await onSuccess()
      
      // Toast mesajı
      const event = new CustomEvent('show-toast', { 
        detail: { message: '✅ Kategori başarıyla eklendi!', type: 'success' } 
      })
      window.dispatchEvent(event)
    } catch (error: any) {
      console.error('Kategori eklenemedi:', error)
      setError('Kategori eklenemedi: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={categoryName}
            onChange={(e) => {
              setCategoryName(e.target.value)
              setError('')
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddCategory()
              }
            }}
            placeholder="Yeni kategori adı (örn: Burgerler, Pizzalar...)"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 outline-none"
          />
          {error && (
            <p className="text-red-400 text-xs mt-1">{error}</p>
          )}
        </div>
        <button
          onClick={handleAddCategory}
          disabled={loading || !categoryName.trim()}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? '⏳' : '+ Kategori Ekle'}
        </button>
      </div>
    </div>
  )
}
