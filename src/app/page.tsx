/**
 * @file src/app/page.tsx
 * @description Admin Panel Ana Giriş Sayfası. 
 * Bu dosya, tüm admin panelinin ana konteyneri olarak hizmet eder. Kimlik doğrulama, 
 * navigasyon (sidebar) yönetimi ve farklı admin sekmeleri (Canlı Takip, Geçmiş, Kuryeler, Restoranlar) 
 * arasındaki geçişleri koordine eder. Ayrıca modal durumlarını ve global veri yenileme 
 * mantığını yönetir.
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getPlatformBadgeClass, getPlatformDisplayName } from './lib/platformUtils'

// Type Imports
import { Package, Courier, Restaurant, CourierDebt, RestaurantDebt } from '@/types'

// Component Imports
import { LiveTrackingTab } from './admin/components/LiveTrackingTab'
import { HistoryTab } from './admin/components/HistoryTab'
import { CouriersTab } from './admin/components/CouriersTab'
import { RestaurantsTab } from './admin/components/RestaurantsTab'

// Modal Imports
import { CourierDetailModal } from './admin/components/modals/CourierDetailModal'
import { RestaurantDetailModal } from './admin/components/modals/RestaurantDetailModal'
import { EndOfDayModal } from './admin/components/modals/EndOfDayModal'
import { PayDebtModal } from './admin/components/modals/PayDebtModal'
import { RestaurantPaymentModal } from './admin/components/modals/RestaurantPaymentModal'
import { RestaurantDebtPayModal } from './admin/components/modals/RestaurantDebtPayModal'

// Service Imports
import { cancelOrder, assignCourier, updateOrderStatus } from '@/services/orderService'
import { handleEndOfDay as handleEndOfDayService, handlePayDebt as handlePayDebtService } from '@/services/courierService'
import { handleRestaurantPayment as handleRestaurantPaymentService, handleRestaurantDebtPayment as handleRestaurantDebtPaymentService } from '@/services/restaurantService'

export default function Home() {
  // ========== STATE MANAGEMENT ==========
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'couriers' | 'restaurants'>('live')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')

  // Data States
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])

  // UI States
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCouriers, setSelectedCouriers] = useState<{ [key: number]: string }>({})
  const [assigningIds, setAssigningIds] = useState<Set<number>>(new Set())
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [showMenu, setShowMenu] = useState(false)
  const [showCourierSubmenu, setShowCourierSubmenu] = useState(false)

  const [showRestaurantSubmenu, setShowRestaurantSubmenu] = useState(false)


  // Courier States
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [showCourierModal, setShowCourierModal] = useState(false)
  const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
  const [courierSubTab, setCourierSubTab] = useState<'accounts' | 'performance' | 'earnings'>('accounts')
  const [courierStartDate, setCourierStartDate] = useState('')
  const [courierEndDate, setCourierEndDate] = useState('')
  const [courierEarningsFilter, setCourierEarningsFilter] = useState<'today' | 'week' | 'month'>('today')
  const [courierDebts, setCourierDebts] = useState<CourierDebt[]>([])
  const [loadingDebts, setLoadingDebts] = useState(false)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [endOfDayAmount, setEndOfDayAmount] = useState('')
  const [endOfDayProcessing, setEndOfDayProcessing] = useState(false)
  const [showPayDebtModal, setShowPayDebtModal] = useState(false)
  const [payDebtAmount, setPayDebtAmount] = useState('')
  const [payDebtProcessing, setPayDebtProcessing] = useState(false)

  // Restaurant States
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | string | null>(null)
  const [selectedRestaurantOrders, setSelectedRestaurantOrders] = useState<Package[]>([])
  const [showRestaurantModal, setShowRestaurantModal] = useState(false)
  const [restaurantSubTab, setRestaurantSubTab] = useState<'list' | 'details' | 'debt' | 'payments'>('list')
  const [restaurantDebts, setRestaurantDebts] = useState<RestaurantDebt[]>([])
  const [loadingRestaurantDebts, setLoadingRestaurantDebts] = useState(false)
  const [showRestaurantPaymentModal, setShowRestaurantPaymentModal] = useState(false)
  const [restaurantPaymentAmount, setRestaurantPaymentAmount] = useState('')
  const [restaurantPaymentProcessing, setRestaurantPaymentProcessing] = useState(false)
  const [showRestaurantDebtPayModal, setShowRestaurantDebtPayModal] = useState(false)
  const [restaurantDebtPayAmount, setRestaurantDebtPayAmount] = useState('')
  const [restaurantDebtPayProcessing, setRestaurantDebtPayProcessing] = useState(false)
  const [restaurantStartDate, setRestaurantStartDate] = useState('')
  const [restaurantEndDate, setRestaurantEndDate] = useState('')
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')

  // Notification States
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [newOrderDetails, setNewOrderDetails] = useState<Package | null>(null)
  const [lastPackageIds, setLastPackageIds] = useState<Set<number>>(new Set())

  // ========== MOUNT & AUTH ==========
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const checkAuthAndRedirect = () => {
      if (typeof window === 'undefined') return
      if (!isMounted) return

      setIsCheckingAuth(true)

      try {
        const adminLoggedIn = localStorage.getItem('admin_logged_in')
        setIsLoggedIn(adminLoggedIn === 'true')
      } catch (error) {
        console.error('Auth kontrolü hatası:', error)
        setIsLoggedIn(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthAndRedirect()
  }, [isMounted])

  // ========== DATA FETCHING ==========
  const fetchPackages = async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // TÜM aktif paketleri çek (hem sahipsiz hem atanmış)
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(*)')
        .neq('status', 'cancelled')
        .neq('status', 'delivered')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0
          ? pkg.restaurants[0]
          : pkg.restaurants || null,
        restaurants: undefined
      }))

      console.log('📦 Aktif paketler güncellendi:', transformedData.length, 'adet')
      setPackages(transformedData)
    } catch (error: any) {
      console.error('Siparişler yüklenirken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeliveredPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(*), couriers(*)')
        .in('status', ['delivered', 'cancelled'])
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        courier_name: pkg.couriers?.full_name,
        restaurants: undefined,
        couriers: undefined
      }))

      // Tarihe göre sırala (delivered_at veya cancelled_at)
      transformedData.sort((a, b) => {
        const dateA = a.status === 'cancelled' && a.cancelled_at 
          ? new Date(a.cancelled_at).getTime()
          : a.delivered_at 
            ? new Date(a.delivered_at).getTime() 
            : 0
        const dateB = b.status === 'cancelled' && b.cancelled_at 
          ? new Date(b.cancelled_at).getTime()
          : b.delivered_at 
            ? new Date(b.delivered_at).getTime() 
            : 0
        return dateB - dateA // En yeni önce
      })

      console.log('📋 Geçmiş siparişler güncellendi:', transformedData.length, 'adet')
      setDeliveredPackages(transformedData)
    } catch (error: any) {
      console.error('Geçmiş siparişler yüklenirken hata:', error)
    }
  }

  const fetchCouriers = async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error

      const couriersData = (data || []).map(courier => ({
        ...courier,
        id: courier.id,
        full_name: courier.full_name || 'İsimsiz Kurye',
        is_active: Boolean(courier.is_active),
        deliveryCount: 0,
        todayDeliveryCount: 0,
        activePackageCount: 0,
        totalDebt: 0
      }))

      setCouriers(couriersData)
    } catch (error: any) {
      console.error('Kuryeler yüklenemedi:', error)
    }
  }

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error: any) {
      console.error('Restoranlar yüklenemedi:', error)
    }
  }

  const fetchCourierDebts = async (courierId: string) => {
    setLoadingDebts(true)
    try {
      const { data, error } = await supabase
        .from('courier_debts')
        .select('*')
        .eq('courier_id', courierId)
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

  const fetchRestaurantDebts = async (restaurantId: number | string) => {
    setLoadingRestaurantDebts(true)
    try {
      const { data, error } = await supabase
        .from('restaurant_debts')
        .select('*')
        .eq('restaurant_id', restaurantId)
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

  const fetchCourierOrders = async (courierId: string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, restaurants(*)')
        .eq('courier_id', courierId)
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

  const fetchRestaurantOrders = async (restaurantId: number | string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, couriers(full_name)')
        .eq('restaurant_id', restaurantId)
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

  // Helper Functions
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

  // ========== INITIAL DATA LOAD ==========
  useEffect(() => {
    if (!isLoggedIn) return

    fetchPackages()
    fetchDeliveredPackages()
    fetchCouriers()
    fetchRestaurants()

    // Realtime subscriptions
    const packagesChannel = supabase
      .channel('packages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, (payload) => {
        console.log('📦 Paket değişikliği algılandı:', payload)
        fetchPackages()
        fetchDeliveredPackages()
      })
      .subscribe()

    const couriersChannel = supabase
      .channel('couriers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couriers' }, (payload) => {
        console.log('🚴 Kurye değişikliği algılandı:', payload)
        fetchCouriers()
      })
      .subscribe()

    return () => {
      packagesChannel.unsubscribe()
      couriersChannel.unsubscribe()
    }
  }, [isLoggedIn])

  // Courier Effect
  useEffect(() => {
    if (showCourierModal && selectedCourierId) {
      fetchCourierOrders(selectedCourierId)
      fetchCourierDebts(selectedCourierId)
    }
  }, [showCourierModal, selectedCourierId, courierStartDate, courierEndDate])

  // Restaurant Effect
  useEffect(() => {
    if (showRestaurantModal && selectedRestaurantId) {
      fetchRestaurantOrders(selectedRestaurantId)
      fetchRestaurantDebts(selectedRestaurantId)
    }
  }, [showRestaurantModal, selectedRestaurantId, restaurantStartDate, restaurantEndDate])

  // ========== EVENT HANDLERS ==========
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
      localStorage.setItem('admin_logged_in', 'true')
      setIsLoggedIn(true)
      setSuccessMessage('Giriş başarılı!')
      setTimeout(() => setSuccessMessage(''), 2000)
    } else {
      setErrorMessage('Kullanıcı adı veya şifre hatalı!')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleCourierChange = (packageId: number, courierId: string) => {
    setSelectedCouriers(prev => ({ ...prev, [packageId]: courierId }))
  }

  const handleAssignCourier = async (packageId: number) => {
    const courierId = selectedCouriers[packageId]
    if (!courierId) {
      setErrorMessage('Lütfen kurye seçin!')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setAssigningIds(prev => new Set(prev).add(packageId))

    try {
      await assignCourier(packageId, courierId)
      setSuccessMessage('Kurye atandı!')
      setTimeout(() => setSuccessMessage(''), 2000)
      await fetchPackages()
    } catch (error: any) {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setAssigningIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(packageId)
        return newSet
      })
    }
  }

  const handleCancelOrder = async (packageId: number, details: string = '') => {
    try {
      const result = await cancelOrder(packageId, details)
      
      if (result.cancelled) {
        // Kullanıcı iptal etti
        return
      }
      
      if (result.success) {
        console.log('✅ Sipariş iptal edildi, UI güncelleniyor...')
        
        // Local state'i anında güncelle (optimistic update)
        setPackages(prev => prev.map(pkg => 
          pkg.id === packageId 
            ? { ...pkg, status: 'cancelled' as const, courier_id: null, cancelled_at: new Date().toISOString() }
            : pkg
        ))
        
        setSuccessMessage('Sipariş iptal edildi!')
        setTimeout(() => setSuccessMessage(''), 2000)
        
        // Veritabanından da çek (doğrulama için)
        await fetchPackages()
        await fetchDeliveredPackages()
      }
    } catch (error: any) {
      console.error('❌ İptal hatası:', error)
      setErrorMessage(error.message || 'Sipariş iptal edilemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const handleCourierClick = async (courierId: string) => {
    setSelectedCourierId(courierId)
    if (!courierStartDate || !courierEndDate) {
      const today = new Date().toISOString().split('T')[0]
      setCourierStartDate(today)
      setCourierEndDate(today)
    }
    setShowCourierModal(true)
  }

  const handleRestaurantClick = async (restaurantId: number | string) => {
    setSelectedRestaurantId(restaurantId)
    if (!restaurantStartDate || !restaurantEndDate) {
      const today = new Date().toISOString().split('T')[0]
      setRestaurantStartDate(today)
      setRestaurantEndDate(today)
    }
    setShowRestaurantModal(true)
  }

  const handleEndOfDay = async () => {
    if (!selectedCourierId) return
    const amount = parseFloat(endOfDayAmount)
    if (isNaN(amount)) return

    setEndOfDayProcessing(true)
    const summary = calculateCashSummary(selectedCourierOrders)

    const result = await handleEndOfDayService(selectedCourierId, {
      dailyCashTotal: summary.cashTotal,
      amountReceived: amount,
      oldDebts: courierDebts
    })

    if (result.success) {
      setSuccessMessage('Gün sonu başarıyla alındı')
      setShowEndOfDayModal(false)
      setEndOfDayAmount('')
      fetchCouriers()
      fetchCourierDebts(selectedCourierId)
      fetchCourierOrders(selectedCourierId)
    } else {
      setErrorMessage('Gün sonu alınırken hata oluştu')
    }
    setEndOfDayProcessing(false)
  }

  const handlePayDebt = async () => {
    if (!selectedCourierId) return
    const amount = parseFloat(payDebtAmount)
    if (isNaN(amount)) return

    setPayDebtProcessing(true)
    const result = await handlePayDebtService(selectedCourierId, amount, courierDebts)

    if (result.success) {
      setSuccessMessage('Borç ödemesi başarıyla kaydedildi')
      setShowPayDebtModal(false)
      setPayDebtAmount('')
      fetchCouriers()
      fetchCourierDebts(selectedCourierId)
    } else {
      setErrorMessage('Borç ödenirken hata oluştu')
    }
    setPayDebtProcessing(false)
  }

  const handleRestaurantPayment = async () => {
    if (!selectedRestaurantId) return
    const amount = parseFloat(restaurantPaymentAmount)
    if (isNaN(amount)) return

    setRestaurantPaymentProcessing(true)
    const result = await handleRestaurantPaymentService(selectedRestaurantId, {
      totalOrderAmount: selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
      amountPaid: amount,
      orderIds: selectedRestaurantOrders.map(o => o.id)
    })

    if (result.success) {
      setSuccessMessage('Ödeme başarıyla kaydedildi')
      setShowRestaurantPaymentModal(false)
      setRestaurantPaymentAmount('')
      fetchRestaurants()
      fetchRestaurantDebts(selectedRestaurantId)
      fetchRestaurantOrders(selectedRestaurantId)
    } else {
      setErrorMessage('Ödeme kaydedilirken hata oluştu')
    }
    setRestaurantPaymentProcessing(false)
  }

  const handleRestaurantDebtPayment = async () => {
    if (!selectedRestaurantId) return
    const amount = parseFloat(restaurantDebtPayAmount)
    if (isNaN(amount)) return

    setRestaurantDebtPayProcessing(true)
    const result = await handleRestaurantDebtPaymentService(selectedRestaurantId, amount, restaurantDebts)

    if (result.success) {
      setSuccessMessage('Borç ödemesi başarıyla kaydedildi')
      setShowRestaurantDebtPayModal(false)
      setRestaurantDebtPayAmount('')
      fetchRestaurants()
      fetchRestaurantDebts(selectedRestaurantId)
    } else {
      setErrorMessage('Borç ödenirken hata oluştu')
    }
    setRestaurantDebtPayProcessing(false)
  }

  // ========== RENDER ==========
  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-64 h-64 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              Admin Girişi
            </h1>
          </div>
          <input
            type="text"
            placeholder="Kullanıcı Adı"
            className="w-full p-3 mb-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            value={loginForm.username}
            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Şifre"
            className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Giriş Yap
          </button>
          {errorMessage && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="fixed top-4 left-4 z-50 bg-slate-800 text-white p-3 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowMenu(false)}
          />
          <div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6">
            {/* Logo and Title */}
            <div className="mb-8 text-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-24 h-24 mx-auto mb-3"
              />
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            </div>

            {/* Menu Options */}
            <nav className="space-y-2">
              {/* Live Tracking */}
              <button
                onClick={() => {
                  setActiveTab('live')
                  setShowMenu(false)
                  setShowRestaurantSubmenu(false)
                  setShowCourierSubmenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'live'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <span className="mr-3">📦</span>
                Canlı Takip
              </button>

              {/* History */}
              <button
                onClick={() => {
                  setActiveTab('history')
                  setShowMenu(false)
                  setShowRestaurantSubmenu(false)
                  setShowCourierSubmenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <span className="mr-3">📋</span>
                Geçmiş Siparişler
              </button>

              {/* Couriers - With Submenu */}
              <div>
                <button
                  onClick={() => setShowCourierSubmenu(!showCourierSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'couriers'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <span className="mr-3">🚴</span>
                  Kuryeler
                  <span className="float-right">{showCourierSubmenu ? '▼' : '▶'}</span>
                </button>

                {/* Courier Submenu */}
                {showCourierSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('couriers')
                        setCourierSubTab('accounts')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'couriers' && courierSubTab === 'accounts'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      👤 Kurye Hesapları
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('couriers')
                        setCourierSubTab('performance')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'couriers' && courierSubTab === 'performance'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      📊 Kurye Performansları
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('couriers')
                        setCourierSubTab('earnings')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'couriers' && courierSubTab === 'earnings'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      💰 Kurye Kazançları
                    </button>
                  </div>
                )}
              </div>

              {/* Restaurants - With Submenu */}
              <div>
                <button
                  onClick={() => setShowRestaurantSubmenu(!showRestaurantSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'restaurants'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <span className="mr-3">🍽️</span>
                  Restoranlar
                  <span className="float-right">{showRestaurantSubmenu ? '▼' : '▶'}</span>
                </button>

                {/* Restaurant Submenu */}
                {showRestaurantSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('restaurants')
                        setRestaurantSubTab('list')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'restaurants' && restaurantSubTab === 'list'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      📋 Restoranlar Listesi
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('restaurants')
                        setRestaurantSubTab('details')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'restaurants' && restaurantSubTab === 'details'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      📊 Restoran Sipariş Detayları
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('restaurants')
                        setRestaurantSubTab('debt')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'restaurants' && restaurantSubTab === 'debt'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      💳 Restoranların Borcu
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('restaurants')
                        setRestaurantSubTab('payments')
                        setShowMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'restaurants' && restaurantSubTab === 'payments'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      💰 Restoranların Ödemesi
                    </button>
                  </div>
                )}
              </div>
            </nav>

            <button
              onClick={() => {
                localStorage.removeItem('admin_logged_in')
                window.location.href = '/'
              }}
              className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              ← Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* Sticky Navbar */}
      <div className="sticky top-0 z-30 bg-white shadow-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              ADMIN PANEL
            </h1>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Messages */}
          {notificationMessage && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-800 animate-pulse">
              {notificationMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Tab Components */}
          {activeTab === 'live' && (
            <LiveTrackingTab
              packages={packages}
              couriers={couriers}
              isLoading={isLoading}
              selectedCouriers={selectedCouriers}
              assigningIds={assigningIds}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              handleCourierChange={handleCourierChange}
              handleAssignCourier={handleAssignCourier}
              handleCancelOrder={handleCancelOrder}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              deliveredPackages={deliveredPackages}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
              handleCancelOrder={handleCancelOrder}
            />
          )}
          {activeTab === 'couriers' && (
            <CouriersTab
              couriers={couriers}
              courierSubTab={courierSubTab}
              deliveredPackages={deliveredPackages}
              onCourierClick={handleCourierClick}
              courierEarningsFilter={courierEarningsFilter}
              setCourierEarningsFilter={setCourierEarningsFilter}
            />
          )}
          {activeTab === 'restaurants' && (
            <RestaurantsTab
              restaurants={restaurants}
              restaurantSubTab={restaurantSubTab}
              deliveredPackages={deliveredPackages}
              onRestaurantClick={handleRestaurantClick}
              restaurantChartFilter={restaurantChartFilter}
              setRestaurantChartFilter={setRestaurantChartFilter}
              onDebtPayClick={(id) => {
                setSelectedRestaurantId(id)
                fetchRestaurantDebts(id)
                setShowRestaurantDebtPayModal(true)
              }}
            />
          )}
        </div>
      </div>
      <CourierDetailModal
        show={showCourierModal}
        onClose={() => {
          setShowCourierModal(false)
          setSelectedCourierId(null)
        }}
        courier={couriers.find(c => c.id === selectedCourierId)}
        selectedCourierId={selectedCourierId}
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

      <EndOfDayModal
        show={showEndOfDayModal}
        onClose={() => setShowEndOfDayModal(false)}
        courier={couriers.find(c => c.id === selectedCourierId)}
        selectedCourierId={selectedCourierId}
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

      <PayDebtModal
        show={showPayDebtModal}
        onClose={() => setShowPayDebtModal(false)}
        courier={couriers.find(c => c.id === selectedCourierId)}
        selectedCourierId={selectedCourierId}
        payDebtAmount={payDebtAmount}
        setPayDebtAmount={setPayDebtAmount}
        onConfirm={handlePayDebt}
        processing={payDebtProcessing}
        courierDebts={courierDebts}
        loadingDebts={loadingDebts}
      />

      <RestaurantDetailModal
        show={showRestaurantModal}
        onClose={() => {
          setShowRestaurantModal(false)
          setSelectedRestaurantId(null)
          setRestaurantStartDate('')
          setRestaurantEndDate('')
        }}
        restaurant={restaurants.find(r => r.id === selectedRestaurantId)}
        selectedRestaurantId={selectedRestaurantId}
        restaurantStartDate={restaurantStartDate}
        setRestaurantStartDate={setRestaurantStartDate}
        restaurantEndDate={restaurantEndDate}
        setRestaurantEndDate={setRestaurantEndDate}
        onPaymentClick={() => setShowRestaurantPaymentModal(true)}
        selectedRestaurantOrders={selectedRestaurantOrders}
        getPlatformBadgeClass={getPlatformBadgeClass}
        getPlatformDisplayName={getPlatformDisplayName}
      />

      <RestaurantPaymentModal
        show={showRestaurantPaymentModal}
        onClose={() => {
          setShowRestaurantPaymentModal(false)
          setRestaurantPaymentAmount('')
        }}
        restaurant={restaurants.find(r => r.id === selectedRestaurantId)}
        selectedRestaurantId={selectedRestaurantId}
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

      <RestaurantDebtPayModal
        show={showRestaurantDebtPayModal}
        onClose={() => {
          setShowRestaurantDebtPayModal(false)
          setRestaurantDebtPayAmount('')
        }}
        restaurant={restaurants.find(r => r.id === selectedRestaurantId)}
        selectedRestaurantId={selectedRestaurantId}
        restaurantDebtPayAmount={restaurantDebtPayAmount}
        setRestaurantDebtPayAmount={setRestaurantDebtPayAmount}
        onConfirm={handleRestaurantDebtPayment}
        processing={restaurantDebtPayProcessing}
        restaurantDebts={restaurantDebts}
        loadingDebts={loadingRestaurantDebts}
      />
    </div>
  )
}
