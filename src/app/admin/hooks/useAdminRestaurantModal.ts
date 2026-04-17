/**
 * @file src/app/admin/hooks/useAdminRestaurantModal.ts
 * @description Restoran Modal Yönetimi Custom Hook
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık AdminModals.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Package, RestaurantDebt } from '@/types'
import { handleRestaurantPayment as handleRestaurantPaymentService, handleRestaurantDebtPayment as handleRestaurantDebtPaymentService } from '@/services/restaurantService'

interface UseAdminRestaurantModalProps {
  restaurantId: string | null
  modalType: string | null
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
  fetchRestaurants: () => void
}

export function useAdminRestaurantModal({
  restaurantId,
  modalType,
  setSuccessMessage,
  setErrorMessage,
  fetchRestaurants
}: UseAdminRestaurantModalProps) {
  // State Management
  const [selectedRestaurantOrders, setSelectedRestaurantOrders] = useState<Package[]>([])
  const [restaurantDebts, setRestaurantDebts] = useState<RestaurantDebt[]>([])
  const [loadingRestaurantDebts, setLoadingRestaurantDebts] = useState(false)
  const [restaurantStartDate, setRestaurantStartDate] = useState('')
  const [restaurantEndDate, setRestaurantEndDate] = useState('')
  const [showRestaurantPaymentModal, setShowRestaurantPaymentModal] = useState(false)
  const [restaurantPaymentAmount, setRestaurantPaymentAmount] = useState('')
  const [restaurantPaymentProcessing, setRestaurantPaymentProcessing] = useState(false)
  const [showRestaurantDebtPayModal, setShowRestaurantDebtPayModal] = useState(false)
  const [restaurantDebtPayAmount, setRestaurantDebtPayAmount] = useState('')
  const [restaurantDebtPayProcessing, setRestaurantDebtPayProcessing] = useState(false)

  // Initialize dates - ORİJİNAL MANTIK
  useEffect(() => {
    if (modalType === 'restaurant' && restaurantId) {
      if (!restaurantStartDate || !restaurantEndDate) {
        const today = new Date().toISOString().split('T')[0]
        setRestaurantStartDate(today)
        setRestaurantEndDate(today)
      }
      fetchRestaurantOrders(restaurantId)
      fetchRestaurantDebts(restaurantId)
    }
  }, [modalType, restaurantId])

  // Fetch Restaurant Orders - ORİJİNAL MANTIK
  const fetchRestaurantOrders = async (id: string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, couriers(full_name)')
        .eq('restaurant_id', id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      if (restaurantStartDate && restaurantEndDate) {
        const start = new Date(restaurantStartDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(restaurantEndDate)
        end.setHours(23, 59, 59, 999)
        query = query.gte('delivered_at', start.toISOString()).lte('delivered_at', end.toISOString())
      }

      const { data, error } = await query
      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        courier_name: pkg.couriers?.full_name,
        couriers: undefined
      }))

      setSelectedRestaurantOrders(transformedData)
    } catch (error: any) {
      console.error('Restoran siparişleri yüklenirken hata:', error.message)
    }
  }

  // Fetch Restaurant Debts - ORİJİNAL MANTIK
  const fetchRestaurantDebts = async (id: string) => {
    setLoadingRestaurantDebts(true)
    try {
      const { data, error } = await supabase
        .from('restaurant_debts')
        .select('*')
        .eq('restaurant_id', id)
        .eq('status', 'pending')
        .order('debt_date', { ascending: true })

      if (error) throw error
      setRestaurantDebts(data || [])
    } catch (error: any) {
      console.error('Restoran borçları yüklenemedi:', error)
      setRestaurantDebts([])
    } finally {
      setLoadingRestaurantDebts(false)
    }
  }

  // Handle Restaurant Payment - ORİJİNAL MANTIK
  const handleRestaurantPayment = async () => {
    if (!restaurantId) return
    const amount = parseFloat(restaurantPaymentAmount)
    if (isNaN(amount)) return

    setRestaurantPaymentProcessing(true)
    const result = await handleRestaurantPaymentService(restaurantId, {
      totalOrderAmount: selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
      amountPaid: amount,
      orderIds: selectedRestaurantOrders.map(o => o.id)
    })

    if (result.success) {
      setSuccessMessage('Ödeme başarıyla kaydedildi')
      setShowRestaurantPaymentModal(false)
      setRestaurantPaymentAmount('')
      fetchRestaurants()
      fetchRestaurantDebts(restaurantId)
      fetchRestaurantOrders(restaurantId)
    } else {
      setErrorMessage('Ödeme kaydedilirken hata oluştu')
    }
    setRestaurantPaymentProcessing(false)
  }

  // Handle Restaurant Debt Payment - ORİJİNAL MANTIK
  const handleRestaurantDebtPayment = async () => {
    if (!restaurantId) return
    const amount = parseFloat(restaurantDebtPayAmount)
    if (isNaN(amount)) return

    setRestaurantDebtPayProcessing(true)
    const result = await handleRestaurantDebtPaymentService(restaurantId, amount, restaurantDebts)

    if (result.success) {
      setSuccessMessage('Borç ödemesi başarıyla kaydedildi')
      setShowRestaurantDebtPayModal(false)
      setRestaurantDebtPayAmount('')
      fetchRestaurants()
      fetchRestaurantDebts(restaurantId)
    } else {
      setErrorMessage('Borç ödenirken hata oluştu')
    }
    setRestaurantDebtPayProcessing(false)
  }

  return {
    // State
    selectedRestaurantOrders,
    restaurantDebts,
    loadingRestaurantDebts,
    restaurantStartDate,
    setRestaurantStartDate,
    restaurantEndDate,
    setRestaurantEndDate,
    showRestaurantPaymentModal,
    setShowRestaurantPaymentModal,
    restaurantPaymentAmount,
    setRestaurantPaymentAmount,
    restaurantPaymentProcessing,
    showRestaurantDebtPayModal,
    setShowRestaurantDebtPayModal,
    restaurantDebtPayAmount,
    setRestaurantDebtPayAmount,
    restaurantDebtPayProcessing,
    
    // Functions
    fetchRestaurantOrders,
    fetchRestaurantDebts,
    handleRestaurantPayment,
    handleRestaurantDebtPayment
  }
}
