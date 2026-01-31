/**
 * @file src/hooks/useAdminData.ts
 * @description Admin Panel Veri Yönetimi Custom Hook
 * 🛡️ AŞAMA 3: TypeScript zırhı eklendi - ANY kullanımı yok!
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { 
  Package, 
  Courier, 
  Restaurant, 
  UseAdminDataReturn,
  CourierLocation 
} from '@/types'

export function useAdminData(isLoggedIn: boolean): UseAdminDataReturn {
  // State - Artık kesin tipli!
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Refs
  const lastAdminActionTimeRef = useRef(0)

  // Fetch Functions - Artık tip güvenli!
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

      // 🛡️ Type-safe transformation
      const transformedData: Package[] = (data || []).map((pkg) => {
        const restaurantData = Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0 
          ? pkg.restaurants[0] 
          : pkg.restaurants || null

        return {
          ...pkg,
          restaurant: restaurantData as Restaurant | null,
          restaurants: undefined
        } as Package
      })

      setPackages(transformedData)
    } catch (error) {
      // 🛡️ Graceful error handling
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
        return
      }
      
      if (isInitialLoad) {
        console.error('Siparişler yüklenirken hata:', error)
        setErrorMessage(`Siparişler yüklenirken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
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

      // 🛡️ Type-safe transformation
      const transformedData: Package[] = (data || []).map((pkg) => ({
        ...pkg,
        restaurant: pkg.restaurants as Restaurant | null,
        courier_name: pkg.couriers?.full_name,
        restaurants: undefined,
        couriers: undefined
      } as Package))

      setDeliveredPackages(transformedData)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
        return
      }
      console.error('Geçmiş siparişler yüklenirken hata:', error instanceof Error ? error.message : error)
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
      
      // 🛡️ Type-safe courier data
      const couriersData: Courier[] = data.map(courier => ({
        ...courier,
        id: courier.id,
        full_name: courier.full_name || 'İsimsiz Kurye',
        is_active: Boolean(courier.is_active),
        deliveryCount: 0,
        todayDeliveryCount: 0,
        activePackageCount: 0,
        last_location: courier.last_location as CourierLocation | null
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
        return
      }
      
      if (isInitialLoad) {
        setErrorMessage(`Kuryeler yüklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
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

      // 🛡️ Type-safe counting
      const counts: Record<string, number> = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        activePackageCount: counts[c.id] || 0 
      })))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
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

      const counts: Record<string, number> = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        deliveryCount: counts[c.id] || 0 
      })))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
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

      const counts: Record<string, number> = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        todayDeliveryCount: counts[c.id] || 0 
      })))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
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

      const debts: Record<string, number> = {}
      data?.forEach((debt) => { 
        if (debt.courier_id) {
          debts[debt.courier_id] = (debts[debt.courier_id] || 0) + debt.remaining_amount
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        totalDebt: debts[c.id] || 0 
      })))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', errorMsg)
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
      
      // 🛡️ Type-safe restaurant data
      const restaurantsData: Restaurant[] = (data || []).map(r => ({
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
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

      const stats: Record<string, { orders: number; revenue: number }> = {}
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
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

      const debts: Record<string, number> = {}
      data?.forEach((debt) => {
        const id = String(debt.restaurant_id)
        debts[id] = (debts[id] || 0) + debt.remaining_amount
      })

      setRestaurants(prev => prev.map(r => ({
        ...r,
        totalDebt: debts[String(r.id)] || 0
      })))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || 
          errorMsg.includes('network') || 
          errorMsg.includes('could not find') ||
          errorMsg.includes('table') ||
          errorMsg.includes('schema cache')) {
        console.warn('⚠️ Borç tablosu henüz oluşturulmamış veya bağlantı hatası (sessiz):', errorMsg)
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

  // Realtime subscriptions - 🛡️ Type-safe event handlers
  useEffect(() => {
    if (!isLoggedIn) return

    console.log('🔴 Admin Realtime dinleme başlatıldı')

    const ANTI_LOOP_DELAY = 2000

    // 🛡️ Type-safe payload handling
    interface RealtimePayload {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      new?: Record<string, unknown>
      old?: Record<string, unknown>
    }

    const handlePackageChange = async (payload: RealtimePayload) => {
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
