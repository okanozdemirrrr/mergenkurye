/**
 * @file src/app/admin/components/modals/RestaurantPaymentModal.tsx
 * @description Restoran Ödeme Onay Modalı — Paket Bazlı is_paid Mimarisi
 *
 * YENİ SİSTEM:
 * - Kullanıcı tutar GİRMEZ. Sistem net ödenmesi gerekeni hesaplar.
 * - "Onayla" dediğinde filtrelenen tarih aralığındaki tüm paketler ödendi olarak işaretlenir.
 * - Filtre dışı paketlere DOKUNULMAZ.
 */
'use client'

import { useState, useEffect } from 'react'
import { Restaurant } from '@/types'

interface RestaurantPaymentModalProps {
  show: boolean
  onClose: () => void
  restaurant: Restaurant | undefined
  selectedRestaurantId: number | string | null
  guncelBakiye: number            // Net ödenecek (Ciro - Masraf)
  restaurantPaymentAmount: string
  setRestaurantPaymentAmount: (amount: string) => void
  onConfirm: (amount?: number) => void
  processing: boolean
  startDate?: string
  endDate?: string
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
  startDate,
  endDate,
}: RestaurantPaymentModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (show) setShowConfetti(false)
  }, [show])

  if (!show || !selectedRestaurantId || !restaurant) return null

  const handleConfirmPayment = async () => {
    try {
      // 🔥 KRİTİK: Ödeme işlemini BEKLE (atomik RPC)
      await onConfirm()

      // Başarılıysa konfeti göster
      setShowConfetti(true)
      setTimeout(() => {
        setShowConfetti(false)
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('❌ Ödeme hatası:', error)
    }
  }

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
            <div className="text-xl text-emerald-300">Paketler ödendi olarak işaretlendi</div>
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
            <h3 className="text-2xl font-black text-white">💰 Dönem Ödemesi</h3>
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
          {/* Dönem Bilgisi */}
          {startDate && endDate && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Seçili Dönem</p>
              <p className="text-lg font-bold text-white">{startDate} — {endDate}</p>
            </div>
          )}

          {/* Net Ödenecek Tutar */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-6 rounded-2xl border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30 mb-6">
            <div className="text-center">
              <div className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-2">
                Net Ödenecek Tutar
              </div>
              <div
                className={`text-5xl font-black mb-2 tracking-tight ${
                  guncelBakiye > 0 ? 'text-emerald-300' : 'text-slate-400'
                }`}
              >
                {guncelBakiye.toFixed(2)} ₺
              </div>
              <div className="text-emerald-400/60 text-xs font-medium">
                {guncelBakiye > 0
                  ? 'Bu dönemdeki ödenmemiş paketlerin net tutarı'
                  : '✓ Bu dönemde ödenmemiş paket yok'}
              </div>
            </div>
          </div>

          {/* Uyarı */}
          <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-700/30 mb-6">
            <p className="text-amber-400 text-sm font-bold mb-1">⚠️ Dikkat</p>
            <p className="text-amber-300/70 text-xs leading-relaxed">
              Bu işlem, seçili dönemdeki tüm ödenmemiş paketleri <strong>"ödendi"</strong> olarak işaretleyecektir.
              Filtre dışındaki paketlere dokunulmaz. Bu işlem geri alınamaz.
            </p>
          </div>

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
              disabled={processing || guncelBakiye <= 0}
              className="flex-1 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  İşleniyor...
                </span>
              ) : (
                '✓ Ödemeyi Onayla'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
