/**
 * @file src/components/UpsellSuggestions.tsx
 * @description Yan Ürün Önerileri Komponenti
 * Müşteri bir ürünü sepete eklediğinde, o ürünün yan ürünlerini öneri olarak gösterir
 */
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { Product } from '@/types/menu'
import { supabase } from '@/app/lib/supabase'
import { useCart } from '@/app/context/CartContext'

interface UpsellSuggestionsProps {
  product: Product
  onClose: () => void
}

export function UpsellSuggestions({ product, onClose }: UpsellSuggestionsProps) {
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { addToCart } = useCart()

  useEffect(() => {
    loadUpsellProducts()
  }, [product.id])

  const loadUpsellProducts = async () => {
    try {
      setLoading(true)

      // Ürünün yan ürün ID'lerini kontrol et
      if (!product.upsell_product_ids || product.upsell_product_ids.length === 0) {
        setUpsellProducts([])
        return
      }

      // Yan ürünleri getir
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', product.upsell_product_ids)
        .eq('is_available', true) // Sadece stokta olanları göster

      if (error) throw error

      setUpsellProducts(data || [])
    } catch (error) {
      console.error('Yan ürünler yüklenemedi:', error)
      setUpsellProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (upsellProduct: Product) => {
    addToCart(upsellProduct, 1)
    
    // Toast bildirimi göster
    const event = new CustomEvent('show-toast', {
      detail: { message: `✅ ${upsellProduct.name} sepete eklendi!`, type: 'success' }
    })
    window.dispatchEvent(event)
  }

  // Yan ürün yoksa modal'ı gösterme
  if (!loading && upsellProducts.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-800"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-purple-900/20 to-orange-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  ✅ Sepete Eklendi!
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Bunları da denemek ister misiniz?
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upsellProducts.map((upsellProduct) => (
                  <motion.div
                    key={upsellProduct.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-orange-500 transition-all"
                  >
                    {/* Product Image */}
                    {upsellProduct.image_url ? (
                      <img
                        src={upsellProduct.image_url}
                        alt={upsellProduct.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-32 bg-slate-700 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}

                    {/* Product Info */}
                    <h3 className="font-bold text-white text-lg mb-1">
                      {upsellProduct.name}
                    </h3>
                    {upsellProduct.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                        {upsellProduct.description}
                      </p>
                    )}

                    {/* Price and Add Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-500">
                        {upsellProduct.price.toFixed(2)} ₺
                      </span>
                      <button
                        onClick={() => handleAddToCart(upsellProduct)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <Plus size={18} />
                        Ekle
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800 bg-slate-900">
            <button
              onClick={onClose}
              className="w-full h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Alışverişe Devam Et
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
