'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Star, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface Review {
  id: string
  rating_taste: number
  rating_delivery: number
  comment: string | null
  reply: string | null
  created_at: string
  customer_id: string
}

interface ReviewsSectionProps {
  restaurantId: string
}

export default function ReviewsSection({ restaurantId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)

  useEffect(() => {
    loadReviews()
  }, [restaurantId])

  const loadReviews = async () => {
    try {
      console.log('Loading reviews for restaurant:', restaurantId)
      
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      console.log('Reviews query result:', { data, error })

      if (error) {
        console.error('Reviews query error:', error)
        throw error
      }

      setReviews(data || [])
      setTotalReviews(data?.length || 0)

      // Ortalama puan hesapla
      if (data && data.length > 0) {
        const avg = data.reduce((acc, review) => {
          return acc + (review.rating_taste + review.rating_delivery) / 2
        }, 0) / data.length
        setAverageRating(avg)
      }
    } catch (error) {
      console.error('Yorumlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            fill={star <= rating ? '#f59e0b' : 'none'}
            stroke={star <= rating ? '#f59e0b' : '#d1d5db'}
            strokeWidth={2}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#f59e0b] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Genel Puan */}
      {totalReviews > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-5xl font-bold text-[#f59e0b]">
              {averageRating.toFixed(1)}
            </span>
            <div>
              {renderStars(Math.round(averageRating))}
              <p className="text-[13px] text-[#6f6f6f] mt-1">
                {totalReviews} değerlendirme
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Yorumlar Listesi */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-[18px] font-bold text-[#3c4043] mb-2">
            Henüz Değerlendirme Yok
          </h3>
          <p className="text-[14px] text-[#6f6f6f]">
            Bu restoran için ilk değerlendirmeyi siz yapın!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-[#e8e8e8] rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              {/* Müşteri Bilgisi */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div>
                    <p className="font-semibold text-[#3c4043]">
                      Müşteri
                    </p>
                    <p className="text-[12px] text-[#6f6f6f]">
                      {new Date(review.created_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Puanlar */}
              <div className="flex gap-6 mb-3">
                <div>
                  <p className="text-[12px] text-[#6f6f6f] mb-1">🍔 Lezzet</p>
                  {renderStars(review.rating_taste)}
                </div>
                <div>
                  <p className="text-[12px] text-[#6f6f6f] mb-1">🛵 Teslimat</p>
                  {renderStars(review.rating_delivery)}
                </div>
              </div>

              {/* Yorum */}
              {review.comment && (
                <p className="text-[14px] text-[#3c4043] leading-relaxed mb-3">
                  {review.comment}
                </p>
              )}

              {/* Restoran Cevabı */}
              {review.reply && (
                <div className="mt-3 pt-3 border-t border-[#e8e8e8] bg-orange-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                  <p className="text-[12px] font-semibold text-[#f59e0b] mb-1">
                    🏪 Restoran Cevabı
                  </p>
                  <p className="text-[13px] text-[#3c4043]">
                    {review.reply}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
