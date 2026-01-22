'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Restaurant {
  id: number | string
  name: string
  phone?: string
  address?: string
  totalOrders?: number
  totalRevenue?: number
  totalDebt?: number
}

interface Package {
  id: number
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: string
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card' | null
  restaurant_id?: number | string | null
  restaurant?: Restaurant | null
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  settled_at?: string | null
  courier_name?: string
}

interface Courier {
  id: string
  full_name?: string
  deliveryCount?: number
  todayDeliveryCount?: number
  is_active?: boolean
  activePackageCount?: number
  status?: 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'
  totalDebt?: number
}

interface CourierDebt {
  id: number
  courier_id: string
  debt_date: string
  amount: number
  remaining_amount: number
  status: 'pending' | 'paid'
  created_at: string
}

interface RestaurantDebt {
  id: number
  restaurant_id: number | string
  debt_date: string
  amount: number
  remaining_amount: number
  status: 'pending' | 'paid'
  created_at: string
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'couriers' | 'restaurants'>('live')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [showCourierModal, setShowCourierModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedCouriers, setSelectedCouriers] = useState<{ [key: number]: string }>({})
  const [assigningIds, setAssigningIds] = useState<Set<number>>(new Set())
  const [restaurantFilter, setRestaurantFilter] = useState<number | null>(null)
  const [lastPackageIds, setLastPackageIds] = useState<Set<number>>(new Set())
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [newOrderDetails, setNewOrderDetails] = useState<Package | null>(null)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [courierStartDate, setCourierStartDate] = useState('')
  const [courierEndDate, setCourierEndDate] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showRestaurantSubmenu, setShowRestaurantSubmenu] = useState(false)
  const [restaurantSubTab, setRestaurantSubTab] = useState<'list' | 'details' | 'debt' | 'payments'>('list')
  const [showCourierSubmenu, setShowCourierSubmenu] = useState(false)
  const [courierSubTab, setCourierSubTab] = useState<'accounts' | 'performance' | 'earnings'>('accounts')
  const [darkMode, setDarkMode] = useState(true) // Varsayılan dark mode
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')
  const [courierEarningsFilter, setCourierEarningsFilter] = useState<'today' | 'week' | 'month'>('today')
  const [restaurantDebtFilter, setRestaurantDebtFilter] = useState<'today' | 'week' | 'month'>('today')
  
  // Gün Sonu State'leri
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [endOfDayAmount, setEndOfDayAmount] = useState('')
  const [endOfDayProcessing, setEndOfDayProcessing] = useState(false)
  const [courierDebts, setCourierDebts] = useState<CourierDebt[]>([])
  const [loadingDebts, setLoadingDebts] = useState(false)
  
  // Borç Ödeme State'leri
  const [showPayDebtModal, setShowPayDebtModal] = useState(false)
  const [payDebtAmount, setPayDebtAmount] = useState('')
  const [payDebtProcessing, setPayDebtProcessing] = useState(false)

  // Restoran Ödeme State'leri
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | string | null>(null)
  const [selectedRestaurantOrders, setSelectedRestaurantOrders] = useState<Package[]>([])
  const [showRestaurantModal, setShowRestaurantModal] = useState(false)
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

  // Build-safe mount kontrolü
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ÇELİK GİBİ OTURUM KONTROLÜ - SADECE KENDİ OTURUMUNA BAK!
  useEffect(() => {
    const checkAuthAndRedirect = () => {
      // Build sırasında çalışmasın
      if (typeof window === 'undefined') return
      
      // Mount olmadan kontrol yapma
      if (!isMounted) return

      setIsCheckingAuth(true)

      try {
        // SADECE admin oturumunu kontrol et
        const adminLoggedIn = localStorage.getItem('admin_logged_in')

        if (adminLoggedIn === 'true') {
          // Admin oturumu var, BURADA KAL!
          setIsLoggedIn(true)
        } else {
          // Admin oturumu yok, giriş ekranını göster
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.error('Auth kontrolü hatası:', error)
        setIsLoggedIn(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthAndRedirect()
  }, [isMounted])

  // Bildirim sesi çal - Sadece yeni paket INSERT'inde
  const playNotificationSound = () => {
    if (typeof window === 'undefined') return
    
    try {
      const audio = new Audio(`/notification.mp3?t=${Date.now()}`)
      audio.volume = 0.7
      audio.play().catch((err) => console.error('Ses çalma hatası:', err))
    } catch (err) {
      console.error('Ses hatası:', err)
    }
  }

  const fetchPackages = async () => {
    setErrorMessage('') // Önceki hataları temizle
    
    try {
      // Bugün (gece 00:00'dan itibaren)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(*)')
        .in('status', ['waiting', 'assigned', 'picking_up', 'on_the_way'])
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

      // Yeni paket kontrolü - ID bazlı
      const currentIds = new Set(transformedData.map(p => p.id))
      
      // Sadece gerçekten yeni eklenen paketleri bul (ID'si daha önce hiç görülmemiş)
      const newPackages = transformedData.filter(p => !lastPackageIds.has(p.id))
      
      // Bildirim: Sadece lastPackageIds dolu ise (ilk yükleme değilse) ve gerçekten yeni paket varsa
      // VE paket sayısı artmışsa (durum değişikliği değil, yeni paket)
      const isReallyNewPackage = newPackages.length > 0 && 
                                  lastPackageIds.size > 0 && 
                                  transformedData.length > packages.length
      
      if (isReallyNewPackage) {
        playNotificationSound()
        setNewOrderDetails(newPackages[0])
        setShowNotificationPopup(true)
        setTimeout(() => setShowNotificationPopup(false), 8000)
      }
      
      setLastPackageIds(currentIds)
      setPackages(transformedData)
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return // Eski veriler ekranda kalsın
      }
      
      console.error('Siparişler yüklenirken hata:', error)
      setErrorMessage('Siparişler yüklenirken hata: ' + error.message)
    }
  }

  const fetchDeliveredPackages = async () => {
    try {
      // TÜM delivered paketleri çek (filtresiz)
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(*), couriers(*)')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        courier_name: pkg.couriers?.full_name,
        restaurants: undefined,
        couriers: undefined
      }))

      setDeliveredPackages(transformedData)
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      console.error('Geçmiş siparişler yüklenirken hata:', error.message)
    }
  }

  const fetchCouriers = async () => {
    setErrorMessage('') // Önceki hataları temizle
    
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      
      if (!data || data.length === 0) {
        setCouriers([])
        return
      }
      
      const couriersData = data.map(courier => ({
        ...courier,
        id: courier.id,
        full_name: courier.full_name || 'İsimsiz Kurye',
        is_active: Boolean(courier.is_active),
        deliveryCount: 0,
        todayDeliveryCount: 0,
        activePackageCount: 0
      }))
      
      setCouriers(couriersData)
      
      // Paket sayılarını ayrı olarak çek
      if (couriersData.length > 0) {
        const ids = couriersData.map(c => c.id)
        await Promise.all([
          fetchCourierDeliveryCounts(ids),
          fetchCourierTodayDeliveryCounts(ids),
          fetchCourierActivePackageCounts(ids),
          fetchCourierDebtsTotal(ids)
        ])
      }
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      setErrorMessage('Kuryeler yüklenemedi: ' + error.message)
    }
  }

  const fetchCourierActivePackageCounts = async (courierIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('courier_id')
        .in('courier_id', courierIds)
        .neq('status', 'delivered')

      if (error) throw error

      const counts: { [key: string]: number } = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        activePackageCount: counts[c.id] || 0 
      })))
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      console.error('Aktif paket sayıları alınırken hata:', error)
    }
  }

  const fetchCourierDeliveryCounts = async (courierIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('courier_id')
        .eq('status', 'delivered')
        .in('courier_id', courierIds)

      if (error) throw error

      const counts: { [key: string]: number } = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        deliveryCount: counts[c.id] || 0 
      })))
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      console.error('Kurye teslimat sayıları alınırken hata:', error)
    }
  }

  const fetchCourierTodayDeliveryCounts = async (courierIds: string[]) => {
    try {
      // Bugün (gece 00:00'dan itibaren) - UTC formatında
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      // Yarın (gece 00:00) - Bugünün bitiş saati
      const tomorrowStart = new Date(todayStart)
      tomorrowStart.setDate(tomorrowStart.getDate() + 1)
      
      const { data, error } = await supabase
        .from('packages')
        .select('courier_id, delivered_at')
        .eq('status', 'delivered')
        .in('courier_id', courierIds)
        .gte('delivered_at', todayStart.toISOString())
        .lt('delivered_at', tomorrowStart.toISOString())
        .not('delivered_at', 'is', null)

      if (error) throw error

      const counts: { [key: string]: number } = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        todayDeliveryCount: counts[c.id] || 0 
      })))
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      console.error('Kurye bugünkü teslimat sayıları alınırken hata:', error)
    }
  }

  // Kurye toplam borçlarını çek
  const fetchCourierDebtsTotal = async (courierIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('courier_debts')
        .select('courier_id, remaining_amount')
        .eq('status', 'pending')
        .in('courier_id', courierIds)

      if (error) throw error

      const debts: { [key: string]: number } = {}
      data?.forEach((debt) => { 
        if (debt.courier_id) {
          debts[debt.courier_id] = (debts[debt.courier_id] || 0) + debt.remaining_amount
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        totalDebt: debts[c.id] || 0 
      })))
    } catch (error: any) {
      // Tablo yoksa veya internet hatası varsa sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', error.message)
        // Borç bilgisi olmadan devam et
        setCouriers(prev => prev.map(c => ({ ...c, totalDebt: 0 })))
        return
      }
      
      console.error('Kurye borçları alınırken hata:', error)
    }
  }

  // Kurye borçlarını çek
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
      const errorMsg = error.message?.toLowerCase() || ''
      // Tablo yoksa veya internet hatası varsa sessizce geç
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', error.message)
        setCourierDebts([]) // Boş liste göster
        return
      }
      console.error('Borçlar yüklenemedi:', error)
      setErrorMessage('Borçlar yüklenemedi: ' + error.message)
    } finally {
      setLoadingDebts(false)
    }
  }

  // Gün sonu işlemi
  const handleEndOfDay = async () => {
    if (!selectedCourierId) return
    
    const amountReceived = parseFloat(endOfDayAmount)
    if (isNaN(amountReceived) || amountReceived < 0) {
      setErrorMessage('Geçerli bir tutar girin!')
      return
    }

    setEndOfDayProcessing(true)
    
    try {
      // 1. Seçilen tarih aralığındaki nakit toplamı hesapla
      if (!courierStartDate || !courierEndDate) {
        setErrorMessage('Tarih aralığı seçilmemiş!')
        setEndOfDayProcessing(false)
        return
      }
      
      const start = new Date(courierStartDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(courierEndDate)
      end.setHours(23, 59, 59, 999)
      
      const { data: rangePackages, error: packagesError } = await supabase
        .from('packages')
        .select('amount, payment_method')
        .eq('courier_id', selectedCourierId)
        .eq('status', 'delivered')
        .gte('delivered_at', start.toISOString())
        .lte('delivered_at', end.toISOString())

      if (packagesError) throw packagesError

      const rangeCashTotal = rangePackages?.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      const rangeCardTotal = rangePackages?.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      
      // 2. Geçmiş borçları çek
      const totalOldDebt = courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
      
      // 3. Genel toplam = Seçilen tarih aralığındaki nakit + Kart + Eski borçlar
      const grandTotal = rangeCashTotal + rangeCardTotal + totalOldDebt
      
      // 4. Fark hesapla
      const difference = amountReceived - grandTotal
      
      // 5. İşlem kaydet
      const transactionDate = courierEndDate // Bitiş tarihini işlem tarihi olarak kullan
      const settledTimestamp = new Date().toISOString() // Şu anki zaman damgası
      
      if (difference < 0) {
        // AÇIK VAR - Yeni borç oluştur
        const debtAmount = Math.abs(difference)
        
        // Önce eski borçları öde (varsa)
        let remainingPayment = amountReceived
        
        for (const debt of courierDebts) {
          if (remainingPayment <= 0) break
          
          if (remainingPayment >= debt.remaining_amount) {
            // Borç tamamen ödendi
            await supabase
              .from('courier_debts')
              .update({ 
                remaining_amount: 0,
                status: 'paid'
              })
              .eq('id', debt.id)
            
            remainingPayment -= debt.remaining_amount
          } else {
            // Kısmi ödeme
            await supabase
              .from('courier_debts')
              .update({ 
                remaining_amount: debt.remaining_amount - remainingPayment
              })
              .eq('id', debt.id)
            
            remainingPayment = 0
          }
        }
        
        // Yeni borç kaydı oluştur (bitiş tarihinden kalan)
        const { error: debtError } = await supabase
          .from('courier_debts')
          .insert({
            courier_id: selectedCourierId,
            debt_date: transactionDate,
            amount: debtAmount,
            remaining_amount: debtAmount,
            status: 'pending'
          })
        
        if (debtError) throw debtError
        
        // Seçilen tarih aralığındaki paketleri "kapatıldı" olarak işaretle
        await supabase
          .from('packages')
          .update({ settled_at: settledTimestamp })
          .eq('courier_id', selectedCourierId)
          .eq('status', 'delivered')
          .gte('delivered_at', start.toISOString())
          .lte('delivered_at', end.toISOString())
          .is('settled_at', null) // Sadece henüz kapatılmamış olanları
        
        // Transaction kaydı
        await supabase
          .from('debt_transactions')
          .insert({
            courier_id: selectedCourierId,
            transaction_date: transactionDate,
            daily_cash_total: rangeCashTotal,
            amount_received: amountReceived,
            new_debt_amount: debtAmount,
            payment_to_debts: amountReceived,
            notes: `${formatTurkishDate(transactionDate)} tarihinden kalan ${debtAmount.toFixed(2)} TL açık (Nakit: ${rangeCashTotal.toFixed(2)} TL + Kart: ${rangeCardTotal.toFixed(2)} TL, ${courierStartDate} - ${courierEndDate} arası)`
          })
        
        setSuccessMessage(`✅ Gün sonu alındı. ${debtAmount.toFixed(2)} TL açık kaydedildi.`)
      } else {
        // BAHŞİŞ VAR veya TAM - Eski borçları öde
        let remainingPayment = amountReceived
        
        for (const debt of courierDebts) {
          if (remainingPayment <= 0) break
          
          if (remainingPayment >= debt.remaining_amount) {
            // Borç tamamen ödendi
            await supabase
              .from('courier_debts')
              .update({ 
                remaining_amount: 0,
                status: 'paid'
              })
              .eq('id', debt.id)
            
            remainingPayment -= debt.remaining_amount
          } else {
            // Kısmi ödeme
            await supabase
              .from('courier_debts')
              .update({ 
                remaining_amount: debt.remaining_amount - remainingPayment
              })
              .eq('id', debt.id)
            
            remainingPayment = 0
          }
        }
        
        // Seçilen tarih aralığındaki paketleri "kapatıldı" olarak işaretle
        await supabase
          .from('packages')
          .update({ settled_at: settledTimestamp })
          .eq('courier_id', selectedCourierId)
          .eq('status', 'delivered')
          .gte('delivered_at', start.toISOString())
          .lte('delivered_at', end.toISOString())
          .is('settled_at', null) // Sadece henüz kapatılmamış olanları
        
        // Transaction kaydı
        await supabase
          .from('debt_transactions')
          .insert({
            courier_id: selectedCourierId,
            transaction_date: transactionDate,
            daily_cash_total: rangeCashTotal,
            amount_received: amountReceived,
            new_debt_amount: 0,
            payment_to_debts: amountReceived - remainingPayment,
            notes: difference > 0 
              ? `${difference.toFixed(2)} TL bahşiş (Nakit: ${rangeCashTotal.toFixed(2)} TL + Kart: ${rangeCardTotal.toFixed(2)} TL, ${courierStartDate} - ${courierEndDate} arası)` 
              : `Tam ödeme (Nakit: ${rangeCashTotal.toFixed(2)} TL + Kart: ${rangeCardTotal.toFixed(2)} TL, ${courierStartDate} - ${courierEndDate} arası)`
          })
        
        setSuccessMessage(
          difference > 0 
            ? `✅ Gün sonu alındı. ${difference.toFixed(2)} TL bahşiş!` 
            : '✅ Gün sonu alındı. Tam ödeme.'
        )
      }
      
      // Modal'ı kapat ve verileri yenile
      setShowEndOfDayModal(false)
      setEndOfDayAmount('')
      await fetchCourierDebts(selectedCourierId)
      await fetchCouriers() // Kurye listesindeki borç bilgisini güncelle
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Gün sonu işlemi hatası:', error)
      const errorMsg = error.message?.toLowerCase() || ''
      
      // Tablo yoksa özel mesaj
      if (errorMsg.includes('could not find') || 
          errorMsg.includes('table') || 
          errorMsg.includes('schema cache')) {
        setErrorMessage('⚠️ Veritabanı tabloları henüz oluşturulmamış! Lütfen database_migration_courier_debts.sql dosyasını Supabase SQL Editor\'de çalıştırın.')
      } else {
        setErrorMessage('Gün sonu işlemi başarısız: ' + error.message)
      }
      
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setEndOfDayProcessing(false)
    }
  }

  // Borç ödeme işlemi
  const handlePayDebt = async () => {
    if (!selectedCourierId) return
    
    const paymentAmount = parseFloat(payDebtAmount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setErrorMessage('Geçerli bir tutar girin!')
      return
    }

    setPayDebtProcessing(true)
    
    try {
      const totalDebt = courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
      
      if (paymentAmount > totalDebt) {
        setErrorMessage(`Ödeme tutarı toplam borçtan fazla olamaz! (Toplam Borç: ${totalDebt.toFixed(2)} ₺)`)
        setPayDebtProcessing(false)
        return
      }
      
      let remainingPayment = paymentAmount
      const today = new Date().toISOString().split('T')[0]
      
      // Eski borçları en eskiden başlayarak öde
      for (const debt of courierDebts) {
        if (remainingPayment <= 0) break
        
        if (remainingPayment >= debt.remaining_amount) {
          // Borç tamamen ödendi
          await supabase
            .from('courier_debts')
            .update({ 
              remaining_amount: 0,
              status: 'paid'
            })
            .eq('id', debt.id)
          
          remainingPayment -= debt.remaining_amount
        } else {
          // Kısmi ödeme
          await supabase
            .from('courier_debts')
            .update({ 
              remaining_amount: debt.remaining_amount - remainingPayment
            })
            .eq('id', debt.id)
          
          remainingPayment = 0
        }
      }
      
      // Eğer tüm eski borçlar ödendiyse ama hala ödeme eksikse, yeni borç oluştur
      const newDebtAmount = totalDebt - paymentAmount
      
      if (newDebtAmount > 0) {
        // Önce tüm eski borçları tamamen kapat (status = paid)
        await supabase
          .from('courier_debts')
          .update({ 
            remaining_amount: 0,
            status: 'paid'
          })
          .eq('courier_id', selectedCourierId)
          .eq('status', 'pending')
        
        // Sonra kalan tutarı yeni borç olarak ekle
        await supabase
          .from('courier_debts')
          .insert({
            courier_id: selectedCourierId,
            debt_date: today,
            amount: newDebtAmount,
            remaining_amount: newDebtAmount,
            status: 'pending'
          })
      }
      
      // Transaction kaydı
      await supabase
        .from('debt_transactions')
        .insert({
          courier_id: selectedCourierId,
          transaction_date: today,
          daily_cash_total: 0,
          amount_received: paymentAmount,
          new_debt_amount: paymentAmount < totalDebt ? (totalDebt - paymentAmount) : 0,
          payment_to_debts: paymentAmount,
          notes: `Borç ödemesi: ${paymentAmount.toFixed(2)} ₺ ödendi${paymentAmount < totalDebt ? `, ${(totalDebt - paymentAmount).toFixed(2)} ₺ kalan borç ${formatTurkishDate(today)} tarihine aktarıldı` : ''}`
        })
      
      setSuccessMessage(`✅ Borç ödemesi alındı. ${paymentAmount.toFixed(2)} ₺ ödendi.`)
      
      // Modal'ı kapat ve verileri yenile
      setShowPayDebtModal(false)
      setPayDebtAmount('')
      await fetchCourierDebts(selectedCourierId)
      await fetchCouriers() // Kurye listesindeki borç bilgisini güncelle
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Borç ödeme işlemi hatası:', error)
      const errorMsg = error.message?.toLowerCase() || ''
      
      if (errorMsg.includes('could not find') || 
          errorMsg.includes('table') || 
          errorMsg.includes('schema cache')) {
        setErrorMessage('⚠️ Veritabanı tabloları henüz oluşturulmamış! Lütfen database_migration_courier_debts.sql dosyasını Supabase SQL Editor\'de çalıştırın.')
      } else {
        setErrorMessage('Borç ödeme işlemi başarısız: ' + error.message)
      }
      
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setPayDebtProcessing(false)
    }
  }

  // ============================================
  // RESTORAN ÖDEME VE BORÇ YÖNETİMİ FONKSİYONLARI
  // ============================================

  // Restoran siparişlerini çek
  const fetchRestaurantOrders = async (restaurantId: number | string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, couriers(full_name)')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      // Tarih aralığı filtresine göre sorgu ekle
      if (restaurantStartDate && restaurantEndDate) {
        const start = new Date(restaurantStartDate)
        start.setHours(0, 0, 0, 0)
        
        const end = new Date(restaurantEndDate)
        end.setHours(23, 59, 59, 999)
        
        query = query
          .gte('delivered_at', start.toISOString())
          .lte('delivered_at', end.toISOString())
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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      console.error('Restoran siparişleri yüklenirken hata:', error.message)
    }
  }

  // Restoran borçlarını çek
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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', error.message)
        setRestaurantDebts([])
        return
      }
      console.error('Borçlar yüklenemedi:', error)
      setErrorMessage('Borçlar yüklenemedi: ' + error.message)
    } finally {
      setLoadingRestaurantDebts(false)
    }
  }

  // Restoran detaylarını göster
  const handleRestaurantClick = async (restaurantId: number | string) => {
    setSelectedRestaurantId(restaurantId)
    setShowRestaurantModal(true)
    
    // Tarih aralığı yoksa bugünü varsayılan olarak ayarla
    if (!restaurantStartDate || !restaurantEndDate) {
      const today = new Date().toISOString().split('T')[0]
      setRestaurantStartDate(today)
      setRestaurantEndDate(today)
    }
    
    await fetchRestaurantOrders(restaurantId)
    await fetchRestaurantDebts(restaurantId)
  }

  // Restoran hesap ödeme işlemi
  const handleRestaurantPayment = async () => {
    if (!selectedRestaurantId) return
    
    const paymentAmount = parseFloat(restaurantPaymentAmount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setErrorMessage('Geçerli bir tutar girin!')
      return
    }

    setRestaurantPaymentProcessing(true)
    
    try {
      if (!restaurantStartDate || !restaurantEndDate) {
        setErrorMessage('Tarih aralığı seçilmemiş!')
        setRestaurantPaymentProcessing(false)
        return
      }
      
      const start = new Date(restaurantStartDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(restaurantEndDate)
      end.setHours(23, 59, 59, 999)
      
      // Seçilen tarih aralığındaki toplam sipariş tutarını hesapla
      const { data: rangePackages, error: packagesError } = await supabase
        .from('packages')
        .select('amount')
        .eq('restaurant_id', selectedRestaurantId)
        .eq('status', 'delivered')
        .gte('delivered_at', start.toISOString())
        .lte('delivered_at', end.toISOString())

      if (packagesError) throw packagesError

      const totalOrderAmount = rangePackages?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      
      // Geçmiş borçları çek
      const totalOldDebt = restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
      
      // Genel toplam = Seçilen tarih aralığındaki sipariş tutarı + Eski borçlar
      const grandTotal = totalOrderAmount + totalOldDebt
      
      // Hata kontrolü: Fazla ödeme
      if (paymentAmount > grandTotal) {
        setErrorMessage(`⚠️ Fazla tutar girdiniz, lütfen ödemeyi kontrol edin! (Toplam Borç: ${grandTotal.toFixed(2)} ₺)`)
        setRestaurantPaymentProcessing(false)
        return
      }
      
      // Fark hesapla
      const difference = grandTotal - paymentAmount
      
      const transactionDate = restaurantEndDate
      const settledTimestamp = new Date().toISOString()
      
      if (difference > 0) {
        // EKSİK ÖDEME - Yeni borç oluştur
        const debtAmount = difference
        
        // Önce eski borçları öde (varsa)
        let remainingPayment = paymentAmount
        
        for (const debt of restaurantDebts) {
          if (remainingPayment <= 0) break
          
          if (remainingPayment >= debt.remaining_amount) {
            await supabase
              .from('restaurant_debts')
              .update({ 
                remaining_amount: 0,
                status: 'paid'
              })
              .eq('id', debt.id)
            
            remainingPayment -= debt.remaining_amount
          } else {
            await supabase
              .from('restaurant_debts')
              .update({ 
                remaining_amount: debt.remaining_amount - remainingPayment
              })
              .eq('id', debt.id)
            
            remainingPayment = 0
          }
        }
        
        // Yeni borç kaydı oluştur
        const { error: debtError } = await supabase
          .from('restaurant_debts')
          .insert({
            restaurant_id: selectedRestaurantId,
            debt_date: transactionDate,
            amount: debtAmount,
            remaining_amount: debtAmount,
            status: 'pending'
          })
        
        if (debtError) throw debtError
        
        // Seçilen tarih aralığındaki paketleri "kapatıldı" olarak işaretle
        await supabase
          .from('packages')
          .update({ restaurant_settled_at: settledTimestamp })
          .eq('restaurant_id', selectedRestaurantId)
          .eq('status', 'delivered')
          .gte('delivered_at', start.toISOString())
          .lte('delivered_at', end.toISOString())
          .is('restaurant_settled_at', null)
        
        // Transaction kaydı
        await supabase
          .from('restaurant_payment_transactions')
          .insert({
            restaurant_id: selectedRestaurantId,
            transaction_date: transactionDate,
            total_order_amount: totalOrderAmount,
            amount_paid: paymentAmount,
            new_debt_amount: debtAmount,
            payment_to_debts: paymentAmount,
            notes: `${formatTurkishDate(transactionDate)} tarihinden kalan ${debtAmount.toFixed(2)} TL borç (${restaurantStartDate} - ${restaurantEndDate} arası)`
          })
        
        setSuccessMessage(`✅ Ödeme alındı. ${debtAmount.toFixed(2)} TL borç kaydedildi.`)
      } else {
        // TAM ÖDEME - Eski borçları öde
        let remainingPayment = paymentAmount
        
        for (const debt of restaurantDebts) {
          if (remainingPayment <= 0) break
          
          if (remainingPayment >= debt.remaining_amount) {
            await supabase
              .from('restaurant_debts')
              .update({ 
                remaining_amount: 0,
                status: 'paid'
              })
              .eq('id', debt.id)
            
            remainingPayment -= debt.remaining_amount
          } else {
            await supabase
              .from('restaurant_debts')
              .update({ 
                remaining_amount: debt.remaining_amount - remainingPayment
              })
              .eq('id', debt.id)
            
            remainingPayment = 0
          }
        }
        
        // Seçilen tarih aralığındaki paketleri "kapatıldı" olarak işaretle
        await supabase
          .from('packages')
          .update({ restaurant_settled_at: settledTimestamp })
          .eq('restaurant_id', selectedRestaurantId)
          .eq('status', 'delivered')
          .gte('delivered_at', start.toISOString())
          .lte('delivered_at', end.toISOString())
          .is('restaurant_settled_at', null)
        
        // Transaction kaydı
        await supabase
          .from('restaurant_payment_transactions')
          .insert({
            restaurant_id: selectedRestaurantId,
            transaction_date: transactionDate,
            total_order_amount: totalOrderAmount,
            amount_paid: paymentAmount,
            new_debt_amount: 0,
            payment_to_debts: paymentAmount - remainingPayment,
            notes: `Tam ödeme (${restaurantStartDate} - ${restaurantEndDate} arası)`
          })
        
        setSuccessMessage('✅ Ödeme alındı. Hesap tam olarak kapatıldı.')
      }
      
      // Modal'ı kapat ve verileri yenile
      setShowRestaurantPaymentModal(false)
      setRestaurantPaymentAmount('')
      await fetchRestaurantDebts(selectedRestaurantId)
      await fetchRestaurants()
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Ödeme işlemi hatası:', error)
      const errorMsg = error.message?.toLowerCase() || ''
      
      if (errorMsg.includes('could not find') || 
          errorMsg.includes('table') || 
          errorMsg.includes('schema cache')) {
        setErrorMessage('⚠️ Veritabanı tabloları henüz oluşturulmamış! Lütfen database_migration_restaurant_debts.sql dosyasını Supabase SQL Editor\'de çalıştırın.')
      } else {
        setErrorMessage('Ödeme işlemi başarısız: ' + error.message)
      }
      
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setRestaurantPaymentProcessing(false)
    }
  }

  // Restoran borç ödeme işlemi
  const handleRestaurantDebtPayment = async () => {
    if (!selectedRestaurantId) return
    
    const paymentAmount = parseFloat(restaurantDebtPayAmount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setErrorMessage('Geçerli bir tutar girin!')
      return
    }

    setRestaurantDebtPayProcessing(true)
    
    try {
      const totalDebt = restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
      
      if (paymentAmount > totalDebt) {
        setErrorMessage(`Ödeme tutarı toplam borçtan fazla olamaz! (Toplam Borç: ${totalDebt.toFixed(2)} ₺)`)
        setRestaurantDebtPayProcessing(false)
        return
      }
      
      let remainingPayment = paymentAmount
      const today = new Date().toISOString().split('T')[0]
      
      // Eski borçları en eskiden başlayarak öde
      for (const debt of restaurantDebts) {
        if (remainingPayment <= 0) break
        
        if (remainingPayment >= debt.remaining_amount) {
          await supabase
            .from('restaurant_debts')
            .update({ 
              remaining_amount: 0,
              status: 'paid'
            })
            .eq('id', debt.id)
          
          remainingPayment -= debt.remaining_amount
        } else {
          await supabase
            .from('restaurant_debts')
            .update({ 
              remaining_amount: debt.remaining_amount - remainingPayment
            })
            .eq('id', debt.id)
          
          remainingPayment = 0
        }
      }
      
      // Eğer tüm eski borçlar ödendiyse ama hala ödeme eksikse, yeni borç oluştur
      const newDebtAmount = totalDebt - paymentAmount
      
      if (newDebtAmount > 0) {
        // Önce tüm eski borçları tamamen kapat
        await supabase
          .from('restaurant_debts')
          .update({ 
            remaining_amount: 0,
            status: 'paid'
          })
          .eq('restaurant_id', selectedRestaurantId)
          .eq('status', 'pending')
        
        // Sonra kalan tutarı yeni borç olarak ekle
        await supabase
          .from('restaurant_debts')
          .insert({
            restaurant_id: selectedRestaurantId,
            debt_date: today,
            amount: newDebtAmount,
            remaining_amount: newDebtAmount,
            status: 'pending'
          })
      }
      
      // Transaction kaydı
      await supabase
        .from('restaurant_payment_transactions')
        .insert({
          restaurant_id: selectedRestaurantId,
          transaction_date: today,
          total_order_amount: 0,
          amount_paid: paymentAmount,
          new_debt_amount: paymentAmount < totalDebt ? (totalDebt - paymentAmount) : 0,
          payment_to_debts: paymentAmount,
          notes: `Borç ödemesi: ${paymentAmount.toFixed(2)} ₺ ödendi${paymentAmount < totalDebt ? `, ${(totalDebt - paymentAmount).toFixed(2)} ₺ kalan borç ${formatTurkishDate(today)} tarihine aktarıldı` : ''}`
        })
      
      setSuccessMessage(`✅ Borç ödemesi alındı. ${paymentAmount.toFixed(2)} ₺ ödendi.`)
      
      // Modal'ı kapat ve verileri yenile
      setShowRestaurantDebtPayModal(false)
      setRestaurantDebtPayAmount('')
      await fetchRestaurantDebts(selectedRestaurantId)
      await fetchRestaurants()
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Borç ödeme işlemi hatası:', error)
      const errorMsg = error.message?.toLowerCase() || ''
      
      if (errorMsg.includes('could not find') || 
          errorMsg.includes('table') || 
          errorMsg.includes('schema cache')) {
        setErrorMessage('⚠️ Veritabanı tabloları henüz oluşturulmamış! Lütfen database_migration_restaurant_debts.sql dosyasını Supabase SQL Editor\'de çalıştırın.')
      } else {
        setErrorMessage('Borç ödeme işlemi başarısız: ' + error.message)
      }
      
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setRestaurantDebtPayProcessing(false)
    }
  }

  // Restoran tarih değiştiğinde siparişleri yenile
  useEffect(() => {
    if (selectedRestaurantId && restaurantStartDate && restaurantEndDate) {
      fetchRestaurantOrders(selectedRestaurantId)
    }
  }, [selectedRestaurantId, restaurantStartDate, restaurantEndDate])

  // fetchCourierStatuses fonksiyonu kaldırıldı - artık fetchCouriers'da tüm bilgiler geliyor

  const handleAssignCourier = async (packageId: number) => {
    setSelectedCouriers(currentState => {
      const courierId = currentState[packageId];
      
      if (!courierId) {
        alert('Lütfen önce bir kurye seçin!');
        return currentState;
      }
      
      // Async işlemi başlat
      (async () => {
        try {
          setAssigningIds(prev => new Set(prev).add(packageId));
          
          const { error } = await supabase.from('packages').update({
            courier_id: courierId,
            status: 'assigned',
            assigned_at: new Date().toISOString()
          }).eq('id', packageId);
          
          if (error) throw error;
          
          setSuccessMessage('Kurye atandı!');
          fetchPackages(); 
          fetchCouriers();
        } catch (error: any) { 
          setErrorMessage(error.message);
        } finally { 
          setAssigningIds(prev => { const n = new Set(prev); n.delete(packageId); return n });
        }
      })();
      
      return currentState;
    });
  }

  useEffect(() => {
    if (isLoggedIn) {
      // İlk yükleme
      setIsLoading(true)
      fetchPackages().then(() => {
        fetchCouriers()
        fetchRestaurants()
        fetchDeliveredPackages() // Her zaman çek, tüm sekmeler için gerekli
        setIsLoading(false)
      })
    }
  }, [isLoggedIn])

  // Realtime için ayrı useEffect - Sadece INSERT'lerde bildirim
  useEffect(() => {
    if (!isLoggedIn || !isMounted) return

    const channel = supabase
      .channel('admin-realtime-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'packages' },
        () => {
          fetchPackages() // Yeni paket geldi, ses çalacak
          fetchCouriers()
          fetchDeliveredPackages()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'packages' },
        () => {
          fetchPackages() // Güncelleme, ses çalmayacak (lastPackageIds değişmedi)
          fetchCouriers()
          fetchDeliveredPackages()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couriers' },
        () => {
          fetchCouriers()
        }
      )
      .subscribe()

    // Fallback polling - 30 saniyede bir
    const interval = setInterval(() => {
      fetchPackages()
      fetchCouriers()
      fetchDeliveredPackages()
    }, 30000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [isLoggedIn, isMounted])

  // Kurye modal tarih filtresi değiştiğinde yeniden çek
  useEffect(() => {
    if (showCourierModal && selectedCourierId) {
      fetchCourierOrders(selectedCourierId)
    }
  }, [showCourierModal, selectedCourierId])

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, phone, address')
        .order('name', { ascending: true })

      if (error) throw error
      
      if (!data || data.length === 0) {
        setRestaurants([])
        return
      }
      
      const restaurantsData = data.map(restaurant => ({
        ...restaurant,
        totalOrders: 0,
        totalRevenue: 0,
        totalDebt: 0
      }))
      
      setRestaurants(restaurantsData)
      
      // Restoran istatistiklerini ayrı olarak çek
      if (restaurantsData.length > 0) {
        const ids = restaurantsData.map(r => r.id)
        await Promise.all([
          fetchRestaurantStats(ids),
          fetchRestaurantDebtsTotal(ids)
        ])
      }
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      console.error('Restoranlar yüklenemedi:', error)
    }
  }

  // Restoran istatistiklerini çek
  const fetchRestaurantStats = async (restaurantIds: (number | string)[]) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('restaurant_id, amount')
        .eq('status', 'delivered')
        .in('restaurant_id', restaurantIds)

      if (error) throw error

      const stats: { [key: string]: { count: number, revenue: number } } = {}
      data?.forEach((pkg) => {
        if (pkg.restaurant_id) {
          const key = String(pkg.restaurant_id)
          if (!stats[key]) {
            stats[key] = { count: 0, revenue: 0 }
          }
          stats[key].count += 1
          stats[key].revenue += pkg.amount || 0
        }
      })

      setRestaurants(prev => prev.map(r => ({
        ...r,
        totalOrders: stats[String(r.id)]?.count || 0,
        totalRevenue: stats[String(r.id)]?.revenue || 0
      })))
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      console.error('Restoran istatistikleri alınırken hata:', error)
    }
  }

  // Restoran toplam borçlarını çek
  const fetchRestaurantDebtsTotal = async (restaurantIds: (number | string)[]) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_debts')
        .select('restaurant_id, remaining_amount')
        .eq('status', 'pending')
        .in('restaurant_id', restaurantIds)

      if (error) throw error

      const debts: { [key: string]: number } = {}
      data?.forEach((debt) => {
        if (debt.restaurant_id) {
          const key = String(debt.restaurant_id)
          debts[key] = (debts[key] || 0) + debt.remaining_amount
        }
      })

      setRestaurants(prev => prev.map(r => ({
        ...r,
        totalDebt: debts[String(r.id)] || 0
      })))
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', error.message)
        setRestaurants(prev => prev.map(r => ({ ...r, totalDebt: 0 })))
        return
      }
      console.error('Restoran borçları alınırken hata:', error)
    }
  }

  const handleCourierChange = (packageId: number, courierId: string) => {
    setSelectedCouriers(prev => ({ ...prev, [packageId]: courierId }))
  }

  // Türkiye saatine dönüştürme fonksiyonu
  const formatTurkishTime = (dateString?: string) => {
    if (!dateString) return '--:--'
    
    try {
      const date = new Date(dateString)
      // Türkiye saatine dönüştür (+3 UTC)
      const turkishTime = new Date(date.getTime() + (3 * 60 * 60 * 1000))
      
      const hours = turkishTime.getUTCHours().toString().padStart(2, '0')
      const minutes = turkishTime.getUTCMinutes().toString().padStart(2, '0')
      
      return `${hours}:${minutes}`
    } catch (error) {
      console.error('Saat formatı hatası:', error)
      return '--:--'
    }
  }

  const formatTurkishDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}.${month}.${year}`
    } catch (error) {
      console.error('Tarih formatı hatası:', error)
      return dateString
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

      // Tarih aralığı filtresine göre sorgu ekle
      if (courierStartDate && courierEndDate) {
        // Başlangıç tarihi: Seçilen günün 00:00:00
        const start = new Date(courierStartDate)
        start.setHours(0, 0, 0, 0)
        
        // Bitiş tarihi: Seçilen günün 23:59:59
        const end = new Date(courierEndDate)
        end.setHours(23, 59, 59, 999)
        
        query = query
          .gte('delivered_at', start.toISOString())
          .lte('delivered_at', end.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        restaurants: undefined
      }))

      setSelectedCourierOrders(transformedData)
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      console.error('Kurye siparişleri yüklenirken hata:', error.message)
    }
  }

  // Kurye detaylarını göster
  const handleCourierClick = async (courierId: string) => {
    setSelectedCourierId(courierId)
    setShowCourierModal(true)
    
    // Tarih aralığı yoksa bugünü varsayılan olarak ayarla
    if (!courierStartDate || !courierEndDate) {
      const today = new Date().toISOString().split('T')[0]
      setCourierStartDate(today)
      setCourierEndDate(today)
    }
    
    await fetchCourierOrders(courierId)
    await fetchCourierDebts(courierId)
  }

  // Tarih değiştiğinde siparişleri yenile
  useEffect(() => {
    if (selectedCourierId && courierStartDate && courierEndDate) {
      fetchCourierOrders(selectedCourierId)
    }
  }, [selectedCourierId, courierStartDate, courierEndDate])

  // Teslimat süresini hesapla (dakika)
  const calculateDeliveryDuration = (pickedUpAt?: string, deliveredAt?: string) => {
    if (!pickedUpAt || !deliveredAt) return '-'
    
    try {
      const pickupTime = new Date(pickedUpAt)
      const deliveryTime = new Date(deliveredAt)
      const diffMs = deliveryTime.getTime() - pickupTime.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} dk`
    } catch (error) {
      return '-'
    }
  }

  // Kasa özetini hesapla
  const calculateCashSummary = (orders: Package[]) => {
    // Nakit ve Kart Toplam: Tüm paketler (settled olsun olmasın)
    const cashTotal = orders
      .filter(order => order.payment_method === 'cash')
      .reduce((sum, order) => sum + (order.amount || 0), 0)
    
    const cardTotal = orders
      .filter(order => order.payment_method === 'card')
      .reduce((sum, order) => sum + (order.amount || 0), 0)
    
    // Genel Toplam: Sadece henüz kapatılmamış paketler (settled_at NULL)
    const unsettledCashTotal = orders
      .filter(order => order.payment_method === 'cash' && !order.settled_at)
      .reduce((sum, order) => sum + (order.amount || 0), 0)
    
    const unsettledCardTotal = orders
      .filter(order => order.payment_method === 'card' && !order.settled_at)
      .reduce((sum, order) => sum + (order.amount || 0), 0)
    
    return {
      cashTotal, // Tüm nakit (bilgi amaçlı)
      cardTotal, // Tüm kart (bilgi amaçlı)
      grandTotal: unsettledCashTotal + unsettledCardTotal // Sadece kapatılmamış paketler
    }
  }

  // Restoran bazlı özet hesapla
  const calculateRestaurantSummary = (orders: Package[]) => {
    const restaurantCounts: { [key: string]: number } = {}
    
    orders.forEach(order => {
      const restaurantName = order.restaurant?.name || 'Bilinmeyen Restoran'
      restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1
    })
    
    return Object.entries(restaurantCounts)
      .sort(([,a], [,b]) => b - a) // En çok paketi olan restoran üstte
      .map(([name, count]) => ({ name, count }))
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window === 'undefined') return
    
    if (loginForm.username === 'okanadmin' && loginForm.password === 'okanbaba44') {
      // Sadece admin oturumunu başlat, diğerlerine dokunma
      localStorage.setItem('admin_logged_in', 'true')
      setIsLoggedIn(true)
      setErrorMessage('')
    } else {
      setErrorMessage('Hatalı kullanıcı adı veya şifre!')
    }
  }

  // RENDER BLOKLAMA - Oturum kontrolü tamamlanmadan hiçbir şey gösterme!
  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-sm">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Giriş ekranı
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
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" 
            placeholder="Şifre" 
            className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
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
    <>
      {/* RESTORAN DETAY MODALI */}
      {showRestaurantModal && selectedRestaurantId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4 flex-1">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  🍽️ {restaurants.find(r => r.id === selectedRestaurantId)?.name} - Detaylı Rapor
                </h3>
                
                {/* Tarih Aralığı Seçici */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={restaurantStartDate}
                    onChange={(e) => setRestaurantStartDate(e.target.value)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
                  />
                  <span className="text-slate-500 dark:text-slate-400">-</span>
                  <input
                    type="date"
                    value={restaurantEndDate}
                    onChange={(e) => setRestaurantEndDate(e.target.value)}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
                  />
                </div>
                
                {/* Hesap Öde Butonu */}
                {restaurantStartDate && restaurantEndDate && (
                  <button
                    onClick={() => setShowRestaurantPaymentModal(true)}
                    className="ml-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all active:scale-95"
                  >
                    💰 Hesap Öde
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowRestaurantModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl ml-4"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] admin-scrollbar">
              {/* Ödenmesi Gereken Hesap */}
              {selectedRestaurantOrders.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">💰 Ödenmesi Gereken Hesap</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                      <div className="text-center">
                        <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                          {selectedRestaurantOrders.length}
                        </div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                          📦 TOPLAM SİPARİŞ
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                      <div className="text-center">
                        <div className="text-3xl font-black text-green-700 dark:text-green-400">
                          {selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0).toFixed(2)} ₺
                        </div>
                        <div className="text-sm font-semibold text-green-600 dark:text-green-500 mt-1">
                          💵 TOPLAM TUTAR
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sipariş Detay Tablosu */}
              <div>
                <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">📋 Sipariş Detayları</h4>
                {selectedRestaurantOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Bu restoran henüz sipariş almamış.
                  </div>
                ) : (
                  <div className="overflow-x-auto admin-scrollbar">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                          <th className="text-left py-3 px-4 font-semibold">Tarih/Saat</th>
                          <th className="text-left py-3 px-4 font-semibold">Müşteri</th>
                          <th className="text-left py-3 px-4 font-semibold">Kurye</th>
                          <th className="text-left py-3 px-4 font-semibold">Tutar</th>
                          <th className="text-left py-3 px-4 font-semibold">Ödeme</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRestaurantOrders.map((order, index) => (
                          <tr key={order.id} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                            index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-700/20'
                          }`}>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className="font-medium">{formatTurkishTime(order.delivered_at)}</div>
                                <div className="text-slate-500 text-xs">
                                  {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{order.customer_name}</td>
                            <td className="py-3 px-4">{order.courier_name || 'Bilinmeyen'}</td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {order.amount} ₺
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.payment_method === 'cash' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTORAN HESAP ÖDEME MODALI */}
      {showRestaurantPaymentModal && selectedRestaurantId && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                💰 Hesap Ödemesi - {restaurants.find(r => r.id === selectedRestaurantId)?.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingRestaurantDebts ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500">Borçlar yükleniyor...</p>
                </div>
              ) : (
                <>
                  {/* Seçilen Tarih Aralığı Toplam Tutar */}
                  <div className="mb-6 space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          💵 Seçilen Tarih Aralığı Toplam Tutar
                        </span>
                        <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0).toFixed(2)} ₺
                        </span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        {selectedRestaurantOrders.length} sipariş ({restaurantStartDate} - {restaurantEndDate})
                      </p>
                    </div>

                    {/* Geçmiş Borçlar */}
                    {restaurantDebts.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">
                            📋 Geçmiş Borçlar
                          </span>
                          <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                            {restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0).toFixed(2)} ₺
                          </span>
                        </div>
                        <div className="space-y-2">
                          {restaurantDebts.map((debt) => (
                            <div key={debt.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-700 p-2 rounded">
                              <span className="text-slate-600 dark:text-slate-400">
                                📅 {formatTurkishDate(debt.debt_date)} tarihinden kalan
                              </span>
                              <span className="font-bold text-red-600 dark:text-red-400">
                                {debt.remaining_amount.toFixed(2)} ₺
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Genel Toplam */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                          🎯 GENEL TOPLAM (Ödenmesi Gereken)
                        </span>
                        <span className="text-3xl font-black text-purple-700 dark:text-purple-300">
                          {(selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0) + restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)).toFixed(2)} ₺
                        </span>
                      </div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Seçilen tarih aralığı toplam + Geçmiş borçlar
                      </p>
                    </div>
                  </div>

                  {/* Ödenen Para Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      💰 Restorana Ödenen Para
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={restaurantPaymentAmount}
                      onChange={(e) => setRestaurantPaymentAmount(e.target.value)}
                      placeholder="Örn: 30000.00"
                      autoFocus
                      className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Fark Hesaplama */}
                  {restaurantPaymentAmount && !isNaN(parseFloat(restaurantPaymentAmount)) && (() => {
                    const totalOrderAmount = selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
                    const totalOldDebt = restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
                    const grandTotal = totalOrderAmount + totalOldDebt
                    const paid = parseFloat(restaurantPaymentAmount)
                    const difference = grandTotal - paid
                    
                    if (paid > grandTotal) {
                      return (
                        <div className="mb-6">
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                            <div className="text-center">
                              <span className="text-2xl font-black text-yellow-700 dark:text-yellow-300">
                                ⚠️ FAZLA TUTAR
                              </span>
                              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                                Fazla tutar girdiniz, lütfen ödemeyi kontrol edin!
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    } else if (difference > 0) {
                      return (
                        <div className="mb-6">
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-300 dark:border-red-700">
                            <div className="flex justify-between items-center">
                              <span className="text-base font-bold text-red-700 dark:text-red-300">
                                ⚠️ EKSİK ÖDEME
                              </span>
                              <span className="text-3xl font-black text-red-700 dark:text-red-300">
                                {difference.toFixed(2)} ₺
                              </span>
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                              Bu miktar restoran borcuna eklenecek
                            </p>
                          </div>
                        </div>
                      )
                    } else {
                      return (
                        <div className="mb-6">
                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                            <div className="text-center">
                              <span className="text-2xl font-black text-green-700 dark:text-green-300">
                                ✓ TAM ÖDEME
                              </span>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                Hesap tam olarak kapandı
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  })()}

                  {/* Butonlar */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRestaurantPaymentModal(false)
                        setRestaurantPaymentAmount('')
                      }}
                      className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleRestaurantPayment}
                      disabled={restaurantPaymentProcessing || !restaurantPaymentAmount || parseFloat(restaurantPaymentAmount) > (selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0) + restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0))}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {restaurantPaymentProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          İşleniyor...
                        </span>
                      ) : (
                        '✓ Ödemeyi Onayla'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESTORAN BORÇ ÖDEME MODALI */}
      {showRestaurantDebtPayModal && selectedRestaurantId && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                💳 Borç Ödemesi - {restaurants.find(r => r.id === selectedRestaurantId)?.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingRestaurantDebts ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500">Borçlar yükleniyor...</p>
                </div>
              ) : (
                <>
                  {/* Borç Listesi */}
                  <div className="mb-6">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📋 Mevcut Borçlar</h4>
                    
                    {restaurantDebts.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <div className="text-4xl mb-2">✅</div>
                        <p>Restoran borcu yok</p>
                      </div>
                    ) : (
                      <div className="space-y-2 mb-4">
                        {restaurantDebts.map((debt) => (
                          <div key={debt.id} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              📅 {formatTurkishDate(debt.debt_date)} gününden kalan
                            </span>
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">
                              {debt.remaining_amount.toFixed(2)} ₺
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Toplam Borç */}
                    {restaurantDebts.length > 0 && (
                      <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-xl border-2 border-red-300 dark:border-red-700">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-bold text-red-700 dark:text-red-300">
                            💰 TOPLAM BORÇ
                          </span>
                          <span className="text-3xl font-black text-red-700 dark:text-red-300">
                            {restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0).toFixed(2)} ₺
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ödeme Tutarı Input */}
                  {restaurantDebts.length > 0 && (
                    <>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          💵 Ödenen Tutar
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={restaurantDebtPayAmount}
                          onChange={(e) => setRestaurantDebtPayAmount(e.target.value)}
                          placeholder="Örn: 5000.00"
                          autoFocus
                          className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        />
                      </div>

                      {/* Hesaplama Önizlemesi */}
                      {restaurantDebtPayAmount && !isNaN(parseFloat(restaurantDebtPayAmount)) && (() => {
                        const payment = parseFloat(restaurantDebtPayAmount)
                        const totalDebt = restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
                        const remaining = totalDebt - payment
                        
                        if (payment > totalDebt) {
                          return (
                            <div className="mb-6">
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                                <div className="text-center">
                                  <span className="text-2xl font-black text-yellow-700 dark:text-yellow-300">
                                    ⚠️ UYARI
                                  </span>
                                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                                    Ödeme tutarı toplam borçtan fazla olamaz!
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        } else if (remaining > 0) {
                          return (
                            <div className="mb-6">
                              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border-2 border-orange-300 dark:border-orange-700">
                                <div className="flex justify-between items-center">
                                  <span className="text-base font-bold text-orange-700 dark:text-orange-300">
                                    📊 KALAN BORÇ
                                  </span>
                                  <span className="text-3xl font-black text-orange-700 dark:text-orange-300">
                                    {remaining.toFixed(2)} ₺
                                  </span>
                                </div>
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                  Bu miktar bugün tarihine aktarılacak
                                </p>
                              </div>
                            </div>
                          )
                        } else {
                          return (
                            <div className="mb-6">
                              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                                <div className="text-center">
                                  <span className="text-2xl font-black text-green-700 dark:text-green-300">
                                    ✅ TÜM BORÇ ÖDENDİ
                                  </span>
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                    Restoran borçsuz olacak
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        }
                      })()}

                      {/* Butonlar */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowRestaurantDebtPayModal(false)
                            setRestaurantDebtPayAmount('')
                          }}
                          className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleRestaurantDebtPayment}
                          disabled={restaurantDebtPayProcessing || !restaurantDebtPayAmount || parseFloat(restaurantDebtPayAmount) > restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restaurantDebtPayProcessing ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              İşleniyor...
                            </span>
                          ) : (
                            '✓ Borç Öde'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

    <div className={`min-h-screen ${darkMode ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white'}`}>
      {/* Hamburger Menü Butonu - Sol Üst */}
      <button 
        onClick={() => setShowMenu(!showMenu)} 
        className="fixed top-4 left-4 z-50 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg shadow-lg transition-colors"
      >
        <div className="space-y-1.5">
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
        </div>
      </button>

      {/* Logo ve Dark Mode Toggle - Sağ Üst */}
      <div className="fixed -top-10 right-4 z-50 flex items-center gap-3">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg transition-colors"
          title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="w-36 h-36"
        />
      </div>

      {/* Açılır Menü */}
      {showMenu && (
        <>
          {/* Overlay - Menü dışına tıklayınca kapansın */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMenu(false)}
          ></div>
          
          {/* Menü İçeriği */}
          <div className="fixed top-0 left-0 h-full w-64 bg-slate-900 shadow-2xl z-50 transform transition-transform overflow-y-auto admin-scrollbar">
            <div className="p-6">
              {/* Logo ve Başlık */}
              <div className="mb-8 text-center">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-24 h-24 mx-auto mb-3"
                />
                <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              </div>

              {/* Menü Seçenekleri */}
              <nav className="space-y-2">
                {[
                  { id: 'live', label: 'Canlı Takip', icon: '📦' },
                  { id: 'history', label: 'Geçmiş Siparişler', icon: '📋' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any)
                      setShowMenu(false)
                      setShowRestaurantSubmenu(false)
                      setShowCourierSubmenu(false)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
                
                {/* Kuryeler - Alt Menülü */}
                <div>
                  <button
                    onClick={() => setShowCourierSubmenu(!showCourierSubmenu)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === 'couriers'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">🚴</span>
                    Kuryeler
                    <span className="float-right">{showCourierSubmenu ? '▼' : '▶'}</span>
                  </button>
                  
                  {/* Alt Menü */}
                  {showCourierSubmenu && (
                    <div className="ml-4 mt-2 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('couriers')
                          setCourierSubTab('accounts')
                          setShowMenu(false)
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'couriers' && courierSubTab === 'accounts'
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
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'couriers' && courierSubTab === 'performance'
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
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'couriers' && courierSubTab === 'earnings'
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        💰 Kurye Kazançları
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Restoranlar - Alt Menülü */}
                <div>
                  <button
                    onClick={() => setShowRestaurantSubmenu(!showRestaurantSubmenu)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === 'restaurants'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">🍽️</span>
                    Restoranlar
                    <span className="float-right">{showRestaurantSubmenu ? '▼' : '▶'}</span>
                  </button>
                  
                  {/* Alt Menü */}
                  {showRestaurantSubmenu && (
                    <div className="ml-4 mt-2 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('restaurants')
                          setRestaurantSubTab('list')
                          setShowMenu(false)
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'restaurants' && restaurantSubTab === 'list'
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
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'restaurants' && restaurantSubTab === 'details'
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
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'restaurants' && restaurantSubTab === 'debt'
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
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === 'restaurants' && restaurantSubTab === 'payments'
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

              {/* Çıkış Butonu */}
              <button 
                onClick={() => { 
                  localStorage.removeItem('admin_logged_in');
                  window.location.href = '/';
                }} 
                className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                ← Çıkış Yap
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fixed Çıkış Butonu - Kaldırıldı, artık menüde */}

      {/* YENİ SİPARİŞ POPUP BİLDİRİMİ */}
      {showNotificationPopup && newOrderDetails && (
        <div className="fixed top-4 right-4 z-[100]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-4 border-red-500 p-6 max-w-md relative">
            {/* Kırmızı Alarm İkonu */}
            <div className="absolute -top-3 -right-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">🚨</span>
            </div>
            
            {/* Kapatma Butonu */}
            <button 
              onClick={() => setShowNotificationPopup(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 text-xl"
            >
              ×
            </button>
            
            {/* Başlık */}
            <div className="mb-4">
              <h2 className="text-2xl font-black text-red-600 dark:text-red-400 mb-1">
                📦 YENİ SİPARİŞ GELDİ!
              </h2>
              <p className="text-sm text-slate-500">Hemen kurye atayın</p>
            </div>
            
            {/* Sipariş Detayları */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Restoran:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {newOrderDetails.restaurant?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Müşteri:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {newOrderDetails.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tutar:</span>
                <span className="text-lg font-black text-green-600 dark:text-green-400">
                  {newOrderDetails.amount}₺
                </span>
              </div>
              {newOrderDetails.content && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-xs text-slate-500">İçerik:</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{newOrderDetails.content}</p>
                </div>
              )}
            </div>
            
            {/* Aksiyon Butonu */}
            <button
              onClick={() => {
                setShowNotificationPopup(false)
                setActiveTab('live')
              }}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Siparişe Git →
            </button>
          </div>
        </div>
      )}

      {/* Sticky Navbar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 shadow-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            {/* Title - Ortada */}
            <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent" style={{fontFamily: 'Orbitron, sans-serif'}}>
              ADMIN PANEL
            </h1>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Başarı/Hata/Bildirim Mesajları */}
          {notificationMessage && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-300 animate-pulse">
              {notificationMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-300">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Tab İçerikleri */}
          {activeTab === 'live' && <LiveTrackingTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'couriers' && <CouriersTab />}
          {activeTab === 'restaurants' && <RestaurantsTab />}
        </div>
      </div>
    </div>
    </>
  )

  // Tab Bileşenleri
  function LiveTrackingTab() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* SİPARİŞ KARTLARI */}
            <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6">� Canlı Sipariş Takibi</h2>
          
          {/* Sipariş Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-slate-500">Siparişler yükleniyor...</div>
            ) : packages.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">Aktif sipariş bulunmuyor.</div>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className={`bg-white dark:bg-slate-800 p-3 rounded-lg border-l-4 shadow-sm ${
                  pkg.status === 'waiting' ? 'border-l-yellow-500' :
                  pkg.status === 'assigned' ? 'border-l-blue-500' :
                  pkg.status === 'picking_up' ? 'border-l-orange-500' :
                  'border-l-red-500'
                } border-r border-t border-b border-slate-200 dark:border-slate-600`}>
                  
                  {/* Oluşturulma Saati */}
                  <div className="flex justify-end mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      🕐 {formatTurkishTime(pkg.created_at)}
                    </span>
                  </div>

                  {/* Üst Kısım - Restoran ve Durum */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded text-xs font-medium">
                      🍽️ {pkg.restaurant?.name || 'Bilinmeyen'}
                    </span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {pkg.amount}₺
                    </span>
                  </div>

                  {/* Durum Rozeti */}
                  <div className="mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      pkg.status === 'waiting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      pkg.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {pkg.status === 'waiting' ? '⏳ Bekliyor' : 
                       pkg.status === 'assigned' ? '👤 Atandı' :
                       pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                    </span>
                  </div>

                  {/* Müşteri Bilgileri */}
                  <div className="space-y-2 mb-3">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      👤 {pkg.customer_name}
                    </h3>
                    
                    {pkg.customer_phone && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        📞 {pkg.customer_phone}
                      </p>
                    )}
                    
                    {pkg.content && (
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Paket İçeriği:</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded">
                          📝 {pkg.content}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Adres:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                        📍 {pkg.delivery_address}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        pkg.payment_method === 'cash' 
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </span>
                    </div>
                  </div>

                  {/* Kurye Atama */}
                  {pkg.status === 'waiting' && (
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 space-y-2">
                      <select 
                        value={selectedCouriers[pkg.id] || ''}
                        onChange={(e) => handleCourierChange(pkg.id, e.target.value)}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        disabled={assigningIds.has(pkg.id)}
                      >
                        <option value="">Kurye Seçin</option>
                        {couriers.length === 0 && (
                          <option disabled>Kurye bulunamadı</option>
                        )}
                        {couriers.filter(c => c.is_active).length === 0 && couriers.length > 0 && (
                          <option disabled>Aktif kurye yok (Toplam: {couriers.length})</option>
                        )}
                        {couriers
                          .filter(c => c.is_active) // Sadece aktif kuryeler
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.full_name} ({c.deliveryCount || 0} teslim, {c.activePackageCount || 0} aktif)
                            </option>
                          ))
                        }
                      </select>
                      <button 
                        onClick={() => handleAssignCourier(pkg.id)}
                        disabled={!selectedCouriers[pkg.id] || assigningIds.has(pkg.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                      >
                        {assigningIds.has(pkg.id) ? '⏳ Atanıyor...' : '✅ Kurye Ata'}
                      </button>
                    </div>
                  )}

                  {/* Atanmış Kurye Bilgisi */}
                  {pkg.status !== 'waiting' && pkg.courier_id && (
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                      <div className="flex items-center justify-center">
                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                          🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

        {/* SAĞ PANEL: KURYELERİN DURUMU */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">🚴 Kurye Durumları</h2>
            <div className="space-y-3">
              {couriers.map(c => {
                // Bu kuryenin paketlerini bul
                const courierPackages = packages.filter(pkg => pkg.courier_id === c.id)
                
                return (
                  <div 
                    key={c.id} 
                    className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border dark:border-slate-600"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">{c.full_name}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-green-600 dark:text-green-400 block font-semibold">
                          📦 {c.todayDeliveryCount || 0} bugün
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">
                          🚚 {c.activePackageCount || 0} üzerinde
                        </span>
                      </div>
                    </div>
                    
                    {/* Aktiflik Durumu */}
                    <div className="mb-2">
                      {!c.is_active && <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-bold">⚫ AKTİF DEĞİL</span>}
                      {c.is_active && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">🟢 AKTİF</span>}
                    </div>
                    
                    {/* Paket Durumları */}
                    {courierPackages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {courierPackages.map(pkg => (
                          <div key={pkg.id} className="text-[10px] flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${
                              pkg.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {pkg.status === 'assigned' ? '👤 Atandı' :
                               pkg.status === 'picking_up' ? '🏃 Alıyor' : '🚗 Yolda'}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 truncate">
                              {pkg.customer_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </div>
      </div>
    )
  }

  function HistoryTab() {
    // Client-side filtreleme
    const getFilteredHistory = () => {
      if (dateFilter === 'all') return deliveredPackages
      
      const now = new Date()
      let startDate = new Date()
      
      if (dateFilter === 'today') {
        startDate.setHours(now.getHours() - 24)
      } else if (dateFilter === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else if (dateFilter === 'month') {
        startDate.setDate(now.getDate() - 30)
      }
      
      return deliveredPackages.filter(pkg => 
        pkg.delivered_at && new Date(pkg.delivered_at) >= startDate
      )
    }
    
    const filteredHistory = getFilteredHistory()
    
    // Toplam tutar hesapla (filtrelenmiş veriden)
    const totalAmount = filteredHistory.reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
    const cashAmount = filteredHistory.filter(p => p.payment_method === 'cash').reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
    const cardAmount = filteredHistory.filter(p => p.payment_method === 'card').reduce((sum, pkg) => sum + (pkg.amount || 0), 0)

    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">📋 Geçmiş Siparişler</h2>
          
          {/* Tarih Filtresi Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filtrele:
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">📅 Son 24 Saat</option>
              <option value="week">📅 Son 7 Gün</option>
              <option value="month">📅 Son 30 Gün</option>
              <option value="all">📅 Tümü</option>
            </select>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Toplam Sipariş</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{filteredHistory.length}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">Toplam Tutar</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{totalAmount.toFixed(2)} ₺</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl">
            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Nakit</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cashAmount.toFixed(2)} ₺</div>
          </div>
          <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-xl">
            <div className="text-sm text-sky-600 dark:text-sky-400 font-medium">Kart</div>
            <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">{cardAmount.toFixed(2)} ₺</div>
          </div>
        </div>

        <div className="overflow-x-auto admin-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="text-left py-3 px-4">Tarih/Saat</th>
                <th className="text-left py-3 px-4">Müşteri</th>
                <th className="text-left py-3 px-4">Restoran</th>
                <th className="text-left py-3 px-4">Kurye</th>
                <th className="text-left py-3 px-4">Tutar</th>
                <th className="text-left py-3 px-4">Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Bu tarih aralığında sipariş bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(pkg => (
                  <tr key={pkg.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium">{formatTurkishTime(pkg.delivered_at)}</div>
                        <div className="text-slate-500 text-xs">
                          {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('tr-TR') : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <div>{pkg.customer_name}</div>
                      {pkg.customer_phone && (
                        <div className="text-xs text-slate-500 mt-1">📞 {pkg.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">{pkg.restaurant?.name}</td>
                    <td className="py-3 px-4">{pkg.courier_name || 'Bilinmeyen'}</td>
                    <td className="py-3 px-4 font-bold text-green-600">{pkg.amount}₺</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        pkg.payment_method === 'cash' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function CouriersTab() {
    // Kurye Hesapları görünümü
    if (courierSubTab === 'accounts') {
      return (
        <>
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">👤 Kurye Hesapları</h2>
          
          {/* Kurye Durumu Özeti */}
          <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="font-bold mb-2">📊 Kurye Durumu Özeti:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{couriers.length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Kurye</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{couriers.filter(c => c.is_active).length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Aktif Kurye</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{couriers.filter(c => !c.is_active).length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Pasif Kurye</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {couriers.reduce((sum, c) => sum + (c.activePackageCount || 0), 0)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Aktif Paket</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 text-center">
              Son güncelleme: {new Date().toLocaleTimeString('tr-TR')} • Otomatik güncelleme: 30 saniye
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {couriers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <div className="font-bold">Kurye bulunamadı!</div>
                <div className="text-sm mt-2">Couriers tablosunda veri yok. SQL'i çalıştırın.</div>
              </div>
            ) : (
              couriers.map(c => (
                <div key={c.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
                  <div className="flex justify-between items-start mb-3">
                    <button
                      onClick={() => handleCourierClick(c.id)}
                      className="font-bold text-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      {c.full_name}
                    </button>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Durum:</span>
                      <span className={`font-medium ${
                        c.is_active ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {c.is_active ? 'Aktif' : 'Aktif Değil'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Aktif Paket:</span>
                      <span className="font-bold text-blue-600">{c.activePackageCount || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Bugün Teslim:</span>
                      <span className="font-bold text-green-600">{c.todayDeliveryCount || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Toplam Teslim:</span>
                      <span className="font-bold text-purple-600">{c.deliveryCount || 0}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Kuryenin Borcu:</span>
                      <span className={`font-bold ${
                        (c.totalDebt || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {(c.totalDebt || 0).toFixed(2)} ₺
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <button
                        onClick={() => handleCourierClick(c.id)}
                        className="w-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        📊 Detaylı Rapor Görüntüle
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kurye Detay Modalı */}
        {showCourierModal && selectedCourierId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    🚴 {couriers.find(c => c.id === selectedCourierId)?.full_name} - Detaylı Rapor
                  </h3>
                  
                  {/* Tarih Aralığı Seçici */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={courierStartDate}
                      onChange={(e) => setCourierStartDate(e.target.value)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
                    />
                    <span className="text-slate-500 dark:text-slate-400">-</span>
                    <input
                      type="date"
                      value={courierEndDate}
                      onChange={(e) => setCourierEndDate(e.target.value)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
                    />
                  </div>
                  
                  {/* Gün Sonu Al Butonu */}
                  {courierStartDate && courierEndDate && (
                    <button
                      onClick={() => setShowEndOfDayModal(true)}
                      className="ml-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all active:scale-95"
                    >
                      💰 Gün Sonu Al
                    </button>
                  )}
                  
                  {/* Borç Öde Butonu */}
                  {courierDebts.length > 0 && (
                    <button
                      onClick={() => setShowPayDebtModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all active:scale-95"
                    >
                      💳 Borç Öde
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowCourierModal(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl ml-4"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] admin-scrollbar">
                {/* Kasa Özeti */}
                {selectedCourierOrders.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">💰 Kasa Özeti</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const summary = calculateCashSummary(selectedCourierOrders)
                        return (
                          <>
                            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                              <div className="text-center">
                                <div className="text-3xl font-black text-green-700 dark:text-green-400">
                                  {summary.cashTotal.toFixed(2)} ₺
                                </div>
                                <div className="text-sm font-semibold text-green-600 dark:text-green-500 mt-1">
                                  💵 NAKİT TOPLAM
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                                  {selectedCourierOrders.filter(o => o.payment_method === 'cash').length} sipariş
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                              <div className="text-center">
                                <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                                  {summary.cardTotal.toFixed(2)} ₺
                                </div>
                                <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                                  💳 KART TOPLAM
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                  {selectedCourierOrders.filter(o => o.payment_method === 'card').length} sipariş
                                </div>
                              </div>
                            </div>

                            <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                              <div className="text-center">
                                <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
                                  {summary.grandTotal.toFixed(2)} ₺
                                </div>
                                <div className="text-sm font-semibold text-purple-600 dark:text-purple-500 mt-1">
                                  🎯 GENEL TOPLAM
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                                  {selectedCourierOrders.length} toplam sipariş
                                </div>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* Sipariş Detay Tablosu */}
                <div>
                  <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">📋 Teslim Edilen Siparişler</h4>
                  {selectedCourierOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      Bu kurye henüz sipariş teslim etmemiş.
                    </div>
                  ) : (
                    <div className="overflow-x-auto admin-scrollbar">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                            <th className="text-left py-3 px-4 font-semibold">Tarih/Saat</th>
                            <th className="text-left py-3 px-4 font-semibold">Müşteri</th>
                            <th className="text-left py-3 px-4 font-semibold">Restoran</th>
                            <th className="text-left py-3 px-4 font-semibold">İçerik</th>
                            <th className="text-left py-3 px-4 font-semibold">Tutar</th>
                            <th className="text-left py-3 px-4 font-semibold">Konum</th>
                            <th className="text-left py-3 px-4 font-semibold">Ödeme</th>
                            <th className="text-left py-3 px-4 font-semibold">Teslimat Süresi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCourierOrders.map((order, index) => (
                            <tr key={order.id} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                              index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-700/20'
                            }`}>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium">{formatTurkishTime(order.delivered_at)}</div>
                                  <div className="text-slate-500 text-xs">
                                    {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium">{order.customer_name}</td>
                              <td className="py-3 px-4">
                                <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded text-xs font-medium">
                                  🍽️ {order.restaurant?.name || 'Bilinmeyen'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs">
                                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                    {order.content || 'Belirtilmemiş'}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {order.amount} ₺
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs text-xs text-slate-600 dark:text-slate-400 truncate">
                                  📍 {order.delivery_address}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.payment_method === 'cash' 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-purple-600 dark:text-purple-400">
                                  ⏱️ {calculateDeliveryDuration(order.picked_up_at, order.delivered_at)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Restoran Bazlı Özet */}
                {selectedCourierOrders.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">🍽️ Restoran Bazlı Özet</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {calculateRestaurantSummary(selectedCourierOrders).map((restaurant, index) => (
                        <div key={restaurant.name} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border dark:border-slate-600">
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {restaurant.count}
                            </div>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                              {restaurant.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {restaurant.count === 1 ? 'paket' : 'paket'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Özet İstatistik */}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-center text-sm text-blue-700 dark:text-blue-400">
                        <span className="font-semibold">
                          Toplam {calculateRestaurantSummary(selectedCourierOrders).length} farklı restorandan 
                          {' '}{selectedCourierOrders.length} paket teslim edildi
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GÜN SONU MODAL */}
        {showEndOfDayModal && selectedCourierId && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  💰 Gün Sonu Kasası - {couriers.find(c => c.id === selectedCourierId)?.full_name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {loadingDebts ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Borçlar yükleniyor...</p>
                  </div>
                ) : (
                  <>
                    {/* Hesaplamalar */}
                    {(() => {
                      const summary = calculateCashSummary(selectedCourierOrders)
                      const totalOldDebt = courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
                      const grandTotal = summary.cashTotal + summary.cardTotal + totalOldDebt
                      const received = endOfDayAmount ? parseFloat(endOfDayAmount) : 0
                      const difference = received - grandTotal
                      
                      return null // Sadece hesaplama için, render etme
                    })()}
                    
                    {/* Seçilen Tarih Aralığı Nakit Toplam */}
                    <div className="mb-6 space-y-3">
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            💵 Seçilen Tarih Aralığı Nakit Toplam
                          </span>
                          <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {calculateCashSummary(selectedCourierOrders).cashTotal.toFixed(2)} ₺
                          </span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          {selectedCourierOrders.filter(o => o.payment_method === 'cash').length} nakit sipariş ({courierStartDate} - {courierEndDate})
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-600 mt-2 font-medium">
                          ℹ️ Bu değer değişmez (bilgi amaçlı)
                        </p>
                      </div>

                      {/* Seçilen Tarih Aralığı Kart Toplam */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            💳 Seçilen Tarih Aralığı Kart Toplam
                          </span>
                          <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {calculateCashSummary(selectedCourierOrders).cardTotal.toFixed(2)} ₺
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                          {selectedCourierOrders.filter(o => o.payment_method === 'card').length} kart sipariş ({courierStartDate} - {courierEndDate})
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-600 mt-2 font-medium">
                          ℹ️ Bu değer değişmez (bilgi amaçlı)
                        </p>
                      </div>

                      {/* Geçmiş Borçlar */}
                      {courierDebts.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                              📋 Geçmiş Borçlar
                            </span>
                            <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                              {courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0).toFixed(2)} ₺
                            </span>
                          </div>
                          <div className="space-y-2">
                            {courierDebts.map((debt) => (
                              <div key={debt.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-700 p-2 rounded">
                                <span className="text-slate-600 dark:text-slate-400">
                                  📅 {formatTurkishDate(debt.debt_date)} tarihinden kalan
                                </span>
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {debt.remaining_amount.toFixed(2)} ₺
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Genel Toplam */}
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                        <div className="flex justify-between items-center">
                          <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                            🎯 GENEL TOPLAM (Beklenen)
                          </span>
                          <span className="text-3xl font-black text-purple-700 dark:text-purple-300">
                            {(calculateCashSummary(selectedCourierOrders).cashTotal + calculateCashSummary(selectedCourierOrders).cardTotal + courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)).toFixed(2)} ₺
                          </span>
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Seçilen tarih aralığı nakit + Kart + Geçmiş borçlar
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-500 mt-2 font-medium">
                          ⚡ Gün sonu alındığında bu değer sıfırlanır
                        </p>
                      </div>
                    </div>

                    {/* Alınan Para Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        💰 Kuryeden Alınan Para
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={endOfDayAmount}
                        onChange={(e) => setEndOfDayAmount(e.target.value)}
                        placeholder="Örn: 1250.00"
                        autoFocus
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Fark Hesaplama */}
                    {endOfDayAmount && !isNaN(parseFloat(endOfDayAmount)) && (() => {
                      const summary = calculateCashSummary(selectedCourierOrders)
                      const totalOldDebt = courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
                      const grandTotal = summary.cashTotal + summary.cardTotal + totalOldDebt
                      const received = parseFloat(endOfDayAmount)
                      const difference = received - grandTotal
                      
                      if (difference < 0) {
                        return (
                          <div className="mb-6">
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-300 dark:border-red-700">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-red-700 dark:text-red-300">
                                  ⚠️ AÇIK
                                </span>
                                <span className="text-3xl font-black text-red-700 dark:text-red-300">
                                  {Math.abs(difference).toFixed(2)} ₺
                                </span>
                              </div>
                              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                Bu miktar kurye borcuna eklenecek
                              </p>
                            </div>
                          </div>
                        )
                      } else if (difference > 0) {
                        return (
                          <div className="mb-6">
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-green-700 dark:text-green-300">
                                  ✅ BAHŞİŞ
                                </span>
                                <span className="text-3xl font-black text-green-700 dark:text-green-300">
                                  {difference.toFixed(2)} ₺
                                </span>
                              </div>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                Kurye fazla para getirdi
                              </p>
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div className="mb-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                              <div className="text-center">
                                <span className="text-2xl font-black text-blue-700 dark:text-blue-300">
                                  ✓ TAM ÖDEME
                                </span>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                  Hesap tam olarak kapandı
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                    })()}

                    {/* Butonlar */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowEndOfDayModal(false)
                          setEndOfDayAmount('')
                        }}
                        className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleEndOfDay}
                        disabled={endOfDayProcessing || !endOfDayAmount}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {endOfDayProcessing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            İşleniyor...
                          </span>
                        ) : (
                          '✓ Gün Sonu Kapat'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BORÇ ÖDE MODAL */}
        {showPayDebtModal && selectedCourierId && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  💳 Borç Ödemesi - {couriers.find(c => c.id === selectedCourierId)?.full_name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {loadingDebts ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Borçlar yükleniyor...</p>
                  </div>
                ) : (
                  <>
                    {/* Borç Listesi */}
                    <div className="mb-6">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📋 Mevcut Borçlar</h4>
                      
                      {courierDebts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <div className="text-4xl mb-2">✅</div>
                          <p>Kurye borcu yok</p>
                        </div>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {courierDebts.map((debt) => (
                            <div key={debt.id} className="flex justify-between items-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                📅 {formatTurkishDate(debt.debt_date)} gününden kalan
                              </span>
                              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                {debt.remaining_amount.toFixed(2)} ₺
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Toplam Borç */}
                      {courierDebts.length > 0 && (
                        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-xl border-2 border-red-300 dark:border-red-700">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-red-700 dark:text-red-300">
                              💰 TOPLAM BORÇ
                            </span>
                            <span className="text-3xl font-black text-red-700 dark:text-red-300">
                              {courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0).toFixed(2)} ₺
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ödeme Tutarı Input */}
                    {courierDebts.length > 0 && (
                      <>
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            💵 Ödenen Tutar
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={payDebtAmount}
                            onChange={(e) => setPayDebtAmount(e.target.value)}
                            placeholder="Örn: 500.00"
                            autoFocus
                            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                          />
                        </div>

                        {/* Hesaplama Önizlemesi */}
                        {payDebtAmount && !isNaN(parseFloat(payDebtAmount)) && (() => {
                          const payment = parseFloat(payDebtAmount)
                          const totalDebt = courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
                          const remaining = totalDebt - payment
                          
                          if (payment > totalDebt) {
                            return (
                              <div className="mb-6">
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                                  <div className="text-center">
                                    <span className="text-2xl font-black text-yellow-700 dark:text-yellow-300">
                                      ⚠️ UYARI
                                    </span>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                                      Ödeme tutarı toplam borçtan fazla olamaz!
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          } else if (remaining > 0) {
                            return (
                              <div className="mb-6">
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border-2 border-orange-300 dark:border-orange-700">
                                  <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-orange-700 dark:text-orange-300">
                                      📊 KALAN BORÇ
                                    </span>
                                    <span className="text-3xl font-black text-orange-700 dark:text-orange-300">
                                      {remaining.toFixed(2)} ₺
                                    </span>
                                  </div>
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                    Bu miktar bugün tarihine aktarılacak
                                  </p>
                                </div>
                              </div>
                            )
                          } else {
                            return (
                              <div className="mb-6">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                                  <div className="text-center">
                                    <span className="text-2xl font-black text-green-700 dark:text-green-300">
                                      ✅ TÜM BORÇ ÖDENDİ
                                    </span>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                      Kurye borçsuz olacak
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        })()}

                        {/* Butonlar */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowPayDebtModal(false)
                              setPayDebtAmount('')
                            }}
                            className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            İptal
                          </button>
                          <button
                            onClick={handlePayDebt}
                            disabled={payDebtProcessing || !payDebtAmount || parseFloat(payDebtAmount) > courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {payDebtProcessing ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                İşleniyor...
                              </span>
                            ) : (
                              '✓ Borç Öde'
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </>
      )
    }
    
    // Kurye Kazançları (Hakediş) görünümü
    if (courierSubTab === 'earnings') {
      // Tarih filtresine göre başlangıç tarihini hesapla
      const getStartDate = () => {
        const now = new Date()
        const start = new Date()
        
        if (courierEarningsFilter === 'today') {
          start.setHours(0, 0, 0, 0)
        } else if (courierEarningsFilter === 'week') {
          start.setDate(now.getDate() - 7)
        } else if (courierEarningsFilter === 'month') {
          start.setDate(now.getDate() - 30)
        }
        
        return start
      }

      // Her kurye için kazanç hesapla
      const courierEarnings = couriers.map(courier => {
        const startDate = getStartDate()
        
        // Seçilen tarih aralığındaki delivered paketleri say
        const deliveredCount = deliveredPackages.filter(pkg => 
          pkg.courier_id === courier.id && 
          pkg.delivered_at && 
          new Date(pkg.delivered_at) >= startDate
        ).length
        
        const earnings = deliveredCount * 80
        
        return {
          ...courier,
          deliveredCount,
          earnings
        }
      }).sort((a, b) => b.earnings - a.earnings) // Kazanca göre sırala

      const totalEarnings = courierEarnings.reduce((sum, c) => sum + c.earnings, 0)
      const totalDeliveries = courierEarnings.reduce((sum, c) => sum + c.deliveredCount, 0)

      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">💰 Kurye Kazançları (Hakediş)</h2>
            
            {/* Tarih Filtresi */}
            <select
              value={courierEarningsFilter}
              onChange={(e) => setCourierEarningsFilter(e.target.value as 'today' | 'week' | 'month')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 font-medium"
            >
              <option value="today">📅 Bugün</option>
              <option value="week">📅 Haftalık (7 Gün)</option>
              <option value="month">📅 Aylık (30 Gün)</option>
            </select>
          </div>

          {/* Genel Özet */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
              <div className="text-center">
                <div className="text-3xl font-black text-green-700 dark:text-green-400">
                  {totalEarnings.toFixed(2)} ₺
                </div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-500 mt-1">
                  💰 TOPLAM HAKEDİŞ
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                  {totalDeliveries}
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                  📦 TOPLAM TESLİMAT
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
              <div className="text-center">
                <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
                  {couriers.length}
                </div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-500 mt-1">
                  👥 TOPLAM KURYE
                </div>
              </div>
            </div>
          </div>

          {/* Kurye Kazanç Listesi */}
          <div className="space-y-3">
            {courierEarnings.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <p>Kurye bulunamadı</p>
              </div>
            ) : (
              courierEarnings.map((courier, index) => (
                <div 
                  key={courier.id}
                  className={`p-4 rounded-xl border transition-all ${
                    courier.earnings > 0
                      ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-slate-400">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                          {courier.full_name}
                          {courier.is_active && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              Aktif
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {courier.deliveredCount} paket × 80₺
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-green-600 dark:text-green-400">
                        {courier.earnings.toFixed(2)} ₺
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">hakediş</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bilgilendirme */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ <strong>Not:</strong> Kurye kazançları, teslim edilen her paket için 80₺ üzerinden hesaplanmaktadır. 
              Sadece <strong>status = 'delivered'</strong> olan paketler hesaplamaya dahildir.
            </p>
          </div>
        </div>
      )
    }
    
    // Kurye Kazançları (Hakediş) görünümü
    if (courierSubTab === 'earnings') {
      // Tarih filtresine göre başlangıç tarihini hesapla
      const getStartDate = () => {
        const now = new Date()
        const start = new Date()
        
        if (courierEarningsFilter === 'today') {
          start.setHours(0, 0, 0, 0)
        } else if (courierEarningsFilter === 'week') {
          start.setDate(now.getDate() - 7)
        } else if (courierEarningsFilter === 'month') {
          start.setDate(now.getDate() - 30)
        }
        
        return start
      }

      // Her kurye için kazanç hesapla
      const courierEarnings = couriers.map(courier => {
        const startDate = getStartDate()
        
        // Seçilen tarih aralığındaki delivered paketleri say
        const deliveredCount = deliveredPackages.filter(pkg => 
          pkg.courier_id === courier.id && 
          pkg.delivered_at && 
          new Date(pkg.delivered_at) >= startDate
        ).length
        
        const earnings = deliveredCount * 80
        
        return {
          ...courier,
          deliveredCount,
          earnings
        }
      }).sort((a, b) => b.earnings - a.earnings)

      const totalEarnings = courierEarnings.reduce((sum, c) => sum + c.earnings, 0)
      const totalDeliveries = courierEarnings.reduce((sum, c) => sum + c.deliveredCount, 0)

      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">💰 Kurye Kazançları (Hakediş)</h2>
            
            <select
              value={courierEarningsFilter}
              onChange={(e) => setCourierEarningsFilter(e.target.value as 'today' | 'week' | 'month')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 font-medium"
            >
              <option value="today">📅 Bugün</option>
              <option value="week">📅 Haftalık (7 Gün)</option>
              <option value="month">📅 Aylık (30 Gün)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
              <div className="text-center">
                <div className="text-3xl font-black text-green-700 dark:text-green-400">
                  {totalEarnings.toFixed(2)} ₺
                </div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-500 mt-1">
                  💰 TOPLAM HAKEDİŞ
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                  {totalDeliveries}
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                  📦 TOPLAM TESLİMAT
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
              <div className="text-center">
                <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
                  {couriers.length}
                </div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-500 mt-1">
                  👥 TOPLAM KURYE
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {courierEarnings.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <p>Kurye bulunamadı</p>
              </div>
            ) : (
              courierEarnings.map((courier, index) => (
                <div 
                  key={courier.id}
                  className={`p-4 rounded-xl border transition-all ${
                    courier.earnings > 0
                      ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-slate-400">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                          {courier.full_name}
                          {courier.is_active && (
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              Aktif
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {courier.deliveredCount} paket × 80₺
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-green-600 dark:text-green-400">
                        {courier.earnings.toFixed(2)} ₺
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">hakediş</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ <strong>Not:</strong> Kurye kazançları, teslim edilen her paket için 80₺ üzerinden hesaplanmaktadır. 
              Sadece <strong>status = 'delivered'</strong> olan paketler hesaplamaya dahildir.
            </p>
          </div>
        </div>
      )
    }
    
    // Kurye Performansları görünümü (default)
    const activeCouriers = couriers.filter(c => c.is_active)
    const sortedByPerformance = [...activeCouriers].sort((a, b) => 
      (b.todayDeliveryCount || 0) - (a.todayDeliveryCount || 0)
    )
    
    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">📊 Kurye Performansları</h2>
        
        {/* Günün En Hızlısı */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">🏆 Günün En Hızlısı</h3>
          
          {sortedByPerformance.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">😴</div>
              <p>Aktif kurye yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedByPerformance.map((courier, index) => (
                <div 
                  key={courier.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-orange-300 dark:border-orange-700' 
                      : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${
                        index === 0 ? 'text-orange-600' : 
                        index === 1 ? 'text-gray-500' : 
                        index === 2 ? 'text-amber-700' : 'text-slate-400'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                          {courier.full_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {courier.activePackageCount || 0} aktif paket
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-black ${
                        index === 0 ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {courier.todayDeliveryCount || 0}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">bugün teslim</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Kurye Kazançları (Hakediş) görünümü
  if (courierSubTab === 'earnings') {
    // Tarih filtresine göre başlangıç tarihini hesapla
    const getStartDate = () => {
      const now = new Date()
      const start = new Date()
      
      if (courierEarningsFilter === 'today') {
        start.setHours(0, 0, 0, 0)
      } else if (courierEarningsFilter === 'week') {
        start.setDate(now.getDate() - 7)
      } else if (courierEarningsFilter === 'month') {
        start.setDate(now.getDate() - 30)
      }
      
      return start
    }

    // Her kurye için kazanç hesapla
    const courierEarnings = couriers.map(courier => {
      const startDate = getStartDate()
      
      // Seçilen tarih aralığındaki delivered paketleri say
      const deliveredCount = deliveredPackages.filter(pkg => 
        pkg.courier_id === courier.id && 
        pkg.delivered_at && 
        new Date(pkg.delivered_at) >= startDate
      ).length
      
      const earnings = deliveredCount * 80
      
      return {
        ...courier,
        deliveredCount,
        earnings
      }
    }).sort((a, b) => b.earnings - a.earnings) // Kazanca göre sırala

    const totalEarnings = courierEarnings.reduce((sum, c) => sum + c.earnings, 0)
    const totalDeliveries = courierEarnings.reduce((sum, c) => sum + c.deliveredCount, 0)

    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">💰 Kurye Kazançları (Hakediş)</h2>
          
          {/* Tarih Filtresi */}
          <select
            value={courierEarningsFilter}
            onChange={(e) => setCourierEarningsFilter(e.target.value as 'today' | 'week' | 'month')}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 font-medium"
          >
            <option value="today">📅 Bugün</option>
            <option value="week">📅 Haftalık (7 Gün)</option>
            <option value="month">📅 Aylık (30 Gün)</option>
          </select>
        </div>

        {/* Genel Özet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
            <div className="text-center">
              <div className="text-3xl font-black text-green-700 dark:text-green-400">
                {totalEarnings.toFixed(2)} ₺
              </div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-500 mt-1">
                💰 TOPLAM HAKEDİŞ
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
            <div className="text-center">
              <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                {totalDeliveries}
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                📦 TOPLAM TESLİMAT
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
            <div className="text-center">
              <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
                {couriers.length}
              </div>
              <div className="text-sm font-semibold text-purple-600 dark:text-purple-500 mt-1">
                👥 TOPLAM KURYE
              </div>
            </div>
          </div>
        </div>

        {/* Kurye Kazanç Listesi */}
        <div className="space-y-3">
          {courierEarnings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">🚫</div>
              <p>Kurye bulunamadı</p>
            </div>
          ) : (
            courierEarnings.map((courier, index) => (
              <div 
                key={courier.id}
                className={`p-4 rounded-xl border transition-all ${
                  courier.earnings > 0
                    ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                    : 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-slate-400">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {courier.full_name}
                        {courier.is_active && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                            Aktif
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {courier.deliveredCount} paket × 80₺
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-green-600 dark:text-green-400">
                      {courier.earnings.toFixed(2)} ₺
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">hakediş</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bilgilendirme */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            ℹ️ <strong>Not:</strong> Kurye kazançları, teslim edilen her paket için 80₺ üzerinden hesaplanmaktadır. 
            Sadece <strong>status = 'delivered'</strong> olan paketler hesaplamaya dahildir.
          </p>
        </div>
      </div>
    )
  }

  function RestaurantsTab() {
    // Liste görünümü
    if (restaurantSubTab === 'list') {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">📋 Restoranlar Listesi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map(r => {
              const activeOrders = packages.filter(p => p.restaurant_id === r.id || p.restaurant?.name === r.name)
              const deliveredOrders = deliveredPackages.filter(p => p.restaurant_id === r.id || p.restaurant?.name === r.name)
              const totalOrders = activeOrders.length + deliveredOrders.length
              
              return (
                <div key={r.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-3">🍽️</span>
                    <h3 className="font-bold text-lg">{r.name}</h3>
                  </div>
                  
                  {/* İletişim Bilgileri */}
                  <div className="mb-3 space-y-1">
                    {r.phone && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-slate-500">📞</span>
                        <a href={`tel:${r.phone}`} className="text-xs text-blue-600 hover:underline">
                          {r.phone}
                        </a>
                      </div>
                    )}
                    {r.address && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-slate-500">📍</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {r.address}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* İstatistikler */}
                  <div className="space-y-2 text-sm pt-3 border-t dark:border-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Toplam Sipariş:</span>
                      <span className="font-bold text-blue-600">{totalOrders}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Aktif Sipariş:</span>
                      <span className="font-bold text-orange-600">{activeOrders.length}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Teslim Edilen:</span>
                      <span className="font-bold text-green-600">{deliveredOrders.length}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    
    // Restoranların Borcu görünümü
    if (restaurantSubTab === 'debt') {
      // Tarih filtresine göre başlangıç tarihini hesapla
      const getStartDate = () => {
        const now = new Date()
        const start = new Date()
        
        if (restaurantDebtFilter === 'today') {
          start.setHours(0, 0, 0, 0)
        } else if (restaurantDebtFilter === 'week') {
          start.setDate(now.getDate() - 7)
        } else if (restaurantDebtFilter === 'month') {
          start.setDate(now.getDate() - 30)
        }
        
        return start
      }

      // Her restoran için borç hesapla
      const restaurantDebts = restaurants.map(restaurant => {
        const startDate = getStartDate()
        
        // Seçilen tarih aralığındaki delivered paketleri say
        const deliveredCount = deliveredPackages.filter(pkg => 
          (pkg.restaurant_id === restaurant.id || pkg.restaurant?.name === restaurant.name) &&
          pkg.delivered_at && 
          new Date(pkg.delivered_at) >= startDate
        ).length
        
        const debt = deliveredCount * 100
        
        return {
          ...restaurant,
          deliveredCount,
          debt
        }
      }).sort((a, b) => b.debt - a.debt)

      const totalDebt = restaurantDebts.reduce((sum, r) => sum + r.debt, 0)
      const totalDeliveries = restaurantDebts.reduce((sum, r) => sum + r.deliveredCount, 0)

      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">💳 Restoranların Borcu (Cari Takip)</h2>
            
            <select
              value={restaurantDebtFilter}
              onChange={(e) => setRestaurantDebtFilter(e.target.value as 'today' | 'week' | 'month')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 font-medium"
            >
              <option value="today">📅 Bugün</option>
              <option value="week">📅 Haftalık (7 Gün)</option>
              <option value="month">📅 Aylık (30 Gün)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-xl border-2 border-red-300 dark:border-red-700">
              <div className="text-center">
                <div className="text-3xl font-black text-red-700 dark:text-red-400">
                  {totalDebt.toFixed(2)} ₺
                </div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-500 mt-1">
                  💳 TOPLAM ALACAK
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                  {totalDeliveries}
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                  📦 TOPLAM TESLİMAT
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
              <div className="text-center">
                <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
                  {restaurants.length}
                </div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-500 mt-1">
                  🍽️ TOPLAM RESTORAN
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {restaurantDebts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <p>Restoran bulunamadı</p>
              </div>
            ) : (
              restaurantDebts.map((restaurant, index) => (
                <div 
                  key={restaurant.id}
                  className={`p-4 rounded-xl border transition-all ${
                    restaurant.debt > 0
                      ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-slate-400">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                          🍽️ {restaurant.name}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {restaurant.deliveredCount} paket × 100₺
                        </p>
                        {restaurant.phone && (
                          <p className="text-xs text-slate-400 mt-1">
                            📞 {restaurant.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-red-600 dark:text-red-400">
                        {restaurant.debt.toFixed(2)} ₺
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">borç</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ <strong>Not:</strong> Restoran borçları, teslim edilen her paket için 100₺ üzerinden hesaplanmaktadır. 
              Sadece <strong>status = 'delivered'</strong> olan paketler hesaplamaya dahildir.
              <br />
              💡 <strong>Kâr Hesabı:</strong> Restoranlardan alınan 100₺ - Kuryelere ödenen 80₺ = 20₺ kâr (paket başına)
            </p>
          </div>
        </div>
      )
    }
    
    // Detay görünümü (Restoran Sipariş Detayları)
    if (restaurantSubTab === 'details') {
      // Tarih filtresine göre paketleri filtrele
      const getFilteredPackages = () => {
        const now = new Date()
        let startDate = new Date()
        
        if (restaurantChartFilter === 'today') {
          // Bugün gece 00:00'dan itibaren
        startDate.setHours(0, 0, 0, 0)
      } else if (restaurantChartFilter === 'week') {
        // Son 7 gün
        startDate.setDate(now.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
      } else if (restaurantChartFilter === 'month') {
        // Son 30 gün
        startDate.setDate(now.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
      }
      
      // delivered_at üzerinden filtrele
      const filtered = deliveredPackages.filter(pkg => 
        pkg.delivered_at && new Date(pkg.delivered_at) >= startDate
      )
      
      console.log('🔍 Filtre:', restaurantChartFilter)
      console.log('📅 Başlangıç Tarihi:', startDate.toISOString())
      console.log('📦 Toplam Delivered Paketler:', deliveredPackages.length)
      console.log('✅ Filtrelenmiş Paketler:', filtered.length)
      
      return filtered
    }
    
    const filteredPackages = getFilteredPackages()
    
    // Reduce ile restoran bazlı paket sayıları
    const restaurantPacketCounts = filteredPackages.reduce((acc, pkg) => {
      const name = pkg.restaurant?.name || 'Bilinmeyen'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {} as { [key: string]: number })
    
    // Reduce ile restoran bazlı cirolar
    const restaurantRevenues = filteredPackages.reduce((acc, pkg) => {
      const name = pkg.restaurant?.name || 'Bilinmeyen'
      acc[name] = (acc[name] || 0) + (pkg.amount || 0)
      return acc
    }, {} as { [key: string]: number })
    
    // Recharts için veri formatı - Pie Chart
    const pieChartData = Object.entries(restaurantPacketCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([name, count]) => ({
        name,
        value: count
      }))
    
    // Recharts için veri formatı - Bar Chart
    const barChartData = Object.entries(restaurantRevenues)
      .sort(([,a], [,b]) => b - a)
      .map(([name, revenue]) => ({
        name,
        ciro: revenue
      }))
    
    // Debugging
    console.log('📊 Pasta Verisi:', pieChartData)
    console.log('💰 Sütun Verisi:', barChartData)
    
    // Mergen Teknoloji teması renkleri
    const COLORS = ['#3B82F6', '#06B6D4', '#475569', '#0EA5E9', '#64748B', '#0284C7', '#334155']
    
    const hasData = pieChartData.length > 0
    
    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">📊 Restoran Sipariş Detayları</h2>
          <select
            value={restaurantChartFilter}
            onChange={(e) => setRestaurantChartFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
          >
            <option value="today">Bugün</option>
            <option value="week">Bu Hafta</option>
            <option value="month">Bu Ay</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Restoran Paket Dağılımı - Pie Chart */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
            <h3 className="text-lg font-bold mb-4">📦 Restoran Paket Dağılımı</h3>
            {!hasData ? (
              <div className="flex items-center justify-center h-[300px] text-slate-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">Veri bulunamadı</p>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e293b' : '#fff',
                        border: '1px solid #475569',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`${value} paket`, 'Paket Sayısı']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Restoran Ciroları - Bar Chart */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
            <h3 className="text-lg font-bold mb-4">💰 Restoran Ciroları</h3>
            {!hasData ? (
              <div className="flex items-center justify-center h-[300px] text-slate-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">Veri bulunamadı</p>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#475569' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: darkMode ? '#94a3b8' : '#475569', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: darkMode ? '#94a3b8' : '#475569' }}
                      label={{ value: 'Ciro (₺)', angle: -90, position: 'insideLeft', fill: darkMode ? '#94a3b8' : '#475569' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#1e293b' : '#fff',
                        border: '1px solid #475569',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [`${value.toFixed(2)} ₺`, 'Ciro']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="ciro" 
                      fill="#10b981" 
                      name="Ciro (₺)"
                      label={{ 
                        position: 'bottom', 
                        fill: darkMode ? '#10b981' : '#059669',
                        formatter: (value: any) => `${value.toFixed(0)}₺`
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    )
    } // End of details view
    
    // Restoranların Ödemesi görünümü
    if (restaurantSubTab === 'payments') {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">💰 Restoranların Ödemesi</h2>
          
          {/* Restoran Durumu Özeti */}
          <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="font-bold mb-2">📊 Restoran Ödeme Durumu Özeti:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{restaurants.length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Restoran</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {restaurants.reduce((sum, r) => sum + (r.totalOrders || 0), 0)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Sipariş</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {restaurants.reduce((sum, r) => sum + (r.totalRevenue || 0), 0).toFixed(2)} ₺
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Ciro</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {restaurants.reduce((sum, r) => sum + (r.totalDebt || 0), 0).toFixed(2)} ₺
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Borç</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 text-center">
              Son güncelleme: {new Date().toLocaleTimeString('tr-TR')} • Otomatik güncelleme: 30 saniye
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <div className="font-bold">Restoran bulunamadı!</div>
                <div className="text-sm mt-2">Restaurants tablosunda veri yok.</div>
              </div>
            ) : (
              restaurants.map(r => (
                <div key={r.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
                  <div className="flex justify-between items-start mb-3">
                    <button
                      onClick={() => handleRestaurantClick(r.id)}
                      className="font-bold text-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer text-left"
                    >
                      🍽️ {r.name}
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Toplam Sipariş:</span>
                      <span className="font-bold text-blue-600">{r.totalOrders || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Toplam Ciro:</span>
                      <span className="font-bold text-green-600">{(r.totalRevenue || 0).toFixed(2)} ₺</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Restorana Borcum:</span>
                      <span className={`font-bold ${
                        (r.totalDebt || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {(r.totalDebt || 0).toFixed(2)} ₺
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600 space-y-2">
                      <button
                        onClick={() => handleRestaurantClick(r.id)}
                        className="w-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        📊 Detaylı Rapor Görüntüle
                      </button>
                      
                      {(r.totalDebt || 0) > 0 && (
                        <button
                          onClick={() => {
                            setSelectedRestaurantId(r.id)
                            fetchRestaurantDebts(r.id)
                            setShowRestaurantDebtPayModal(true)
                          }}
                          className="w-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          💳 Borç Öde
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }
  }

}
