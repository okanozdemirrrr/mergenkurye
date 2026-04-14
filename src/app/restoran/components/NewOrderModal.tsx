'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface NewOrderModalProps {
  onClose: () => void
  onSuccess: () => void
  restaurantId: string
  darkMode: boolean
}

export default function NewOrderModal({ onClose, onSuccess, restaurantId, darkMode }: NewOrderModalProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    packageAmount: '',
    content: ''
  })
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null)
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
    
    if (!paymentMethod) {
      setError('Lütfen ödeme yöntemi seçin')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('packages')
        .insert([{
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          delivery_address: formData.deliveryAddress,
          amount: parseFloat(formData.packageAmount),
          content: formData.content,
          status: 'new_order',
          payment_method: paymentMethod,
          restaurant_id: restaurantId, // UUID olarak direkt gönder
          created_at: new Date().toISOString()
        }])

      if (insertError) throw insertError

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Sipariş eklenirken hata:', error)
      setError(error.message || 'Sipariş eklenemedi')
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
            🍽️ Yeni Sipariş
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

          {/* Müşteri Adı */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Müşteri Adı <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="Ahmet Yılmaz"
              disabled={isSubmitting}
            />
          </div>

          {/* Müşteri Numarası */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Müşteri Numarası <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="05XX-XXX-XX-XX"
              disabled={isSubmitting}
            />
          </div>

          {/* Paket İçeriği */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Paket İçeriği <span className="text-red-400">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="2x Döner, 1x Ayran"
              disabled={isSubmitting}
            />
          </div>

          {/* Teslimat Adresi */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Teslimat Adresi <span className="text-red-400">*</span>
            </label>
            <textarea
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleChange}
              required
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                darkMode 
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
              }`}
              placeholder="Atatürk Mah. İnönü Cad. No:123"
              disabled={isSubmitting}
            />
          </div>

          {/* Paket Tutarı */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Tutar (₺) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              name="packageAmount"
              value={formData.packageAmount}
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

          {/* Ödeme Tercihi */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              Ödeme Tercihi <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                disabled={isSubmitting}
                className={`py-3 rounded-lg border font-semibold transition-colors ${
                  paymentMethod === 'cash'
                    ? 'bg-green-600 border-green-600 text-white'
                    : darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                } disabled:opacity-50`}
              >
                💵 Nakit
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                disabled={isSubmitting}
                className={`py-3 rounded-lg border font-semibold transition-colors ${
                  paymentMethod === 'card'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                } disabled:opacity-50`}
              >
                💳 Kart
              </button>
            </div>
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
              {isSubmitting ? '⏳ Kaydediliyor...' : '✅ Sipariş Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
