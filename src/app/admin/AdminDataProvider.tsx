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
      // ⚡ EGRESS OPTİMİZASYONU: Sadece gerekli kolonlar + limit
      const { data, error } = await supabase
        .from('packages')
        .select('id, order_number, status, amount, payment_method, customer_name, customer_phone, delivery_address, content, created_at, getting_ready_at, ready_at, assigned_at, picked_up_at, delivered_at, courier_id, restaurant_id, restaurants(id, name, phone)')
        .in('status', ['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up', 'on_the_way'])
        .order('created_at', { ascending: false })
        .limit(500) // ⚡ Maksimum 500 aktif sipariş

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
      // ⚡ EGRESS OPTİMİZASYONU: Sadece son 7 günün delivered/cancelled paketleri
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data, error } = await supabase
        .from('packages')
        .select('id, order_number, status, amount, payment_method, customer_name, customer_phone, delivery_address, content, created_at, getting_ready_at, ready_at, assigned_at, picked_up_at, delivered_at, cancelled_at, courier_id, restaurant_id, applied_price, delivered_by_courier_id, restaurants(id, name), couriers!packages_courier_id_fkey(id, full_name)')
        .in('status', ['delivered', 'cancelled'])
        .gte('created_at', sevenDaysAgo.toISOString()) // ⚡ Son 7 gün
        .order('created_at', { ascending: false })
        .limit(1000) // ⚡ Maksimum 1000 kayıt

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
      // ⚡ EGRESS OPTİMİZASYONU: Sadece gerekli courier kolonları
      const { data, error } = await supabase
        .from('couriers')
        .select('id, username, full_name, is_active, package_rate, payment_type, account_status')
        .order('full_name', { ascending: true })

      if (error) throw error

      // BUSINESS DAY LOGIC: İş günü sabah 05:00'da başlar
      const now = new Date()
      const currentHour = now.getHours()
      
      const todayStart = new Date(now)
      if (currentHour < 5) {
        // Gece yarısından sonra, dün sabah 05:00
        todayStart.setDate(todayStart.getDate() - 1)
      }
      todayStart.setHours(5, 0, 0, 0)

      console.log('📅 Admin Panel - Business Day Start:', todayStart.toISOString())

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

          // Bugün teslim edilen paketleri çek (delivered + ücretli iptaller)
          const { data: todayDeliveries } = await supabase
            .from('packages')
            .select('id, status, is_chargeable_cancellation')
            .eq('delivered_by_courier_id', courier.id)
            .or('status.eq.delivered,and(status.eq.cancelled,is_chargeable_cancellation.eq.true)')
            .gte('delivered_at', todayStart.toISOString())

          const todayDeliveryCount = (todayDeliveries || []).length

          // Aktif paketleri çek (assigned, picking_up, on_the_way)
          const { data: activePackages } = await supabase
            .from('packages')
            .select('id')
            .eq('courier_id', courier.id)
            .in('status', ['assigned', 'picking_up', 'on_the_way'])

          const activePackageCount = (activePackages || []).length

          // Bu haftanın teslimat sayısı (Pazartesi 05:00'den itibaren, delivered + ücretli iptaller)
          const now2 = new Date()
          const dayOfWeek = now2.getDay() // 0=Pazar, 1=Pazartesi...
          const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          const weekStart = new Date(now2)
          weekStart.setDate(weekStart.getDate() - diffToMonday)
          weekStart.setHours(5, 0, 0, 0)
          // Eğer şu an Pazartesi 05:00'den önceyse, geçen haftanın Pazartesisini al
          if (now2 < weekStart) {
            weekStart.setDate(weekStart.getDate() - 7)
          }

          const { data: weeklyDeliveries } = await supabase
            .from('packages')
            .select('id')
            .eq('delivered_by_courier_id', courier.id)
            .or('status.eq.delivered,and(status.eq.cancelled,is_chargeable_cancellation.eq.true)')
            .gte('delivered_at', weekStart.toISOString())

          const weeklyDeliveryCount = (weeklyDeliveries || []).length

          return {
            ...courier,
            id: courier.id,
            full_name: courier.full_name || 'İsimsiz Kurye',
            is_active: Boolean(courier.is_active),
            deliveryCount: weeklyDeliveryCount, // Geriye uyumluluk için
            weeklyDeliveryCount,
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
      // ⚡ EGRESS OPTİMİZASYONU: Sadece gerekli restaurant kolonları
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, phone, address, package_fee, is_active, logo_url')
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
      // BUSINESS DAY LOGIC: İş günü sabah 05:00'da başlar
      const now = new Date()
      const currentHour = now.getHours()
      
      const todayStart = new Date(now)
      if (currentHour < 5) {
        todayStart.setDate(todayStart.getDate() - 1)
      }
      todayStart.setHours(5, 0, 0, 0)

      console.log('📅 Admin Panel - Today Delivered Count Start:', todayStart.toISOString())

      // ⚡ EGRESS OPTİMİZASYONU: head: true ile sadece count çek, veri çekme!
      // Delivered + Ücretli İptaller
      const { count, error } = await supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.delivered,and(status.eq.cancelled,is_chargeable_cancellation.eq.true)')
        .gte('delivered_at', todayStart.toISOString())

      if (error) throw error
      console.log('📊 Bugün teslim edilen toplam (delivered + ücretli iptaller):', count)
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

    // ⚡ REALTIME OPTİMİZASYONU: Full refetch yerine incremental update
    setupRealtimeWithRetry('packages-changes', 'packages', async (payload: any) => {
      console.log('📦 Realtime package event:', payload.eventType, payload.new?.id)
      
      if (payload.eventType === 'INSERT') {
        // Yeni paket eklendi - restaurant bilgisini çek ve state'e ekle
        const newPackage = payload.new
        if (['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up', 'on_the_way'].includes(newPackage.status)) {
          // Restaurant bilgisini çek
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id, name, phone')
            .eq('id', newPackage.restaurant_id)
            .single()
          
          const packageWithRestaurant = {
            ...newPackage,
            restaurant: restaurant || null
          }
          
          setPackages(prev => [packageWithRestaurant, ...prev].slice(0, 500))
        }
      } else if (payload.eventType === 'UPDATE') {
        // Paket güncellendi - sadece bu paketi güncelle
        const updatedPackage = payload.new
        setPackages(prev => {
          const index = prev.findIndex(p => p.id === updatedPackage.id)
          if (index !== -1) {
            const newList = [...prev]
            // Mevcut restaurant bilgisini koru
            newList[index] = { ...newList[index], ...updatedPackage }
            return newList
          }
          return prev
        })
        
        // Delivered/cancelled ise deliveredPackages'e ekle
        if (['delivered', 'cancelled'].includes(updatedPackage.status)) {
          // Restaurant bilgisini çek
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id, name')
            .eq('id', updatedPackage.restaurant_id)
            .single()
          
          const packageWithRestaurant = {
            ...updatedPackage,
            restaurant: restaurant || null
          }
          
          setDeliveredPackages(prev => [packageWithRestaurant, ...prev].slice(0, 1000))
          setPackages(prev => prev.filter(p => p.id !== updatedPackage.id))
        }
      } else if (payload.eventType === 'DELETE') {
        // Paket silindi - state'den çıkar
        setPackages(prev => prev.filter(p => p.id !== payload.old.id))
        setDeliveredPackages(prev => prev.filter(p => p.id !== payload.old.id))
      }
      
      // Count'u güncelle (hafif sorgu)
      fetchTodayDeliveredCount()
    }).then(channel => { packagesChannel = channel })

    // ⚡ REALTIME OPTİMİZASYONU: Courier değişikliklerinde incremental update
    setupRealtimeWithRetry('couriers-changes', 'couriers', (payload: any) => {
      console.log('👤 Realtime courier event:', payload.eventType, payload.new?.id)
      
      if (payload.eventType === 'UPDATE') {
        setCouriers(prev => {
          const index = prev.findIndex(c => c.id === payload.new.id)
          if (index !== -1) {
            const newList = [...prev]
            newList[index] = { ...newList[index], ...payload.new }
            return newList
          }
          return prev
        })
      } else {
        // INSERT/DELETE durumunda full refetch (nadir)
        fetchCouriers()
      }
    }).then(channel => { couriersChannel = channel })

    // ⚡ REALTIME OPTİMİZASYONU: Borç değişikliklerinde sadece ilgili kurye güncelle
    setupRealtimeWithRetry('courier-debts-changes', 'courier_debts', (payload: any) => {
      console.log('💰 Realtime debt event:', payload.eventType)
      // Borç değişikliğinde sadece ilgili kuryenin debt bilgisini güncelle
      // Full refetch yerine targeted update yapılabilir ama şimdilik hafif
      fetchCouriers()
    }).then(channel => { courierDebtsChannel = channel })

    // ⚡ POLLING OPTİMİZASYONU: 30 saniye yerine 60 saniye
    const refreshInterval = setInterval(() => {
      fetchPackages()
      fetchDeliveredPackages()
      fetchCouriers()
      fetchRestaurants()
      fetchTodayDeliveredCount()
    }, 60000) // 60 saniye

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
