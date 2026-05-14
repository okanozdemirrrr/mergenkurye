/**
 * @file src/app/admin/components/modals/RestaurantPaymentModal.tsx
 * @description Restoran Ödeme Modalı — 5 Altın Kural Mimarisi
 *
 * KURAL 4: Validasyon üst sınırı YOK. Admin avans ödeyebilir.
 * KURAL 5: restaurant_debts kullanılmaz. Hesaplama tek kaynaktan gelir.
 *
 * Prop olarak gelen `guncelBakiye` = tüm zamanlar kümülatif borç
 */
'use client'

import { useState, useEffect } from 'react'
import { Restaurant } from '@/types'

interface RestaurantPaymentModalProps {
  show: boolean
  onClose: () => void
  restaurant: Restaurant | undefined
  selectedRestaurantId: number | string | null
  guncelBakiye: number            // Kümülatif bakiye (tüm zamanlar)
  restaurantPaymentAmount: string
  setRestaurantPaymentAmount: (amount: string) => void
  onConfirm: (amount?: number) => void
  processing: boolean
}

export function RestaurantPaymentModal({
  show,
  onClose,
  restaurant,
  selectedRestaurantId,
  guncelBakiye,
  restaurantPaymentAmount,
  setRestaurantPaymentAmount,
  onConfirm,
  processing,
}: RestaurantPaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (show) {
      setPaymentAmount('')
      setShowConfetti(false)
    }
  }, [show])

  if (!show || !selectedRestaurantId || !restaurant) return null

  const paid = paymentAmount && paymentAmount.trim() !== '' ? parseFloat(paymentAmount) : 0
  const isValidAmount = paymentAmount && paymentAmount.trim() !== '' && parseFloat(paymentAmount) > 0

  const handleMaxClick = () => {
    if (guncelBakiye > 0) setPaymentAmount(String(guncelBakiye.toFixed(2)))
  }

  const handleConfirmPayment = async () => {
    try {
      const amount = parseFloat(paymentAmount)
      setRestaurantPaymentAmount(paymentAmount)
      await onConfirm(amount)
      setShowConfetti(true)
      setTimeout(() => {
        setShowConfetti(false)
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('❌ Ödeme hatası:', error)
    }
  }

  // Fark hesabı
  const fark = guncelBakiye - paid
  const isAvans = paid > 0 && guncelBakiye <= 0   // Bakiye zaten negatifken ödeme
  const isKismi = paid > 0 && fark > 0
  const isFazla = paid > 0 && fark < 0 && !isAvans
  const isTam   = paid > 0 && fark === 0

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!showConfetti) onClose() }}
    >
      {/* 🎉 Konfeti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-8xl mb-4">🎉</div>
            <div className="text-4xl font-black text-emerald-400 mb-2">ÖDEME BAŞARILI!</div>
            <div className="text-xl text-emerald-300">Bakiye güncellendi</div>
          </div>
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  fontSize: `${Math.random() * 20 + 20}px`,
                }}
              >
                {['🎊', '✨', '💰', '✅', '🎉'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="bg-slate-950 rounded-2xl max-w-lg w-full border border-slate-800 shadow-2xl"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div>
            <h3 className="text-2xl font-black text-white">💰 Hesap Ödemesi</h3>
            <p className="text-sm text-slate-400 mt-1 font-medium">{restaurant.name}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
            className="text-slate-400 hover:text-white transition-colors text-2xl ml-4 hover:bg-slate-800 rounded-lg w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Güncel Bakiye Kartı */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-6 rounded-2xl border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30 mb-6">
            <div className="text-center">
              <div className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-2">
                Güncel Bakiye (Tüm Zamanlar)
              </div>
              <div
                className={`text-5xl font-black mb-2 tracking-tight ${
                  guncelBakiye > 0
                    ? 'text-emerald-300'
                    : guncelBakiye < 0
                    ? 'text-amber-300'
                    : 'text-slate-400'
                }`}
              >
                {guncelBakiye.toFixed(2)} ₺
              </div>
              <div className="text-emerald-400/60 text-xs font-medium">
                {guncelBakiye > 0
                  ? 'Restorana ödenmesi gereken tutar'
                  : guncelBakiye < 0
                  ? '⚠️ Restoran fazla ödeme yapmış (alacaklı)'
                  : '✓ Borç yok'}
              </div>
            </div>
          </div>

          {/* Ödeme Input */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
              💰 Ödeme Tutarı
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={guncelBakiye > 0 ? `Örn: ${guncelBakiye.toFixed(2)}` : 'Tutar girin'}
                autoFocus
                className="w-full px-4 py-4 bg-slate-900 border-2 border-slate-700 rounded-xl text-2xl font-black text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-slate-600"
              />
              {guncelBakiye > 0 && (
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  MAX
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Kısmi ödeme ve avans ödemesi kabul edilir
            </p>
          </div>

          {/* Fark Gösterimi */}
          {isValidAmount && (
            <div className="mb-6">
              {isTam && (
                <div className="bg-emerald-900/20 p-4 rounded-xl border-2 border-emerald-500/30 text-center">
                  <span className="text-2xl font-black text-emerald-500">✓ TAM ÖDEME</span>
                  <p className="text-xs text-emerald-400 mt-2">Hesap sıfırlanacak</p>
                </div>
              )}
              {isKismi && (
                <div className="bg-rose-900/20 p-4 rounded-xl border-2 border-rose-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-rose-400">⚠️ KISMİ ÖDEME</span>
                    <span className="text-3xl font-black text-rose-500">{fark.toFixed(2)} ₺ kaldı</span>
                  </div>
                  <p className="text-xs text-rose-400 mt-2">Kalan tutar bir sonraki ödemede alınacak</p>
                </div>
              )}
              {(isFazla || isAvans) && (
                <div className="bg-amber-900/20 p-4 rounded-xl border-2 border-amber-500/30 text-center">
                  <span className="text-xl font-black text-amber-400">ℹ️ AVANS ÖDEME</span>
                  <p className="text-sm text-amber-300 mt-2">
                    Bakiyeden {Math.abs(fark).toFixed(2)} ₺ fazla — avans olarak kaydedilecek
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
              className="flex-1 px-4 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmPayment() }}
              disabled={processing || !isValidAmount}
              className="flex-1 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  İşleniyor...
                </span>
              ) : (
                '✓ Ödemeyi Tamamla'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
