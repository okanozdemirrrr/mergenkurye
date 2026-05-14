/**
 * @file src/app/admin/hooks/useAdminRestaurantModal.ts
 * @description Restoran Modal Yönetimi Custom Hook — 5 Altın Kural Mimarisi
 *
 * restaurant_debts tamamen kaldırıldı.
 * Ödeme: handleRestaurantPayment(restaurantId, amount) — validasyon kısıtlaması yok.
 */

import { useState, useEffect } from 'react'
import { handleRestaurantPayment as handleRestaurantPaymentService } from '@/services/restaurantService'

interface UseAdminRestaurantModalProps {
  restaurantId: string | null
  modalType: string | null
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
  fetchRestaurants: () => void
  parentStartDate: string | null
  parentEndDate: string | null
}

export function useAdminRestaurantModal({
  restaurantId,
  modalType,
  setSuccessMessage,
  setErrorMessage,
  fetchRestaurants,
  parentStartDate,
  parentEndDate,
}: UseAdminRestaurantModalProps) {
  // ── Ödeme Modalı State ──────────────────────────────────────
  const [showRestaurantPaymentModal, setShowRestaurantPaymentModal] = useState(false)
  const [restaurantPaymentAmount, setRestaurantPaymentAmount] = useState('')
  const [restaurantPaymentProcessing, setRestaurantPaymentProcessing] = useState(false)

  // Kümülatif bakiye — RestaurantDetailModal'dan gelir
  const [guncelBakiye, setGuncelBakiye] = useState<number>(0)

  // Refetch trigger — ödeme sonrası RestaurantDetailModal'ı yenile
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)

  // ── Tarih State'leri ────────────────────────────────────────
  const [restaurantStartDate, setRestaurantStartDate] = useState(parentStartDate || '')
  const [restaurantEndDate, setRestaurantEndDate] = useState(parentEndDate || '')

  useEffect(() => {
    if (parentStartDate && parentEndDate) {
      setRestaurantStartDate(parentStartDate)
      setRestaurantEndDate(parentEndDate)
    }
  }, [parentStartDate, parentEndDate])

  // ── Ödeme İşlemi ────────────────────────────────────────────

  /**
   * Admin ödeme yapar.
   * KURAL 4: Validasyon üst sınırı yok — sadece > 0 kontrolü.
   */
  const handleRestaurantPayment = async (amountOverride?: number) => {
    if (!restaurantId) {
      setErrorMessage('❌ Restoran ID bulunamadı!')
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    const amountStr = amountOverride !== undefined ? String(amountOverride) : restaurantPaymentAmount
    const amount = parseFloat(amountStr)

    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('❌ Geçerli bir tutar girin (0\'dan büyük olmalı)')
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    setRestaurantPaymentProcessing(true)

    try {
      const result = await handleRestaurantPaymentService(
        restaurantId,
        amount,
        `Ödeme — ${new Date().toLocaleDateString('tr-TR')}`
      )

      if (result.success) {
        setSuccessMessage(result.message || '✅ Ödeme başarıyla kaydedildi')
        setTimeout(() => setSuccessMessage(''), 3000)

        setShowRestaurantPaymentModal(false)
        setRestaurantPaymentAmount('')

        // Ana sayfayı ve RestaurantDetailModal'ı yenile
        fetchRestaurants()
        setRefetchTrigger((prev) => prev + 1)
      } else {
        setErrorMessage(`❌ ${result.error || 'Ödeme kaydedilemedi'}`)
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } catch (error: any) {
      console.error('❌ handleRestaurantPayment beklenmeyen hata:', error)
      setErrorMessage(`❌ Beklenmeyen hata: ${error.message || 'Bilinmeyen hata'}`)
      setTimeout(() => setErrorMessage(''), 8000)
    } finally {
      setRestaurantPaymentProcessing(false)
    }
  }

  return {
    // Ödeme Modal State
    showRestaurantPaymentModal,
    setShowRestaurantPaymentModal,
    restaurantPaymentAmount,
    setRestaurantPaymentAmount,
    restaurantPaymentProcessing,

    // Bakiye
    guncelBakiye,
    setGuncelBakiye,

    // Refetch
    refetchTrigger,

    // Tarih
    restaurantStartDate,
    setRestaurantStartDate,
    restaurantEndDate,
    setRestaurantEndDate,

    // İşlemler
    handleRestaurantPayment,
  }
}
