/**
 * @file src/hooks/useAdminData.ts
 * @description Admin Panel Veri Yönetimi Custom Hook
 * AŞAMA 2: Tüm veri çekme, realtime ve state yönetimi buraya taşındı
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'

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
  order_number?: string
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
  platform?: string
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  settled_at?: string | null
  restaurant_settled_at?: string | null
  courier_name?: string
}

interface Courier {
  id: string
  full_name?: string
  phone?: string
  deliveryCount?: number
  todayDeliveryCount?: number
  is_active?: boolean
  activePackageCount?: number
  status?: 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'
  totalDebt?: number
}

interface UseAdminDataReturn {
  // Veriler
  packages: Package[]
  deliveredPackages: Package[]
  couriers: Courier[]
  restaurants: Restaurant[]
  
  // Durumlar
  isLoading: boolean
  errorMessage: string
  
  // Fonksiyonlar
  refreshData: () => Promise<void>
  setPackages: React.Dispatch<React.SetStateAction<Package[]>>
  setCouriers: React.Dispatch<React.SetStateAction<Courier[]>>
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>
}

export function useAdminData(isLoggedIn: boolean): UseAdminDataReturn {
  // State
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Refs
  const lastAdminActionTimeRef = useRef(0)

  // Fetch Functions
  const fetchPackages = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setErrorMessage('')
    }
    
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(*)')
        .is('courier_id', null)
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

      setPackages(transformedData)
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      if (isInitialLoad) {
        console.error('Siparişler yüklenirken hata:', error)
        setErrorMessage('Siparişler yüklenirken hata: ' + error.message)
      }
    }
  }

  const fetchDeliveredPackages = async () => {
    try {
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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      console.error('Geçmiş siparişler yüklenirken hata:', error.message)
    }
  }

  const fetchCouriers = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setErrorMessage('')
    }
    
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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      
      if (isInitialLoad) {
        setErrorMessage('Kuryeler yüklenemedi: ' + error.message)
      }
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
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }
      console.error('Kurye bugünkü teslimat sayıları alınırken hata:', error)
    }
  }

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
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', error.message)
        setCouriers(prev => prev.map(c => ({ ...c, totalDebt: 0 })))
        return
      }
      console.error('Kurye borçları alınırken hata:', error)
    }
  }

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      
      const restaurantsData = (data || []).map(r => ({
        ...r,
        totalOrders: 0,
        totalRevenue: 0,
        totalDebt: 0
      }))
      
      setRestaurants(restaurantsData)
      
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
      console.error('Restoranlar yüklenirken hata:', error)
    }
  }

  const fetchRestaurantStats = async (restaurantIds: (number | string)[]) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('restaurant_id, amount')
        .eq('status', 'delivered')
        .in('restaurant_id', restaurantIds)

      if (error) throw error

      const stats: { [key: string]: { orders: number; revenue: number } } = {}
      data?.forEach((pkg) => {
        const id = String(pkg.restaurant_id)
        if (!stats[id]) {
          stats[id] = { orders: 0, revenue: 0 }
        }
        stats[id].orders += 1
        stats[id].revenue += pkg.amount || 0
      })

      setRestaurants(prev => prev.map(r => ({
        ...r,
        totalOrders: stats[String(r.id)]?.orders || 0,
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
        const id = String(debt.restaurant_id)
        debts[id] = (debts[id] || 0) + debt.remaining_amount
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

  // Manuel yenileme fonksiyonu
  const refreshData = async () => {
    await Promise.all([
      fetchPackages(false),
      fetchDeliveredPackages(),
      fetchCouriers(false),
      fetchRestaurants()
    ])
  }

  // İlk yükleme
  useEffect(() => {
    if (!isLoggedIn) return

    const loadInitialData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchPackages(true),
        fetchDeliveredPackages(),
        fetchCouriers(true),
        fetchRestaurants()
      ])
      setIsLoading(false)
    }

    loadInitialData()
  }, [isLoggedIn])

  // Realtime subscriptions
  useEffect(() => {
    if (!isLoggedIn) return

    console.log('🔴 Admin Realtime dinleme başlatıldı')

    const ANTI_LOOP_DELAY = 2000

    const handlePackageChange = async (payload: any) => {
      const now = Date.now()
      
      if (now - lastAdminActionTimeRef.current < ANTI_LOOP_DELAY) {
        console.log('🔒 Anti-Loop: Admin işlemi, Realtime atlandı')
        return
      }

      await fetchPackages(false)
      await fetchDeliveredPackages()
    }

    const handleCourierChange = async () => {
      await fetchCouriers(false)
    }

    const handleRestaurantChange = async () => {
      await fetchRestaurants()
    }

    const channel = supabase
      .channel('admin-realtime-all-events', {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        handlePackageChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couriers'
        },
        handleCourierChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurants'
        },
        handleRestaurantChange
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin Realtime bağlantısı kuruldu')
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime bağlantı hatası:', err)
          setTimeout(() => {
            console.log('🔄 Realtime yeniden bağlanıyor...')
            channel.subscribe()
          }, 5000)
        }
        if (status === 'TIMED_OUT') {
          console.warn('⏱️ Realtime zaman aşımı, yeniden bağlanıyor...')
          setTimeout(() => {
            channel.subscribe()
          }, 5000)
        }
      })

    return () => {
      console.log('🔴 Admin Realtime dinleme durduruldu')
      supabase.removeChannel(channel)
    }
  }, [isLoggedIn])

  return {
    packages,
    deliveredPackages,
    couriers,
    restaurants,
    isLoading,
    errorMessage,
    refreshData,
    setPackages,
    setCouriers,
    setRestaurants
  }
}
