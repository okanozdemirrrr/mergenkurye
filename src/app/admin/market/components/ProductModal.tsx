'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'

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
}

interface ProductModalProps {
  product: Product | null
  category: string
  onClose: () => void
  onSuccess: () => void
}

export default function ProductModal({ product, category, onClose, onSuccess }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    discount_price: '',
    discount_percentage: '',
    unit: '1 Adet',
    description: '',
    image_url: '',
    emoji: '📦',
    stock_status: 'active' as 'active' | 'out_of_stock' | 'inactive',
    is_featured: false,
    sort_order: 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        discount_price: product.discount_price?.toString() || '',
        discount_percentage: product.discount_percentage?.toString() || '',
        unit: product.unit,
        description: product.description || '',
        image_url: product.image_url || '',
        emoji: product.emoji,
        stock_status: product.stock_status,
        is_featured: product.is_featured,
        sort_order: product.sort_order
      })
    }
  }, [product])

  // İndirim yüzdesini otomatik hesapla
  useEffect(() => {
    if (formData.price && formData.discount_price) {
      const price = parseFloat(formData.price)
      const discountPrice = parseFloat(formData.discount_price)
      
      if (price > 0 && discountPrice > 0 && discountPrice < price) {
        const percentage = Math.round(((price - discountPrice) / price) * 100)
        setFormData(prev => ({ ...prev, discount_percentage: percentage.toString() }))
      }
    }
  }, [formData.price, formData.discount_price])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const productData = {
        name: formData.name,
        category,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        unit: formData.unit,
        description: formData.description || null,
        image_url: formData.image_url || null,
        emoji: formData.emoji,
        stock_status: formData.stock_status,
        is_featured: formData.is_featured,
        sort_order: formData.sort_order
      }

      if (product) {
        // Update
        const { error } = await supabase
          .from('market_products')
          .update(productData)
          .eq('id', product.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('market_products')
          .insert([productData])

        if (error) throw error
      }

      onSuccess()
    } catch (error: any) {
      console.error('Ürün kaydedilemedi:', error)
      setError(error.message || 'Ürün kaydedilemedi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-2xl font-bold text-white">
            {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Ürün Adı */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Ürün Adı <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors"
              placeholder="Örn: Ülker Çikolatalı Gofret 36g"
            />
          </div>

          {/* Fiyat ve İndirimli Fiyat */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Fiyat (₺) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                İndirimli Fiyat (₺)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discount_price}
                onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* İndirim Yüzdesi (Otomatik) */}
          {formData.discount_percentage && (
            <div className="p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <p className="text-orange-300 text-sm">
                🔥 İndirim: <span className="font-bold">%{formData.discount_percentage}</span>
              </p>
            </div>
          )}

          {/* Birim */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Birim <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="1 Adet">1 Adet</option>
              <option value="1 Kg">1 Kg</option>
              <option value="500g">500g</option>
              <option value="250g">250g</option>
              <option value="1L">1L</option>
              <option value="500ml">500ml</option>
              <option value="1 Paket">1 Paket</option>
            </select>
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Emoji
            </label>
            <input
              type="text"
              maxLength={2}
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors text-4xl text-center"
              placeholder="📦"
            />
          </div>

          {/* Görsel URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Görsel URL (Opsiyonel)
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Açıklama
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
              placeholder="Ürün açıklaması..."
            />
          </div>

          {/* Stok Durumu */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Stok Durumu
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stock_status: 'active' })}
                className={`py-3 rounded-lg font-semibold transition-colors ${
                  formData.stock_status === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                ✅ Aktif
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stock_status: 'out_of_stock' })}
                className={`py-3 rounded-lg font-semibold transition-colors ${
                  formData.stock_status === 'out_of_stock'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                ⚠️ Tükendi
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, stock_status: 'inactive' })}
                className={`py-3 rounded-lg font-semibold transition-colors ${
                  formData.stock_status === 'inactive'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                ❌ Pasif
              </button>
            </div>
          </div>

          {/* Öne Çıkan */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_featured"
              checked={formData.is_featured}
              onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              className="w-5 h-5 bg-slate-800 border-slate-700 rounded"
            />
            <label htmlFor="is_featured" className="text-slate-300 font-medium">
              🌟 Öne Çıkan Ürün
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor...' : product ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
