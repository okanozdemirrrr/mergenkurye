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

interface Restaurant {
  id: string
  name: string
  description?: string
  working_hours?: string
  cover_image_url?: string
  logo_url?: string
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
    working_hours: ''
  })
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    loadRestaurantData()
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
        working_hours: restaurantData.working_hours || ''
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
      if (!restaurantId) return

      let coverUrl = restaurant?.cover_image_url
      let logoUrl = restaurant?.logo_url

      // Kapak fotoğrafı yükle
      if (coverImageFile) {
        const url = await handleImageUpload(coverImageFile, 'cover')
        if (url) coverUrl = url
      }

      // Logo yükle
      if (logoFile) {
        const url = await handleImageUpload(logoFile, 'logo')
        if (url) logoUrl = url
      }

      // Güncelle
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: brandingForm.name,
          description: brandingForm.description,
          working_hours: brandingForm.working_hours,
          cover_image_url: coverUrl,
          logo_url: logoUrl
        })
        .eq('id', restaurantId)

      if (error) throw error

      setSuccessMessage('✅ Mağaza bilgileri başarıyla güncellendi!')
      setTimeout(() => setSuccessMessage(''), 3000)
      loadRestaurantData()
    } catch (error) {
      console.error('Kayıt hatası:', error)
      setErrorMessage('❌ Kayıt sırasında hata oluştu')
      setTimeout(() => setErrorMessage(''), 3000)
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
      <h2 className="text-xl font-bold text-white mb-6">Mağaza Görünümü</h2>

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
function MenuTab({ categories, products, toggleProductAvailability }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {categories.length === 0 ? (
        <div className="bg-slate-900 rounded-xl p-12 border border-slate-800 text-center">
          <p className="text-slate-400 text-lg">Henüz menü eklenmemiş</p>
          <p className="text-slate-500 text-sm mt-2">Menü eklemek için admin paneline başvurun</p>
        </div>
      ) : (
        categories.map((category: Category) => (
          <div key={category.id} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-xl font-bold text-white mb-4">{category.name}</h3>
            <div className="space-y-3">
              {products
                .filter((p: Product) => p.category_id === category.id)
                .map((product: Product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700"
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

                    {/* Stock Toggle */}
                    <button
                      onClick={() => toggleProductAvailability(product.id, product.is_available)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        product.is_available
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {product.is_available ? (
                        <>
                          <Eye size={18} />
                          Stokta
                        </>
                      ) : (
                        <>
                          <EyeOff size={18} />
                          Tükendi
                        </>
                      )}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </motion.div>
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
