/**
 * @file src/app/admin/AdminDataProvider.tsx
 * @description Admin Panel için merkezi veri yönetimi
 * Tüm admin sayfaları bu provider'dan veri alır
 */
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Package, Courier, Restaurant, CourierDebt, RestaurantDebt } from '@/types'

interface AdminDataContextType {
  // Data
  packages: Package[]
  deliveredPackages: Package[]
  couriers: Courier[]
  restaurants: Restaurant[]
  todayDeliveredCount: number
  
  // Loading states
  isLoading: boolean
  
  // Messages
  successMessage: string
  errorMessage: string
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
  
  // Modal states
  selectedCourierId: string | null
  setSelectedCourierId: (id: string | null) => void
  selectedRestaurantId: number | string | null
  setSelectedRestaurantId: (id: number | string | null) => void
  
  // Refresh functions
  fetchPackages: () => Promise<void>
  fetchDeliveredPackages: () => Promise<void>
  fetchCouriers: () => Promise<void>
  fetchRestaurants: () => Promise<void>
  fetchTodayDeliveredCount: () => Promise<void>
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined)

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [todayDeliveredCount, setTodayDeliveredCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | string | null>(null)

  const fetchPackages = async () => {
    try {
      // ✅ TÜM AKTİF STATUSLER - TARİH FİLTRESİ YOK
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(*)')
        .in('status', ['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up', 'on_the_way'])
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('📦 Admin Panel - Aktif siparişler:', {
        total: data?.length || 0,
        byStatus: {
          new_order: data?.filter(p => p.status === 'new_order').length || 0,
          getting_ready: data?.filter(p => p.status === 'getting_ready').length || 0,
          ready: data?.filter(p => p.status === 'ready').length || 0,
          assigned: data?.filter(p => p.status === 'assigned').length || 0,
          picking_up: data?.filter(p => p.status === 'picking_up').length || 0,
          on_the_way: data?.filter(p => p.status === 'on_the_way').length || 0
        }
      })

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0
          ? pkg.restaurants[0]
          : pkg.restaurants || null,
        restaurants: undefined
      }))

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

      console.log('📦 AdminDataProvider - Teslim edilmiş paketler:', {
        count: data?.length || 0,
        sample: data?.slice(0, 3).map(p => ({
          id: p.id,
          status: p.status,
          amount: p.amount,
          payment_method: p.payment_method,
          delivered_at: p.delivered_at,
          courier_id: p.courier_id,
          applied_price: p.applied_price
        }))
      })

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        courier_name: pkg.couriers?.full_name,
        restaurants: undefined,
        couriers: undefined
      }))

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
        return dateB - dateA
      })

      console.log('📦 AdminDataProvider - Transform sonrası:', {
        count: transformedData.length,
        deliveredCount: transformedData.filter(p => p.status === 'delivered').length
      })

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

      // Bugünün başlangıcı
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // Her kurye için borç ve teslimat bilgilerini çek
      const couriersWithData = await Promise.all(
        (data || []).map(async (courier) => {
          // Bekleyen borçları çek
          const { data: debts } = await supabase
            .from('courier_debts')
            .select('remaining_amount')
            .eq('courier_id', courier.id)
            .eq('status', 'pending')

          const totalDebt = (debts || []).reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0)

          // Bugün teslim edilen paketleri çek (delivered_by_courier_id kullan)
          const { data: todayDeliveries } = await supabase
            .from('packages')
            .select('id')
            .eq('delivered_by_courier_id', courier.id)  // courier_id yerine delivered_by_courier_id
            .eq('status', 'delivered')
            .gte('delivered_at', todayStart.toISOString())

          const todayDeliveryCount = (todayDeliveries || []).length

          // Aktif paketleri çek (assigned, picking_up, on_the_way)
          const { data: activePackages } = await supabase
            .from('packages')
            .select('id')
            .eq('courier_id', courier.id)
            .in('status', ['assigned', 'picking_up', 'on_the_way'])

          const activePackageCount = (activePackages || []).length

          // Toplam teslimat sayısı (delivered_by_courier_id kullan)
          const { data: allDeliveries } = await supabase
            .from('packages')
            .select('id')
            .eq('delivered_by_courier_id', courier.id)  // courier_id yerine delivered_by_courier_id
            .eq('status', 'delivered')

          const deliveryCount = (allDeliveries || []).length

          return {
            ...courier,
            id: courier.id,
            full_name: courier.full_name || 'İsimsiz Kurye',
            is_active: Boolean(courier.is_active),
            deliveryCount,
            todayDeliveryCount,
            activePackageCount,
            totalDebt
          }
        })
      )

      setCouriers(couriersWithData)
    } catch (error: any) {
      console.error('Kuryeler yüklenemedi:', error)
    }
  }

  const fetchRestaurants = async () => {
    console.log('🍽️ fetchRestaurants başladı')
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      console.log('🍽️ Restaurants çekildi:', data?.length, data)
      setRestaurants(data || [])
    } catch (error: any) {
      console.error('Restoranlar yüklenemedi:', error)
    }
  }

  const fetchTodayDeliveredCount = async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count, error } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString())

      if (error) throw error
      setTodayDeliveredCount(count || 0)
    } catch (error: any) {
      console.error('Günlük teslimat sayısı yüklenemedi:', error)
      setTodayDeliveredCount(0)
    }
  }

  useEffect(() => {
    fetchPackages()
    fetchDeliveredPackages()
    fetchCouriers()
    fetchRestaurants()
    fetchTodayDeliveredCount()

    // 🔥 ÇELİK GİBİ REALTIME BAĞLANTI - SESSIZ YENİDEN BAĞLANMA
    let packagesChannel: any = null
    let couriersChannel: any = null
    let courierDebtsChannel: any = null
    let reconnectTimers: NodeJS.Timeout[] = []

    const setupRealtimeWithRetry = async (
      channelName: string,
      table: string,
      callback: () => void,
      retryCount = 0
    ) => {
      try {
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', { event: '*', schema: 'public', table }, callback)

        const status = await new Promise<string>((resolve) => {
          channel.subscribe((status) => {
            resolve(status)
          })
        })

        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime bağlandı: ${channelName}`)
          return channel
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`⚠️ Realtime bağlantı hatası: ${channelName} - ${status}`)
          
          // Sessiz yeniden bağlanma (3 saniye sonra)
          const timer = setTimeout(() => {
            console.log(`🔄 Yeniden bağlanılıyor: ${channelName}`)
            setupRealtimeWithRetry(channelName, table, callback, retryCount + 1)
          }, 3000)
          
          reconnectTimers.push(timer)
          return null
        }

        return channel
      } catch (error) {
        console.error(`❌ Realtime subscription hatası: ${channelName}`, error)
        
        // Hata durumunda da yeniden bağlanmayı dene (maksimum 10 deneme)
        if (retryCount < 10) {
          const timer = setTimeout(() => {
            console.log(`🔄 Hata sonrası yeniden bağlanılıyor: ${channelName} (Deneme: ${retryCount + 1})`)
            setupRealtimeWithRetry(channelName, table, callback, retryCount + 1)
          }, 3000)
          
          reconnectTimers.push(timer)
        } else {
          console.error(`❌ Maksimum yeniden bağlanma denemesi aşıldı: ${channelName}`)
        }
        
        return null
      }
    }

    // Packages channel
    setupRealtimeWithRetry('packages-changes', 'packages', () => {
      fetchPackages()
      fetchDeliveredPackages()
      fetchTodayDeliveredCount()
    }).then(channel => { packagesChannel = channel })

    // Couriers channel
    setupRealtimeWithRetry('couriers-changes', 'couriers', () => {
      fetchCouriers()
    }).then(channel => { couriersChannel = channel })

    // Courier debts channel
    setupRealtimeWithRetry('courier-debts-changes', 'courier_debts', () => {
      fetchCouriers()
    }).then(channel => { courierDebtsChannel = channel })

    // 30 saniyelik otomatik yenileme (polling)
    const refreshInterval = setInterval(() => {
      fetchPackages()
      fetchDeliveredPackages()
      fetchCouriers()
      fetchRestaurants()
      fetchTodayDeliveredCount()
    }, 30000)

    return () => {
      // Tüm reconnect timer'larını temizle
      reconnectTimers.forEach(timer => clearTimeout(timer))
      
      // Kanalları temizle
      if (packagesChannel) supabase.removeChannel(packagesChannel)
      if (couriersChannel) supabase.removeChannel(couriersChannel)
      if (courierDebtsChannel) supabase.removeChannel(courierDebtsChannel)
      
      clearInterval(refreshInterval)
    }
  }, [])

  return (
    <AdminDataContext.Provider
      value={{
        packages,
        deliveredPackages,
        couriers,
        restaurants,
        todayDeliveredCount,
        isLoading,
        successMessage,
        errorMessage,
        setSuccessMessage,
        setErrorMessage,
        selectedCourierId,
        setSelectedCourierId,
        selectedRestaurantId,
        setSelectedRestaurantId,
        fetchPackages,
        fetchDeliveredPackages,
        fetchCouriers,
        fetchRestaurants,
        fetchTodayDeliveredCount
      }}
    >
      {children}
    </AdminDataContext.Provider>
  )
}

export function useAdminData() {
  const context = useContext(AdminDataContext)
  if (context === undefined) {
    throw new Error('useAdminData must be used within AdminDataProvider')
  }
  return context
}
