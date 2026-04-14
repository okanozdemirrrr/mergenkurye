'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, Search } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import ProductModal from '../components/ProductModal'

interface Product {
  id: number
  name: string
  category: string
  price: number
  discount_price: number | null
  discount_percentage: number | null
  unit: string
  description: string | null
  image_url: string | null
  emoji: string
  stock_status: 'active' | 'out_of_stock' | 'inactive'
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const categoryNames: { [key: string]: { name: string; icon: string } } = {
  firsatlar: { name: 'Haftanın Fırsatları', icon: '🔥' },
  yemeklik: { name: 'Yemeklik Malzemeler', icon: '🍝' },
  et: { name: 'Et & Tavuk & Şarküteri', icon: '🥩' },
  meyve: { name: 'Meyve & Sebze', icon: '🥬' },
  sut: { name: 'Süt & Süt Ürünleri', icon: '🥛' },
  kahvalti: { name: 'Kahvaltılık', icon: '🍳' },
  atistirmalik: { name: 'Atıştırmalık', icon: '🍿' },
  icecek: { name: 'İçecek', icon: '🥤' },
  ekmek: { name: 'Ekmek & Pastane', icon: '🍞' },
  dondurulmus: { name: 'Dondurulmuş Ürünler', icon: '🧊' }
}

export default function CategoryProductsPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const categoryInfo = categoryNames[resolvedParams.category]

  useEffect(() => {
    fetchProducts()
    setupRealtime()
  }, [resolvedParams.category])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchQuery, products])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('market_products')
        .select('*')
        .eq('category', resolvedParams.category)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
      setFilteredProducts(data || [])
    } catch (error: any) {
      console.error('Ürünler yüklenemedi:', error)
      setErrorMessage('Ürünler yüklenemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealtime = () => {
    const channel = supabase
      .channel(`market-products-${resolvedParams.category}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_products',
          filter: `category=eq.${resolvedParams.category}`
        },
        () => {
          fetchProducts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('market_products')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccessMessage('Ürün başarıyla silindi')
      setTimeout(() => setSuccessMessage(''), 3000)
      fetchProducts()
    } catch (error: any) {
      console.error('Ürün silinemedi:', error)
      setErrorMessage('Ürün silinemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleToggleStock = async (product: Product) => {
    const newStatus = product.stock_status === 'active' ? 'inactive' : 'active'

    try {
      const { error } = await supabase
        .from('market_products')
        .update({ stock_status: newStatus })
        .eq('id', product.id)

      if (error) throw error

      setSuccessMessage(`Ürün ${newStatus === 'active' ? 'aktif' : 'pasif'} edildi`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Stok durumu güncellenemedi:', error)
      setErrorMessage('Stok durumu güncellenemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  if (!categoryInfo) {
    return (
      <div className="text-center py-20">
        <p className="text-white text-xl mb-4">Kategori bulunamadı</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg"
        >
          Geri Dön
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-4xl">{categoryInfo.icon}</span>
              <h1 className="text-3xl font-black text-white">{categoryInfo.name}</h1>
            </div>
            <p className="text-slate-400">{filteredProducts.length} ürün</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-lg"
        >
          <Plus size={20} />
          Yeni Ürün Ekle
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ürün ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Yükleniyor...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-xl mb-4">
            {searchQuery ? 'Ürün bulunamadı' : 'Henüz ürün eklenmemiş'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                setEditingProduct(null)
                setShowModal(true)
              }}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"
            >
              İlk Ürünü Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-orange-500 transition-all"
            >
              {/* Product Image */}
              <div className="w-full aspect-square bg-slate-800 rounded-lg mb-3 flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-6xl">{product.emoji}</span>
                )}
              </div>

              {/* Product Info */}
              <div className="mb-3">
                <h3 className="font-bold text-white mb-1 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-slate-400 mb-2">{product.unit}</p>

                {/* Price */}
                <div className="flex items-center gap-2">
                  {product.discount_price ? (
                    <>
                      <span className="text-sm text-slate-500 line-through">₺{product.price.toFixed(2)}</span>
                      <span className="text-lg font-bold text-orange-400">₺{product.discount_price.toFixed(2)}</span>
                      {product.discount_percentage && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                          %{product.discount_percentage}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-lg font-bold text-white">₺{product.price.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Stock Status */}
              <div className="mb-3">
                <button
                  onClick={() => handleToggleStock(product)}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                    product.stock_status === 'active'
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {product.stock_status === 'active' ? '✅ Aktif' : '❌ Pasif'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingProduct(product)
                    setShowModal(true)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  <Edit size={16} />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 size={16} />
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          category={resolvedParams.category}
          onClose={() => {
            setShowModal(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingProduct(null)
            fetchProducts()
            setSuccessMessage(editingProduct ? 'Ürün güncellendi' : 'Ürün eklendi')
            setTimeout(() => setSuccessMessage(''), 3000)
          }}
        />
      )}
    </div>
  )
}
