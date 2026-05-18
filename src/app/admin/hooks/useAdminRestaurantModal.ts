/**
 * @file src/app/admin/hooks/useAdminRestaurantModal.ts
 * @description Restoran Modal Yönetimi — Paket Bazlı is_paid_to_restaurant Mimarisi
 *
 * YENİ SİSTEM:
 * - processRestaurantPayment RPC ile atomik ödeme
 * - Tarih aralığı zorunlu (filtrelenen dönem ödenir)
 * - Filtre dışı paketlere dokunulmaz
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

  // ── ÖDEME İŞLEMİ (YENİ SİSTEM) ──────────────────────────────
  /**
   * Filtrelenen tarih aralığındaki ödenmemiş paketleri ödendi olarak işaretler.
   * Atomik RPC: packages UPDATE + payment INSERT tek transaction.
   */
  const handleRestaurantPayment = async () => {
    if (!restaurantId) {
      setErrorMessage('❌ Restoran ID bulunamadı!')
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    if (!restaurantStartDate || !restaurantEndDate) {
      setErrorMessage('❌ Tarih aralığı seçilmeli!')
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    setRestaurantPaymentProcessing(true)

    try {
      const result = await processRestaurantPayment(
        restaurantId,
        restaurantStartDate,
        restaurantEndDate,
        `Dönem Ödemesi — ${restaurantStartDate} / ${restaurantEndDate}`
      )

      if (result.success) {
        const msg = result.message || '✅ Ödeme başarıyla kaydedildi'
        const detail = result.data
          ? ` (${result.data.package_count} paket, ${result.data.net_paid?.toFixed(2)} ₺ net)`
          : ''
        setSuccessMessage(msg + detail)
        setTimeout(() => setSuccessMessage(''), 4000)

        // UI anında güncelle
        setGuncelBakiye(0)
        setShowRestaurantPaymentModal(false)
        setRestaurantPaymentAmount('')

        // Listeleri yenile
        fetchRestaurants()
        setTimeout(() => {
          setRefetchTrigger((prev) => prev + 1)
        }, 300)
      } else {
        setErrorMessage(`❌ ${result.error || 'Ödeme kaydedilemedi'}`)
        setTimeout(() => setErrorMessage(''), 8000)
      }
    } catch (error: any) {
      console.error('❌ handleRestaurantPayment CATCH:', error)
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
