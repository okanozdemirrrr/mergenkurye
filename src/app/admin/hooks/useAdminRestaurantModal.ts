/**
 * @file src/app/admin/hooks/useAdminRestaurantModal.ts
 * @description Restoran Modal Yönetimi — Kalıcı restaurant_settlements mutabakatı
 *
 * - processRestaurantPayment → process_restaurant_settlement RPC
 * - Seçili dönem fişi + paket işaretleme atomik transaction
 */

import { useState, useEffect } from 'react'
import { processRestaurantPayment } from '@/services/restaurantService'

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

  // Dönem bakiyesi — RestaurantDetailModal'dan gelir
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

  // ── ÖDEME İŞLEMİ (Kalıcı Mutabakat) ──────────────────────────
  /**
   * Seçili dönem için process_restaurant_settlement RPC çağırır.
   * restaurant_settlements fişi + paket işaretleme tek transaction.
   */
  const handleRestaurantPayment = async () => {
    if (!restaurantId) {
      const errMsg = '❌ Restoran ID bulunamadı!'
      setErrorMessage(errMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      throw new Error(errMsg)
    }

    const effectiveStartDate = restaurantStartDate || parentStartDate || ''
    const effectiveEndDate = restaurantEndDate || parentEndDate || ''

    if (!effectiveStartDate || !effectiveEndDate) {
      const errMsg = '❌ Dönem tarihleri seçilmeli! Lütfen ana ekrandan tarih filtresi seçin.'
      setErrorMessage(errMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      throw new Error(errMsg)
    }

    setRestaurantPaymentProcessing(true)

    try {
      const result = await processRestaurantPayment(
        restaurantId,
        effectiveStartDate,
        effectiveEndDate,
        `Dönem Mutabakatı — ${effectiveStartDate} / ${effectiveEndDate}`
      )

      if (result.success) {
        const msg = result.message || '✅ Mutabakat başarıyla kaydedildi'
        const detail = result.data
          ? ` (${result.data.package_count} paket, ${result.data.net_paid?.toFixed(2)} ₺ net)`
          : ''
        setSuccessMessage(msg + detail)
        setTimeout(() => setSuccessMessage(''), 4000)

        setGuncelBakiye(0)
        setRestaurantPaymentAmount('')

        fetchRestaurants()
        setRefetchTrigger((prev) => prev + 1)
      } else {
        const errMsg = result.error || 'Mutabakat kaydedilemedi'
        setErrorMessage(`❌ ${errMsg}`)
        setTimeout(() => setErrorMessage(''), 8000)
        throw new Error(errMsg)
      }
    } catch (error: any) {
      console.error('❌ handleRestaurantPayment CATCH:', error)
      if (!error.message?.includes('Mutabakat kaydedilemedi') && !error.message?.includes('❌')) {
        const errMsg = `❌ Beklenmeyen hata: ${error.message || 'Bilinmeyen hata'}`
        setErrorMessage(errMsg)
        setTimeout(() => setErrorMessage(''), 8000)
      }
      throw error
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
