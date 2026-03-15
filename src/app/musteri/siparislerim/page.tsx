'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Order {
  id: number
  order_number: string
  restaurant_id: string
  restaurant_name?: string
  amount: number
  status: string
  payment_method: 'cash' | 'card'
  created_at: string
  delivered_at: string | null
  items: any[]
  has_review?: boolean
  review_reply?: string | null
  review_replied_at?: string | null
}

export default function SiparislerimPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null)
  const [ratingTaste, setRatingTaste] = useState(0)
  const [ratingDelivery, setRatingDelivery] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const customerId = localStorage.getItem('customer_id')
      
      if (!customerId) {
        router.push('/musteri')
        return
      }

      // Siparişleri ve restoran bilgilerini çek
      const { data: ordersData, error: ordersError } = await supabase
        .from('packages')
        .select(`
          *,
          restaurants!restaurant_id (
            name
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Her sipariş için review kontrolü yap
      const ordersWithReviews = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('id, reply, replied_at')
            .eq('order_id', order.id)
            .single()

          return {
            ...order,
            restaurant_name: order.restaurants?.name,
            has_review: !!reviewData,
            review_reply: reviewData?.reply,
            review_replied_at: reviewData?.replied_at
          }
        })
      )

      setOrders(ordersWithReviews)
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  // 48 saat kontrolü
  const canReview = (order: Order) => {
    if (order.status !== 'delivered' || order.has_review || !order.delivered_at) return false
    
    const deliveredTime = new Date(order.delivered_at).getTime()
    const now = Date.now()
    const hoursPassed = (now - deliveredTime) / (1000 * 60 * 60)
    
    return hoursPassed <= 48
  }

  // Değerlendirme gönder
  const submitReview = async () => {
    if (!reviewingOrder || ratingTaste === 0 || ratingDelivery === 0) {
      alert('Lütfen hem lezzet hem de teslimat puanı verin')
      return
    }

    setSubmittingReview(true)

    try {
      const customerId = localStorage.getItem('customer_id')

      console.log('Review Data:', {
        order_id: reviewingOrder.id,
        customer_id: customerId,
        restaurant_id: reviewingOrder.restaurant_id,
        rating_taste: ratingTaste,
        rating_delivery: ratingDelivery,
        comment: comment.trim() || null
      })

      const { error } = await supabase
        .from('reviews')
        .insert([{
          order_id: reviewingOrder.id,
          customer_id: customerId,
          restaurant_id: reviewingOrder.restaurant_id,
          rating_taste: ratingTaste,
          rating_delivery: ratingDelivery,
          comment: comment.trim() || null
        }])

      if (error) {
        console.error('Supabase Error:', error)
        throw error
      }

      alert('✅ Değerlendirmeniz kaydedildi!')
      setReviewingOrder(null)
      setRatingTaste(0)
      setRatingDelivery(0)
      setComment('')
      await loadOrders()
    } catch (error: any) {
      console.error('Değerlendirme gönderilemedi:', error)
      alert('Değerlendirme gönderilirken hata oluştu: ' + error.message)
    } finally {
      setSubmittingReview(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'new_order':
        return { text: 'Yeni Sipariş', color: 'bg-orange-500', icon: Clock }
      case 'ready':
        return { text: 'Hazırlanıyor', color: 'bg-blue-500', icon: Package }
      case 'assigned':
        return { text: 'Kurye Atandı', color: 'bg-purple-500', icon: Package }
      case 'picking_up':
        return { text: 'Alınıyor', color: 'bg-indigo-500', icon: Package }
      case 'on_the_way':
        return { text: 'Yolda', color: 'bg-cyan-500', icon: Package }
      case 'delivered':
        return { text: 'Teslim Edildi', color: 'bg-green-500', icon: CheckCircle }
      case 'cancelled':
        return { text: 'İptal Edildi', color: 'bg-red-500', icon: XCircle }
      default:
        return { text: status, color: 'bg-gray-500', icon: Package }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#f59e0b] border-t-transparent mb-4" />
          <p className="text-[#6f6f6f]">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e8] sticky top-0 z-10">
        <div className="max-w-[600px] mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#f7f7f7] rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-[#3c4043]" />
          </button>
          <h1 className="text-[20px] font-bold text-[#3c4043]">
            Siparişlerim
          </h1>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-[600px] mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-[16px] font-semibold text-[#3c4043] mb-2">
              Henüz Siparişiniz Yok
            </p>
            <p className="text-[13px] text-[#6f6f6f] mb-6">
              İlk siparişinizi vererek başlayın
            </p>
            <button
              onClick={() => router.push('/musteri')}
              className="bg-[#f59e0b] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d97706] transition-colors"
            >
              Restoranları Keşfet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 border border-[#e8e8e8] hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[16px] font-bold text-[#3c4043]">
                        {order.order_number}
                      </p>
                      <p className="text-[12px] text-[#6f6f6f]">
                        {new Date(order.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className={`${statusInfo.color} text-white px-3 py-1 rounded-full flex items-center gap-1.5`}>
                      <StatusIcon size={14} />
                      <span className="text-[12px] font-semibold">
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-3">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[13px]">
                        <span className="text-[#6f6f6f]">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-semibold text-[#3c4043]">
                          {(item.price * item.quantity).toFixed(2)}₺
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-[#e8e8e8] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#6f6f6f]">
                        {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </span>
                    </div>
                    <span className="text-[18px] font-bold text-[#f59e0b]">
                      {order.amount.toFixed(2)}₺
                    </span>
                  </div>

                  {/* Değerlendirme Butonu */}
                  {canReview(order) && (
                    <div className="mt-3 pt-3 border-t border-[#e8e8e8]">
                      <button
                        onClick={() => setReviewingOrder(order)}
                        className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold text-[13px] hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Star size={16} fill="white" />
                        Değerlendir
                      </button>
                    </div>
                  )}

                  {order.has_review && (
                    <div className="mt-3 pt-3 border-t border-[#e8e8e8]">
                      {order.review_reply ? (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle size={14} className="text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] font-semibold text-green-700 mb-1">
                                🎉 {order.restaurant_name} yorumunuza yanıt verdi!
                              </p>
                              <p className="text-[12px] text-green-600 leading-relaxed">
                                {order.review_reply}
                              </p>
                              <p className="text-[10px] text-green-500 mt-1">
                                {order.review_replied_at && new Date(order.review_replied_at).toLocaleDateString('tr-TR', {
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-[12px] text-green-600">
                          <CheckCircle size={14} />
                          <span>Değerlendirildi</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Değerlendirme Modalı */}
      <AnimatePresence>
        {reviewingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-[20px] font-bold text-[#3c4043] mb-4">
                Siparişinizi Değerlendirin
              </h3>
              <p className="text-[13px] text-[#6f6f6f] mb-6">
                {reviewingOrder.restaurant_name} • {reviewingOrder.order_number}
              </p>

              {/* Lezzet Puanı */}
              <div className="mb-6">
                <label className="block text-[14px] font-semibold text-[#3c4043] mb-2">
                  🍔 Lezzet
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingTaste(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        fill={star <= ratingTaste ? '#f59e0b' : 'none'}
                        stroke={star <= ratingTaste ? '#f59e0b' : '#d1d5db'}
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Teslimat Puanı */}
              <div className="mb-6">
                <label className="block text-[14px] font-semibold text-[#3c4043] mb-2">
                  🛵 Teslimat
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingDelivery(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        fill={star <= ratingDelivery ? '#f59e0b' : 'none'}
                        stroke={star <= ratingDelivery ? '#f59e0b' : '#d1d5db'}
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Yorum */}
              <div className="mb-6">
                <label className="block text-[14px] font-semibold text-[#3c4043] mb-2">
                  💬 Yorumunuz (Opsiyonel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deneyiminizi paylaşın..."
                  className="w-full px-4 py-3 border border-[#e8e8e8] rounded-lg focus:outline-none focus:border-[#f59e0b] text-[14px] resize-none h-24"
                  maxLength={500}
                />
                <p className="text-[11px] text-[#6f6f6f] mt-1 text-right">
                  {comment.length}/500
                </p>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setReviewingOrder(null)
                    setRatingTaste(0)
                    setRatingDelivery(0)
                    setComment('')
                  }}
                  className="flex-1 py-3 bg-gray-100 text-[#3c4043] rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={submitReview}
                  disabled={submittingReview || ratingTaste === 0 || ratingDelivery === 0}
                  className="flex-1 py-3 bg-[#f59e0b] text-white rounded-lg font-semibold hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
