/**
 * @file src/app/admin/AdminModals.tsx
 * @description Admin Panel Modal Yöneticisi - URL parametreleri ile kontrol
 */
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAdminData } from './AdminDataProvider'
import { CourierDetailModal } from './components/modals/CourierDetailModal'
import { RestaurantDetailModal } from './components/modals/RestaurantDetailModal'
import { EndOfDayModal } from './components/modals/EndOfDayModal'
import { PayDebtModal } from './components/modals/PayDebtModal'
import { RestaurantPaymentModal } from './components/modals/RestaurantPaymentModal'
import { RestaurantDebtPayModal } from './components/modals/RestaurantDebtPayModal'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Package, CourierDebt, RestaurantDebt } from '@/types'
import { getPlatformBadgeClass, getPlatformDisplayName } from '../lib/platformUtils'
import { handleEndOfDay as handleEndOfDayService, handlePayDebt as handlePayDebtService } from '@/services/courierService'
import { handleRestaurantPayment as handleRestaurantPaymentService, handleRestaurantDebtPayment as handleRestaurantDebtPaymentService } from '@/services/restaurantService'

export function AdminModals() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { couriers, restaurants, setSuccessMessage, setErrorMessage, fetchCouriers, fetchRestaurants } = useAdminData()

  const modalType = searchParams.get('modal')
  const courierId = searchParams.get('courierId')
  const restaurantId = searchParams.get('restaurantId')

  // Courier Modal States
  const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
  const [courierDebts, setCourierDebts] = useState<CourierDebt[]>([])
  const [courierStartDate, setCourierStartDate] = useState('')
  const [courierEndDate, setCourierEndDate] = useState('')
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [endOfDayAmount, setEndOfDayAmount] = useState('')
  const [endOfDayProcessing, setEndOfDayProcessing] = useState(false)
  const [showPayDebtModal, setShowPayDebtModal] = useState(false)
  const [payDebtAmount, setPayDebtAmount] = useState('')
  const [payDebtProcessing, setPayDebtProcessing] = useState(false)

  // Restaurant Modal States
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

  // Initialize dates
  useEffect(() => {
    if (modalType === 'courier' && courierId) {
      if (!courierStartDate || !courierEndDate) {
        const today = new Date().toISOString().split('T')[0]
        setCourierStartDate(today)
        setCourierEndDate(today)
      }
      fetchCourierOrders(courierId)
      fetchCourierDebts(courierId)
    }
  }, [modalType, courierId])

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

  // Fetch functions
  const fetchCourierOrders = async (id: string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, restaurants(*)')
        .eq('courier_id', id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      if (courierStartDate && courierEndDate) {
        const start = new Date(courierStartDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(courierEndDate)
        end.setHours(23, 59, 59, 999)
        query = query.gte('delivered_at', start.toISOString()).lte('delivered_at', end.toISOString())
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

  // Helper functions
  const calculateCashSummary = (orders: Package[]) => {
    const cashTotal = orders
      .filter(order => order.payment_method === 'cash')
      .reduce((sum, order) => sum + (order.amount || 0), 0)

    const cardTotal = orders
      .filter(order => order.payment_method === 'card')
      .reduce((sum, order) => sum + (order.amount || 0), 0)

    const grandTotal = orders
      .filter(order => !order.settled_at)
      .reduce((sum, order) => sum + (order.amount || 0), 0)

    return { cashTotal, cardTotal, grandTotal }
  }

  const calculateRestaurantSummary = (orders: Package[]) => {
    const restaurantCounts: { [key: string]: number } = {}
    orders.forEach(order => {
      const restaurantName = order.restaurant?.name || 'Bilinmeyen Restoran'
      restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1
    })
    return Object.entries(restaurantCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))
  }

  // Handlers
  const handleEndOfDay = async () => {
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

  const closeModal = () => {
    router.back()
  }

  const courier = couriers.find(c => c.id === courierId)
  const restaurant = restaurants.find(r => r.id === restaurantId)

  return (
    <>
      {/* Courier Detail Modal */}
      {modalType === 'courier' && courierId && (
        <CourierDetailModal
          show={true}
          onClose={closeModal}
          courier={courier}
          selectedCourierId={courierId}
          courierStartDate={courierStartDate}
          setCourierStartDate={setCourierStartDate}
          courierEndDate={courierEndDate}
          setCourierEndDate={setCourierEndDate}
          onEndOfDayClick={() => setShowEndOfDayModal(true)}
          onPayDebtClick={() => setShowPayDebtModal(true)}
          selectedCourierOrders={selectedCourierOrders}
          courierDebts={courierDebts}
          calculateCashSummary={calculateCashSummary}
          calculateRestaurantSummary={calculateRestaurantSummary}
          getPlatformBadgeClass={getPlatformBadgeClass}
          getPlatformDisplayName={getPlatformDisplayName}
        />
      )}

      {/* End of Day Modal */}
      <EndOfDayModal
        show={showEndOfDayModal}
        onClose={() => setShowEndOfDayModal(false)}
        courier={courier}
        selectedCourierId={courierId}
        endOfDayAmount={endOfDayAmount}
        setEndOfDayAmount={setEndOfDayAmount}
        onConfirm={handleEndOfDay}
        processing={endOfDayProcessing}
        calculateCashSummary={calculateCashSummary}
        selectedCourierOrders={selectedCourierOrders}
        courierDebts={courierDebts}
        courierStartDate={courierStartDate}
        courierEndDate={courierEndDate}
        loadingDebts={loadingDebts}
      />

      {/* Pay Debt Modal */}
      <PayDebtModal
        show={showPayDebtModal}
        onClose={() => setShowPayDebtModal(false)}
        courier={courier}
        selectedCourierId={courierId}
        payDebtAmount={payDebtAmount}
        setPayDebtAmount={setPayDebtAmount}
        onConfirm={handlePayDebt}
        processing={payDebtProcessing}
        courierDebts={courierDebts}
        loadingDebts={loadingDebts}
      />

      {/* Restaurant Detail Modal */}
      {modalType === 'restaurant' && restaurantId && (
        <RestaurantDetailModal
          show={true}
          onClose={closeModal}
          restaurant={restaurant}
          selectedRestaurantId={restaurantId}
          restaurantStartDate={restaurantStartDate}
          setRestaurantStartDate={setRestaurantStartDate}
          restaurantEndDate={restaurantEndDate}
          setRestaurantEndDate={setRestaurantEndDate}
          onPaymentClick={() => setShowRestaurantPaymentModal(true)}
          selectedRestaurantOrders={selectedRestaurantOrders}
          getPlatformBadgeClass={getPlatformBadgeClass}
          getPlatformDisplayName={getPlatformDisplayName}
        />
      )}

      {/* Restaurant Payment Modal */}
      <RestaurantPaymentModal
        show={showRestaurantPaymentModal}
        onClose={() => setShowRestaurantPaymentModal(false)}
        restaurant={restaurant}
        selectedRestaurantId={restaurantId}
        restaurantPaymentAmount={restaurantPaymentAmount}
        setRestaurantPaymentAmount={setRestaurantPaymentAmount}
        onConfirm={handleRestaurantPayment}
        processing={restaurantPaymentProcessing}
        restaurantDebts={restaurantDebts}
        selectedRestaurantOrders={selectedRestaurantOrders}
        restaurantStartDate={restaurantStartDate}
        restaurantEndDate={restaurantEndDate}
        loadingDebts={loadingRestaurantDebts}
      />

      {/* Restaurant Debt Pay Modal */}
      <RestaurantDebtPayModal
        show={showRestaurantDebtPayModal}
        onClose={() => setShowRestaurantDebtPayModal(false)}
        restaurant={restaurant}
        selectedRestaurantId={restaurantId}
        restaurantDebtPayAmount={restaurantDebtPayAmount}
        setRestaurantDebtPayAmount={setRestaurantDebtPayAmount}
        onConfirm={handleRestaurantDebtPayment}
        processing={restaurantDebtPayProcessing}
        restaurantDebts={restaurantDebts}
        loadingDebts={loadingRestaurantDebts}
      />
    </>
  )
}
