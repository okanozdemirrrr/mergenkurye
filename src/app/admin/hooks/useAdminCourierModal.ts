/**
 * @file src/app/admin/hooks/useAdminCourierModal.ts
 * @description Kurye Modal Yönetimi Custom Hook
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık AdminModals.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Package, CourierDebt } from '@/types'
import { usePersistedDateRange } from '@/hooks/usePersistedDateRange'
import { getBusinessDayDateTimeLocal, toFilterIso } from '@/utils/courierAccount'

interface UseAdminCourierModalProps {
  courierId: string | null
  modalType: string | null
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
  fetchCouriers: () => void
}

export function useAdminCourierModal({
  courierId,
  modalType,
  setSuccessMessage,
  setErrorMessage,
  fetchCouriers
}: UseAdminCourierModalProps) {
  const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
  const [courierDebts, setCourierDebts] = useState<CourierDebt[]>([])
  const dateStorageKey = courierId
    ? `admin-courier-range-${courierId}`
    : 'admin-courier-range'
  const {
    startDate: courierStartDate,
    endDate: courierEndDate,
    setStartDate: setCourierStartDate,
    setEndDate: setCourierEndDate,
    applyPreset: applyCourierDatePreset,
  } = usePersistedDateRange(dateStorageKey)
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [endOfDayAmount, setEndOfDayAmount] = useState('')
  const [endOfDayProcessing, setEndOfDayProcessing] = useState(false)
  const [showPayDebtModal, setShowPayDebtModal] = useState(false)
  const [payDebtAmount, setPayDebtAmount] = useState('')
  const [payDebtProcessing, setPayDebtProcessing] = useState(false)

  // Initialize dates - Varsayılan olarak bugün
  useEffect(() => {
    if (modalType === 'courier' && courierId) {
      fetchCourierOrders(courierId)
      fetchCourierDebts(courierId)
    }
  }, [modalType, courierId, courierStartDate, courierEndDate])

  // Fetch Courier Orders - delivered_by_courier_id kullan (kurye değişikliğinde bile doğru kurye görünsün)
  const fetchCourierOrders = async (id: string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, restaurants(*)')
        .eq('delivered_by_courier_id', id)  // courier_id yerine delivered_by_courier_id
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      if (courierStartDate && courierEndDate) {
        query = query
          .gte('delivered_at', toFilterIso(courierStartDate, 'start'))
          .lte('delivered_at', toFilterIso(courierEndDate, 'end'))
      }

      const { data, error } = await query
      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0 ? pkg.restaurants[0] : pkg.restaurants || null,
        restaurants: undefined
      }))

      setSelectedCourierOrders(transformedData)
    } catch (error: any) {
      console.error('Kurye siparişleri yüklenirken hata:', error.message)
    }
  }

  // Fetch Courier Debts - ORİJİNAL MANTIK
  const fetchCourierDebts = async (id: string) => {
    setLoadingDebts(true)
    try {
      console.warn('[ledger] courier_debts devre dışı. Kurye borcu courier_settlements üzerinden takip edilir.')
      setCourierDebts([])
    } catch (error: any) {
      console.error('Borçlar yüklenemedi:', error)
      setCourierDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }

  // Handle End of Day - ORİJİNAL MANTIK
  const handleEndOfDay = async (calculateCashSummary: (orders: Package[]) => { cashTotal: number; cardTotal: number; grandTotal: number }) => {
    void calculateCashSummary
    setErrorMessage('Legacy gün sonu (courier_debts) devre dışı. Yeni akış: Ledger mutabakatı.')
    setTimeout(() => setErrorMessage(''), 4000)
  }

  // Handle Pay Debt - ORİJİNAL MANTIK
  const handlePayDebt = async () => {
    if (!courierId) return
    void payDebtAmount
    setPayDebtProcessing(true)
    setErrorMessage('Legacy borç ödeme (courier_debts) devre dışı. Kurye borcu yalnızca ledger üzerinden takip edilir.')
    setTimeout(() => setErrorMessage(''), 4000)
    setPayDebtProcessing(false)
  }

  return {
    // State
    selectedCourierOrders,
    courierDebts,
    courierStartDate,
    setCourierStartDate,
    courierEndDate,
    setCourierEndDate,
    loadingDebts,
    showEndOfDayModal,
    setShowEndOfDayModal,
    endOfDayAmount,
    setEndOfDayAmount,
    endOfDayProcessing,
    showPayDebtModal,
    setShowPayDebtModal,
    payDebtAmount,
    setPayDebtAmount,
    payDebtProcessing,
    
    // Functions
    fetchCourierOrders,
    fetchCourierDebts,
    handleEndOfDay,
    handlePayDebt
  }
}
