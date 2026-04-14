'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import Image from 'next/image'

interface MenuItem {
  id: number
  name: string
  description?: string
  price: number
  image_url?: string
  is_available?: boolean
}

interface MenuItemEditModalProps {
  item: MenuItem
  onClose: () => void
  onSuccess: () => void
  darkMode: boolean
}

export default function MenuItemEditModal({ item, onClose, onSuccess, darkMode }: MenuItemEditModalProps) {
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description || '',
    price: item.price.toString(),
    image_url: item.image_url || '',
    is_available: item.is_available !== false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          image_url: formData.image_url,
          is_available: formData.is_available
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Menü güncellenirken hata:', error)
      setError(error.message || 'Menü güncellenemedi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-slate-800' : 'border-gray-200'
        } sticky top-0 ${darkMode ? 'bg-slate-900' : 'bg-white'} z-10`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            ✏️ Menü Düzenle
          </h2>
          <button
            onClick={onClose}
            className={`text-2xl ${darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Görsel Önizleme */}
          {formData.image_url && (
            <div className="flex justify-center">
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-orange-500">
                <Image
                  src={formData.image_url}
                  alt={formData.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-food.png'
                  }}
                />
              </div>
            </div>
          )}

          {/* Ürün Adı */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Ürün Adı <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="Örn: Izgara Köfte"
              disabled={isSubmitting}
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Açıklama
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="Ürün açıklaması..."
              disabled={isSubmitting}
            />
          </div>

          {/* Fiyat */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Fiyat (₺) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>

          {/* Görsel URL */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Görsel URL
            </label>
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="https://..."
              disabled={isSubmitting}
            />
          </div>

          {/* Stok Durumu */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                disabled={isSubmitting}
              />
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Stokta Var (Müşterilere göster)
              </span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                darkMode
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              } disabled:opacity-50`}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '⏳ Kaydediliyor...' : '✅ Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
