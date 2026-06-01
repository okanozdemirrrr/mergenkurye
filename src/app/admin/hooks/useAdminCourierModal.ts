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
import { handleEndOfDay as handleEndOfDayService, handlePayDebt as handlePayDebtService } from '@/services/courierService'
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
  const businessDates = getBusinessDayDateTimeLocal()
  const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
  const [courierDebts, setCourierDebts] = useState<CourierDebt[]>([])
  const [courierStartDate, setCourierStartDate] = useState(businessDates.start)
  const [courierEndDate, setCourierEndDate] = useState(businessDates.end)
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
      const { data, error } = await supabase
        .from('courier_debts')
        .select('*')
        .eq('courier_id', id)
        .eq('status', 'pending')
        .order('debt_date', { ascending: true })

      if (error) throw error
      setCourierDebts(data || [])
    } catch (error: any) {
      console.error('Borçlar yüklenemedi:', error)
      setCourierDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }

  // Handle End of Day - ORİJİNAL MANTIK
  const handleEndOfDay = async (calculateCashSummary: (orders: Package[]) => { cashTotal: number; cardTotal: number; grandTotal: number }) => {
    if (!courierId) return
    const amount = parseFloat(endOfDayAmount)
    if (isNaN(amount)) return

    setEndOfDayProcessing(true)
    const summary = calculateCashSummary(selectedCourierOrders)

    const result = await handleEndOfDayService(courierId, {
      dailyCashTotal: summary.cashTotal,
      amountReceived: amount,
      oldDebts: courierDebts
    })

    if (result.success) {
      setSuccessMessage('Gün sonu başarıyla alındı')
      setShowEndOfDayModal(false)
      setEndOfDayAmount('')
      fetchCouriers()
      fetchCourierDebts(courierId)
      fetchCourierOrders(courierId)
    } else {
      setErrorMessage('Gün sonu alınırken hata oluştu')
    }
    setEndOfDayProcessing(false)
  }

  // Handle Pay Debt - ORİJİNAL MANTIK
  const handlePayDebt = async () => {
    if (!courierId) return
    const amount = parseFloat(payDebtAmount)
    if (isNaN(amount)) return

    setPayDebtProcessing(true)
    const result = await handlePayDebtService(courierId, amount, courierDebts)

    if (result.success) {
      setSuccessMessage('Borç ödemesi başarıyla kaydedildi')
      setShowPayDebtModal(false)
      setPayDebtAmount('')
      fetchCouriers()
      fetchCourierDebts(courierId)
    } else {
      setErrorMessage('Borç ödenirken hata oluştu')
    }
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
