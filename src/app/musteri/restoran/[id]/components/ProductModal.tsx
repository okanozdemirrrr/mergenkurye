'use client'

import { useState } from 'react'
import { Product } from '@/types/menu'
import { useCart } from '@/app/context/CartContext'

interface ProductModalProps {
  product: Product
  onClose: () => void
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart(product, quantity, note)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e8] sticky top-0 bg-white z-10">
          <h2 className="text-[20px] font-bold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {product.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6f6f6f] hover:text-[#3c4043] text-[24px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Fiyat */}
          <div className="mb-6">
            <span className="text-[28px] font-bold text-[#f59e0b]">
              {product.price}₺
            </span>
          </div>

          {/* Açıklama */}
          {product.description && (
            <div className="mb-6">
              <p className="text-[14px] text-[#6f6f6f]">
                {product.description}
              </p>
            </div>
          )}

          {/* Miktar Seçici */}
          <div className="mb-6">
            <label className="block text-[13px] font-semibold text-[#3c4043] mb-3">
              Miktar
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 bg-[#f7f7f7] rounded-lg flex items-center justify-center text-[20px] font-bold text-[#3c4043] hover:bg-[#e8e8e8] transition-colors"
              >
                −
              </button>
              <span className="text-[20px] font-bold text-[#3c4043] min-w-[40px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 bg-[#f7f7f7] rounded-lg flex items-center justify-center text-[20px] font-bold text-[#3c4043] hover:bg-[#e8e8e8] transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Ürün Notu */}
          <div className="mb-6">
            <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
              Ürün Notu (Opsiyonel)
            </label>
            <textarea
              placeholder="Soğan istemiyorum, marul bol olsun vb."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-[100px] px-4 py-3 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors resize-none"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            />
          </div>

          {/* Sepete Ekle Butonu */}
          <button
            onClick={handleAddToCart}
            className="w-full h-[56px] bg-[#f59e0b] text-white rounded-lg font-bold text-[16px] hover:bg-[#d97706] transition-colors flex items-center justify-center gap-3"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            <span>Sepete Ekle</span>
            <span>•</span>
            <span>{(product.price * quantity).toFixed(2)}₺</span>
          </button>
        </div>
      </div>
    </div>
  )
}
