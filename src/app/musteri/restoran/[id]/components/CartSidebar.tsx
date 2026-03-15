'use client'

import { useState } from 'react'
import { useCart } from '@/app/context/CartContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Banknote, CheckCircle } from 'lucide-react'

interface CartSidebarProps {
  restaurant: {
    id: string
    name: string
    minimum_order_value: number
    delivery_fee: number
  }
  onClose: () => void
}

export default function CartSidebar({ restaurant, onClose }: CartSidebarProps) {
  const router = useRouter()
  const { cart, updateQuantity, getCartTotal, clearCart } = useCart()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const subtotal = getCartTotal()
  const deliveryFee = restaurant.delivery_fee
  const total = subtotal + deliveryFee
  const minimumOrderValue = restaurant.minimum_order_value
  const remainingAmount = Math.max(0, minimumOrderValue - subtotal)
  const canCheckout = subtotal >= minimumOrderValue

  const handleCheckout = () => {
    if (!canCheckout) return
    setShowPaymentModal(true)
    setPhoneNumber('')
    setPhoneError('')
  }

  const validatePhoneNumber = (phone: string): boolean => {
    // Sadece rakam kontrolü
    if (!/^\d+$/.test(phone)) {
      setPhoneError('Sadece rakam girebilirsiniz')
      return false
    }

    // Başında 0 kontrolü
    if (phone.startsWith('0')) {
      setPhoneError('Numarayı başında 0 olmadan yazın (örn: 5551234567)')
      return false
    }

    // 10 hane kontrolü
    if (phone.length !== 10) {
      setPhoneError('Telefon numarası 10 hane olmalıdır')
      return false
    }

    // 5 ile başlamalı (Türkiye cep telefonu)
    if (!phone.startsWith('5')) {
      setPhoneError('Cep telefonu numarası 5 ile başlamalıdır')
      return false
    }

    setPhoneError('')
    return true
  }

  const handlePhoneChange = (value: string) => {
    // Sadece rakam girişine izin ver
    const cleaned = value.replace(/\D/g, '')
    setPhoneNumber(cleaned)
    
    if (cleaned.length > 0) {
      validatePhoneNumber(cleaned)
    } else {
      setPhoneError('')
    }
  }

  const isPhoneValid = phoneNumber.length === 10 && 
                       phoneNumber.startsWith('5') && 
                       !phoneNumber.startsWith('0')

  const handlePaymentSelect = async (paymentMethod: 'cash' | 'card') => {
    // Telefon numarası validasyonu
    if (!validatePhoneNumber(phoneNumber)) {
      return
    }

    setIsProcessing(true)

    try {
      // Müşteri bilgilerini al
      const customerId = localStorage.getItem('customer_id')
      const customerAddress = localStorage.getItem('customer_address')
      const customerName = localStorage.getItem('customer_name')

      if (!customerId || !customerAddress) {
        alert('Lütfen adres bilgilerinizi girin')
        setIsProcessing(false)
        return
      }

      // Müşterinin koordinatlarını al
      const { data: customerData } = await supabase
        .from('customers')
        .select('latitude, longitude')
        .eq('id', customerId)
        .single()

      const customerLat = customerData?.latitude
      const customerLng = customerData?.longitude

      // Sipariş numarası oluştur
      const orderNumber = `MG${Date.now().toString().slice(-8)}`

      // Sipariş öğelerini hazırla
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        item_note: item.item_note || null
      }))

      // Siparişi veritabanına kaydet - KOORDİNATLARLA BİRLİKTE
      const { data, error } = await supabase
        .from('packages')
        .insert([{
          restaurant_id: restaurant.id,
          customer_id: customerId,
          customer_name: customerName || 'Müşteri',
          customer_phone: phoneNumber,
          delivery_address: customerAddress,
          latitude: customerLat ? parseFloat(customerLat.toString()) : null, // ✅ Koordinat mühürleme
          longitude: customerLng ? parseFloat(customerLng.toString()) : null, // ✅ Koordinat mühürleme
          amount: total,
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          payment_method: paymentMethod,
          status: 'new_order',
          order_number: orderNumber,
          items: orderItems,
          platform: 'web'
        }])
        .select()

      if (error) throw error

      // Telefon numarasını localStorage'a da kaydet (gelecek siparişler için)
      localStorage.setItem('customer_phone', phoneNumber)

      // Başarılı - animasyon göster
      setShowPaymentModal(false)
      setShowSuccess(true)
      clearCart()

      // 2 saniye sonra yönlendir
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
        router.push('/musteri/siparislerim')
      }, 2000)

    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error)
      alert('Sipariş oluşturulurken bir hata oluştu: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      
      <div className="relative bg-white w-full max-w-[450px] h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e8e8e8] p-6 z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[20px] font-bold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              Sepetim
            </h2>
            <button
              onClick={onClose}
              className="text-[#6f6f6f] hover:text-[#3c4043] text-[24px] leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-[13px] text-[#6f6f6f]">
            {restaurant.name}
          </p>
        </div>

        {/* Cart Items */}
        <div className="p-6">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-[16px] font-semibold text-[#3c4043] mb-2">
                Sepetiniz Boş
              </p>
              <p className="text-[13px] text-[#6f6f6f]">
                Ürün ekleyerek siparişinizi oluşturun
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-[#f7f7f7] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-[15px] font-bold text-[#3c4043] mb-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        {item.product.name}
                      </h3>
                      {item.item_note && (
                        <p className="text-[12px] text-[#6f6f6f] italic">
                          Not: {item.item_note}
                        </p>
                      )}
                    </div>
                    <span className="text-[15px] font-bold text-[#f59e0b] ml-3">
                      {(item.product.price * item.quantity).toFixed(2)}₺
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[18px] font-bold text-[#3c4043] hover:bg-[#e8e8e8] transition-colors border border-[#e8e8e8]"
                      >
                        −
                      </button>
                      <span className="text-[16px] font-bold text-[#3c4043] min-w-[30px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[18px] font-bold text-[#3c4043] hover:bg-[#e8e8e8] transition-colors border border-[#e8e8e8]"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-[13px] text-[#6f6f6f]">
                      {item.product.price}₺ / adet
                    </span>
                  </div>
                </div>
              ))}

              {/* Sepeti Temizle */}
              <button
                onClick={clearCart}
                className="w-full py-2 text-[13px] text-red-500 hover:text-red-600 font-semibold"
              >
                Sepeti Temizle
              </button>
            </div>
          )}
        </div>

        {/* Footer - Özet ve Ödeme */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-[#e8e8e8] p-6">
            {/* Minimum Tutar Uyarısı */}
            {!canCheckout && (
              <div className="mb-4 p-3 bg-[#fef3c7] border border-[#f59e0b] rounded-lg">
                <p className="text-[13px] text-[#3c4043] font-semibold">
                  Min. sepet tutarına ulaşmak için {remainingAmount.toFixed(2)}₺ daha ekleyin
                </p>
              </div>
            )}

            {/* Özet */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#6f6f6f]">Ara Toplam</span>
                <span className="font-semibold text-[#3c4043]">{subtotal.toFixed(2)}₺</span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#6f6f6f]">Teslimat Ücreti</span>
                <span className="font-semibold text-[#3c4043]">
                  {deliveryFee === 0 ? 'Ücretsiz' : `${deliveryFee.toFixed(2)}₺`}
                </span>
              </div>
              <div className="pt-2 border-t border-[#e8e8e8] flex items-center justify-between">
                <span className="text-[16px] font-bold text-[#3c4043]">Toplam</span>
                <span className="text-[20px] font-bold text-[#f59e0b]">{total.toFixed(2)}₺</span>
              </div>
            </div>

            {/* Ödeme Butonu */}
            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className={`w-full h-[56px] rounded-lg font-bold text-[16px] transition-colors ${
                canCheckout
                  ? 'bg-[#f59e0b] text-white hover:bg-[#d97706]'
                  : 'bg-[#e8e8e8] text-[#9e9e9e] cursor-not-allowed'
              }`}
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              {canCheckout ? 'Siparişi Tamamla' : `Min. ${minimumOrderValue}₺`}
            </button>
          </div>
        )}

        {/* Ödeme Yöntemi Modal */}
        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-end justify-center z-[60]"
              onClick={() => !isProcessing && setShowPaymentModal(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-[450px] rounded-t-3xl p-6 pb-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
                
                <h3 className="text-[22px] font-bold text-[#3c4043] mb-2 text-center">
                  Ödeme Yöntemi Seçin
                </h3>
                <p className="text-[14px] text-[#6f6f6f] mb-6 text-center">
                  Toplam: <span className="font-bold text-[#f59e0b]">{total.toFixed(2)}₺</span>
                </p>

                {/* Telefon Numarası Input */}
                <div className="mb-6">
                  <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                    Kuryenin iletişime geçmesi için cep telefon numaranızı yazın
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <p className="text-[11px] text-[#6f6f6f] mb-2">
                    (numaranızı başında 0 olmadan yazınız)
                  </p>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="5675551122"
                    className={`w-full bg-slate-100 rounded-lg p-3 text-[16px] border-2 transition-colors outline-none ${
                      phoneError 
                        ? 'border-red-500' 
                        : phoneNumber.length > 0 && isPhoneValid
                        ? 'border-green-500'
                        : 'border-transparent focus:border-orange-500'
                    }`}
                    disabled={isProcessing}
                  />
                  {phoneError && (
                    <p className="text-[12px] text-red-500 mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      {phoneError}
                    </p>
                  )}
                  {phoneNumber.length > 0 && isPhoneValid && (
                    <p className="text-[12px] text-green-600 mt-1 flex items-center gap-1">
                      <span>✓</span>
                      Telefon numarası geçerli
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Nakit Ödeme */}
                  <button
                    onClick={() => handlePaymentSelect('cash')}
                    disabled={isProcessing || !isPhoneValid}
                    className={`w-full h-[72px] rounded-2xl flex items-center justify-center gap-4 transition-all shadow-lg ${
                      isPhoneValid && !isProcessing
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                        : 'bg-gray-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Banknote size={32} strokeWidth={2.5} className={isPhoneValid ? 'text-white' : 'text-gray-500'} />
                    <div className="text-left">
                      <div className={`text-[18px] font-bold ${isPhoneValid ? 'text-white' : 'text-gray-500'}`}>
                        Nakit
                      </div>
                      <div className={`text-[13px] ${isPhoneValid ? 'text-white opacity-90' : 'text-gray-500'}`}>
                        Kapıda nakit ödeme
                      </div>
                    </div>
                  </button>

                  {/* Kredi Kartı */}
                  <button
                    onClick={() => handlePaymentSelect('card')}
                    disabled={isProcessing || !isPhoneValid}
                    className={`w-full h-[72px] rounded-2xl flex items-center justify-center gap-4 transition-all shadow-lg ${
                      isPhoneValid && !isProcessing
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                        : 'bg-gray-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <CreditCard size={32} strokeWidth={2.5} className={isPhoneValid ? 'text-white' : 'text-gray-500'} />
                    <div className="text-left">
                      <div className={`text-[18px] font-bold ${isPhoneValid ? 'text-white' : 'text-gray-500'}`}>
                        Kapıda Kredi Kartı
                      </div>
                      <div className={`text-[13px] ${isPhoneValid ? 'text-white opacity-90' : 'text-gray-500'}`}>
                        Kartla ödeme yapın
                      </div>
                    </div>
                  </button>
                </div>

                {!isPhoneValid && phoneNumber.length === 0 && (
                  <p className="text-[12px] text-center text-[#6f6f6f] mt-3">
                    Devam etmek için telefon numaranızı girin
                  </p>
                )}

                {isProcessing && (
                  <div className="mt-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#f59e0b] border-t-transparent" />
                    <p className="text-[13px] text-[#6f6f6f] mt-2">Sipariş oluşturuluyor...</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Başarı Animasyonu */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70]"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="bg-white rounded-3xl p-8 max-w-[320px] text-center shadow-2xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 10, stiffness: 200 }}
                  className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle size={56} className="text-white" strokeWidth={3} />
                </motion.div>
                
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[24px] font-bold text-[#3c4043] mb-2"
                >
                  Siparişiniz Oluşturuldu!
                </motion.h3>
                
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[14px] text-[#6f6f6f]"
                >
                  Restoran siparişinizi hazırlamaya başladı
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
