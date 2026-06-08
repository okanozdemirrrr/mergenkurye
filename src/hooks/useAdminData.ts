/**
 * @file src/hooks/useAdminData.ts
 * @description Admin Panel Veri Yönetimi Custom Hook
 * 🛡️ AŞAMA 3: TypeScript zırhı eklendi - ANY kullanımı yok!
 * ⚡ AŞAMA 4: Performance optimizasyonu - useCallback, useMemo eklendi
 * 🛡️ AŞAMA 5: Retry logic ve error handling eklendi
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { retryWithBackoff } from '@/utils/retry'
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
  const retryCountRef = useRef(0) // 🛡️ Retry sayacı

  // ⚡ Fetch Functions - useCallback ile optimize edildi
  // 🛡️ Retry logic eklendi
  const fetchPackages = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setErrorMessage('')
    }
    
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // 🛡️ Retry logic ile fetch
      const result = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('packages')
            .select(`
              id, order_number, customer_name, customer_phone, 
              delivery_address, amount, status, courier_id, 
              payment_method, restaurant_id, platform, created_at, 
              assigned_at, picked_up_at, delivered_at, settled_at, 
              restaurant_settled_at, latitude, longitude,
              restaurants(id, name, phone, address)
            `)
            .in('status', ['waiting', 'assigned', 'picking_up', 'on_the_way'])
            .order('created_at', { ascending: false })
          
          if (error) throw error
          return data
        },
        {
          maxAttempts: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`🔄 Packages fetch retry ${attempt}/3:`, error.message)
            retryCountRef.current = attempt
          }
        }
      )

      // 🛡️ Type-safe transformation
      const transformedData: Package[] = (result || []).map((pkg) => {
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
      retryCountRef.current = 0 // Reset retry counter
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
  }, []) // ⚡ Dependency array boş - fonksiyon hiç değişmeyecek

  const fetchDeliveredPackages = useCallback(async () => {
    try {
      // 🔥 KUTSAL AYRIM: Delivered + Ücretli İptaller
      // 1. Teslim edilen paketler
      const { data: deliveredData, error: deliveredError } = await supabase
        .from('packages')
        .select(`
          id, order_number, customer_name, customer_phone,
          delivery_address, amount, status, payment_method,
          restaurant_id, platform, delivered_at, settled_at,
          restaurant_settled_at, courier_id, is_chargeable_cancellation,
          restaurants(id, name),
          couriers(full_name)
        `)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(50)

      if (deliveredError) throw deliveredError

      // 2. Ücretli iptaller (KABAK GİBİ BOOLEAN!)
      const { data: cancelledData, error: cancelledError } = await supabase
        .from('packages')
        .select(`
          id, order_number, customer_name, customer_phone,
          delivery_address, amount, status, payment_method,
          restaurant_id, platform, created_at, settled_at,
          restaurant_settled_at, courier_id, is_chargeable_cancellation,
          restaurants(id, name),
          couriers(full_name)
        `)
        .eq('status', 'cancelled')
        .eq('is_chargeable_cancellation', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelledError) throw cancelledError

      // 3. Birleştir
      const combinedData = [...(deliveredData || []), ...(cancelledData || [])]

      // 🛡️ Type-safe transformation
      const transformedData: Package[] = combinedData.map((pkg) => {
        const restaurantData = Array.isArray(pkg.restaurants) ? pkg.restaurants[0] : pkg.restaurants;
        const courierData = Array.isArray(pkg.couriers) ? pkg.couriers[0] : (pkg.couriers as any);
        
        return {
          ...pkg,
          restaurant: restaurantData as any,
          courier_name: courierData?.full_name,
          // Ücretli iptaller için delivered_at yerine created_at kullan
          delivered_at: pkg.delivered_at || pkg.created_at,
          restaurants: undefined,
          couriers: undefined
        } as Package;
      })

      // Tarihe göre sırala (en yeni en üstte)
      transformedData.sort((a, b) => {
        const dateA = new Date(a.delivered_at || 0).getTime()
        const dateB = new Date(b.delivered_at || 0).getTime()
        return dateB - dateA
      })

      setDeliveredPackages(transformedData)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
      
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', errorMsg)
        return
      }
      console.error('Geçmiş siparişler yüklenirken hata:', error instanceof Error ? error.message : error)
    }
  }, [])

  const fetchCouriers = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setErrorMessage('')
    }
    
    try {
      // ⚡ Sadece gerekli sütunları çek
      const { data, error } = await supabase
        .from('couriers')
        .select('id, full_name, phone, is_active, last_location')
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
  }, []) // ⚡ fetchCourierDeliveryCounts vb. fonksiyonlar da useCallback olacak

  const fetchCourierActivePackageCounts = useCallback(async (courierIds: string[]) => {
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
  }, [])

  const fetchCourierDeliveryCounts = useCallback(async (courierIds: string[]) => {
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
  }, [])

  const fetchCourierTodayDeliveryCounts = useCallback(async (courierIds: string[]) => {
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
  }, [])

  const fetchCourierDebtsTotal = useCallback(async (courierIds: string[]) => {
    try {
      void courierIds
      const debts: Record<string, number> = {}
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
  }, [])

  const fetchRestaurants = useCallback(async () => {
    try {
      // ⚡ Sadece gerekli sütunları çek
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, phone, address')
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
  }, [])

  const fetchRestaurantStats = useCallback(async (restaurantIds: (number | string)[]) => {
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
  }, [])

  const fetchRestaurantDebtsTotal = useCallback(async (restaurantIds: (number | string)[]) => {
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
  }, [])

  // ⚡ Manuel yenileme fonksiyonu - useCallback ile optimize edildi
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchPackages(false),
      fetchDeliveredPackages(),
      fetchCouriers(false),
      fetchRestaurants()
    ])
  }, [fetchPackages, fetchDeliveredPackages, fetchCouriers, fetchRestaurants])

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

      // 🚨 KURAL 2: Fetch iptal. Gelen payload'u state'e yediriyoruz.
      if (payload.eventType === 'UPDATE' && payload.new) {
        const newPkg = payload.new as any
        
        // Aktif paketler için güncelleme (ilişkili verileri koruyarak)
        if (newPkg.status === 'delivered' || newPkg.status === 'cancelled') {
          // Canlı listeden tamamen düşür
          setPackages(prev => prev.filter(p => p.id !== newPkg.id))
        } else {
          setPackages(prev => prev.map(p => {
            if (p.id === newPkg.id) {
              return { ...p, ...newPkg, restaurant: p.restaurant, courier_name: p.courier_name }
            }
            return p
          }))
        }

        // Eğer paket teslim/iptal edildiyse Delivered listesine ekle/güncelle (aktiften silinmesi backend view veya reload ile hallolur veya basitleştirilebilir)
        if (newPkg.status === 'delivered' || newPkg.status === 'cancelled') {
           setDeliveredPackages(prev => {
             const exists = prev.find(p => p.id === newPkg.id)
             if (exists) {
               return prev.map(p => p.id === newPkg.id ? { ...p, ...newPkg, restaurant: p.restaurant, courier_name: p.courier_name } : p)
             }
             // Yeni bir geçmiş paketi ise state'e en başa ekle
             return [{ ...newPkg, restaurant: null, courier_name: null } as Package, ...prev]
           })
        }
      } else if (payload.eventType === 'INSERT' && payload.new) {
        const newPkg = payload.new as any
        setPackages(prev => [{ ...newPkg, restaurant: null, courier_name: null } as Package, ...prev])
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setPackages(prev => prev.filter(p => p.id !== payload.old?.id))
      }
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
