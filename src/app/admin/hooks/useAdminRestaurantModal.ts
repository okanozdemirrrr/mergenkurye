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
   * p_end_date'e kadar tüm ödenmemiş paketleri kapatır (geçmiş dahil).
   * Atomik RPC: packages UPDATE + payment INSERT tek transaction.
   */
  const handleRestaurantPayment = async () => {
    // 1. Restoran ID kontrolü
    if (!restaurantId) {
      const errMsg = '❌ Restoran ID bulunamadı!'
      setErrorMessage(errMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      throw new Error(errMsg) // PaymentModal'ın catch bloğunu tetikle
    }

    // 2. Bitiş tarihi kontrolü — boşsa parentEndDate'i fallback olarak kullan
    const effectiveEndDate = restaurantEndDate || parentEndDate || ''
    if (!effectiveEndDate) {
      const errMsg = '❌ Bitiş tarihi seçilmeli! Lütfen ana ekrandan tarih filtresi seçin.'
      setErrorMessage(errMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      throw new Error(errMsg)
    }

    setRestaurantPaymentProcessing(true)

    try {
      const result = await processRestaurantPayment(
        restaurantId,
        restaurantStartDate || parentStartDate || '',
        effectiveEndDate,
        `Bakiye Kapatıldı — ${effectiveEndDate} tarihine kadar`
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
        setRestaurantPaymentAmount('')

        // Listeleri yenile — anında refetch (timeout yok)
        fetchRestaurants()
        setRefetchTrigger((prev) => prev + 1)

        // 🚪 Modal'ı kapatmayı PaymentModal'a bırak (konfeti sonrası)
        // setShowRestaurantPaymentModal(false) — PaymentModal zaten onClose çağıracak
      } else {
        // Başarısız sonuç → throw et ki PaymentModal hata gösterebilsin
        const errMsg = result.error || 'Ödeme kaydedilemedi'
        setErrorMessage(`❌ ${errMsg}`)
        setTimeout(() => setErrorMessage(''), 8000)
        throw new Error(errMsg)
      }
    } catch (error: any) {
      console.error('❌ handleRestaurantPayment CATCH:', error)
      // Eğer hata zaten setErrorMessage ile gösterilmemişse göster
      if (!error.message?.includes('Ödeme kaydedilemedi') && !error.message?.includes('❌')) {
        const errMsg = `❌ Beklenmeyen hata: ${error.message || 'Bilinmeyen hata'}`
        setErrorMessage(errMsg)
        setTimeout(() => setErrorMessage(''), 8000)
      }
      throw error // PaymentModal'ın catch bloğunu tetikle
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
