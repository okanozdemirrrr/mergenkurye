/**
 * @file src/app/admin/AdminDataProvider.tsx
 * @description Admin Panel için merkezi veri yönetimi
 * Tüm admin sayfaları bu provider'dan veri alır
 */
'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Package, Courier, Restaurant } from '@/types'
import {
  COUNTED_PACKAGE_OR_FILTER,
  calculateCourierEarnings,
  courierToEarningRates,
  getBusinessDayRangeIso,
  getBusinessWeekStart,
} from '@/utils/calculations'
import { queryCourierTodayCountedPackages } from '@/utils/courierAccount'

const ACTIVE_PACKAGE_STATUSES = [
  'new_order',
  'getting_ready',
  'ready',
  'assigned',
  'picking_up',
  'on_the_way',
] as const

const ACTIVE_PACKAGES_SELECT =
  'id, order_number, status, amount, payment_method, customer_name, customer_phone, delivery_address, content, platform, created_at, updated_at, getting_ready_at, ready_at, assigned_at, picked_up_at, delivered_at, courier_id, restaurant_id, latitude, longitude, restaurants(id, name, phone)'

const ACTIVE_PACKAGES_SELECT_NO_UPDATED_AT =
  'id, order_number, status, amount, payment_method, customer_name, customer_phone, delivery_address, content, platform, created_at, getting_ready_at, ready_at, assigned_at, picked_up_at, delivered_at, courier_id, restaurant_id, latitude, longitude, restaurants(id, name, phone)'

function transformActivePackages(data: any[] | null): Package[] {
  return (data || []).map((pkg: any) => ({
    ...pkg,
    restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0
      ? pkg.restaurants[0]
      : pkg.restaurants || null,
    restaurants: undefined,
  }))
}

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
  setCouriers: React.Dispatch<React.SetStateAction<Courier[]>>
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

  // Realtime kopma → yeniden bağlanma sonrası tek seferlik full refetch için
  const packagesRealtimeEverSubscribedRef = useRef(false)
  const packagesRealtimeWasDownRef = useRef(false)
  const packagesHasUpdatedAtRef = useRef(true)

  const fetchPackages = async () => {
    try {
      const selectCols = packagesHasUpdatedAtRef.current
        ? ACTIVE_PACKAGES_SELECT
        : ACTIVE_PACKAGES_SELECT_NO_UPDATED_AT

      let { data, error } = await supabase
        .from('packages')
        .select(selectCols)
        .in('status', [...ACTIVE_PACKAGE_STATUSES])
        .order('created_at', { ascending: false })
        .limit(500)

      // updated_at kolonu yoksa bir kez düşürüp tekrar dene
      if (error && packagesHasUpdatedAtRef.current && /updated_at/i.test(error.message || '')) {
        packagesHasUpdatedAtRef.current = false
        const retry = await supabase
          .from('packages')
          .select(ACTIVE_PACKAGES_SELECT_NO_UPDATED_AT)
          .in('status', [...ACTIVE_PACKAGE_STATUSES])
          .order('created_at', { ascending: false })
          .limit(500)
        data = retry.data
        error = retry.error
      }

      if (error) throw error

      console.log('📦 Admin Panel - Aktif siparişler (full):', {
        total: data?.length || 0,
      })

      setPackages(transformActivePackages(data))
    } catch (error: any) {
      console.error('Siparişler yüklenirken hata:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /** Smart Fallback Aşama 3: son 65 sn içinde oluşan/güncellenen aktif paketler — listeyi ezmeden merge */
  const fetchActivePackagesDelta = async () => {
    try {
      const since = new Date(Date.now() - 65_000).toISOString()
      const selectCols = packagesHasUpdatedAtRef.current
        ? ACTIVE_PACKAGES_SELECT
        : ACTIVE_PACKAGES_SELECT_NO_UPDATED_AT

      const buildQuery = (cols: string, useUpdatedAt: boolean) => {
        let q = supabase
          .from('packages')
          .select(cols)
          .in('status', [...ACTIVE_PACKAGE_STATUSES])

        if (useUpdatedAt) {
          q = q.or(`created_at.gte.${since},updated_at.gte.${since}`)
        } else {
          // updated_at yoksa mevcut status timestamp'leriyle delta
          q = q.or(
            `created_at.gte.${since},getting_ready_at.gte.${since},ready_at.gte.${since},assigned_at.gte.${since},picked_up_at.gte.${since}`
          )
        }

        return q.order('created_at', { ascending: false }).limit(100)
      }

      let { data, error } = await buildQuery(selectCols, packagesHasUpdatedAtRef.current)

      if (error && packagesHasUpdatedAtRef.current && /updated_at/i.test(error.message || '')) {
        packagesHasUpdatedAtRef.current = false
        const retry = await buildQuery(ACTIVE_PACKAGES_SELECT_NO_UPDATED_AT, false)
        data = retry.data
        error = retry.error
      }

      if (error) throw error
      if (!data?.length) return

      const delta = transformActivePackages(data)
      console.log('📦 Admin delta fetch:', delta.length, 'kayıt (son 65 sn)')

      setPackages((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]))

        for (const row of delta) {
          const existing = byId.get(row.id)
          byId.set(row.id, {
            ...(existing || {}),
            ...row,
            restaurant: row.restaurant ?? existing?.restaurant ?? null,
          } as Package)
        }

        return Array.from(byId.values())
          .filter((p) =>
            ACTIVE_PACKAGE_STATUSES.includes(p.status as (typeof ACTIVE_PACKAGE_STATUSES)[number])
          )
          .sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0
            return tb - ta
          })
          .slice(0, 500)
      })
    } catch (error: any) {
      console.error('Aktif paket delta fetch hatası:', error)
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
      // ⚡ EGRESS OPTİMİZASYONU: Sadece gerekli courier kolonları (last_location dahil)
      const { data, error } = await supabase
        .from('couriers')
        .select('id, username, full_name, is_active, is_night_shift, package_rate, long_distance_fee, payment_type, account_status, last_location, sort_order')
        .order('sort_order', { ascending: true })
        .order('full_name', { ascending: true })

      if (error) throw error

      const { startIso: todayStartIso, endIso: todayEndIso } = getBusinessDayRangeIso()
      console.log('📅 Admin Panel - Business Day:', todayStartIso, '→', todayEndIso)

      // Her kurye için borç ve teslimat bilgilerini çek
      const couriersWithData = await Promise.all(
        (data || []).map(async (courier) => {
          // Legacy courier_debts devre dışı. Tek kaynak ledger.
          const totalDebt = 0

          const { data: todayDeliveries } = await queryCourierTodayCountedPackages(
            supabase,
            courier.id,
            'id, status, is_chargeable_cancellation, is_long_distance, courier_earned_fee'
          )

          const todayDeliveryCount = (todayDeliveries || []).length
          const earningRates = courierToEarningRates(courier)
          const todayEarningsAmount = calculateCourierEarnings(
            todayDeliveries || [],
            earningRates
          ).amount

          // Aktif paketleri çek (assigned, picking_up, on_the_way)
          const { data: activePackages } = await supabase
            .from('packages')
            .select('id')
            .eq('courier_id', courier.id)
            .in('status', ['assigned', 'picking_up', 'on_the_way'])

          const activePackageCount = (activePackages || []).length

          const weekStart = getBusinessWeekStart()

          const { data: weeklyDeliveries } = await supabase
            .from('packages')
            .select('id')
            .eq('delivered_by_courier_id', courier.id)
            .or(COUNTED_PACKAGE_OR_FILTER)
            .gte('delivered_at', weekStart.toISOString())

          const weeklyDeliveryCount = (weeklyDeliveries || []).length

          return {
            ...courier,
            id: courier.id,
            full_name: courier.full_name || 'İsimsiz Kurye',
            is_active: Boolean(courier.is_active),
            is_night_shift: Boolean(courier.is_night_shift),
            deliveryCount: weeklyDeliveryCount, // Geriye uyumluluk için
            weeklyDeliveryCount,
            todayDeliveryCount,
            todayEarningsAmount,
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
      const { startIso, endIso } = getBusinessDayRangeIso()
      console.log('📅 Admin Panel - Today Delivered Count:', startIso, '→', endIso)

      // ⚡ EGRESS OPTİMİZASYONU: head: true ile sadece count çek, veri çekme!
      // Delivered + Ücretli İptaller
      const { count, error } = await supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .or(COUNTED_PACKAGE_OR_FILTER)
        .gte('delivered_at', startIso)
        .lt('delivered_at', endIso)

      if (error) throw error
      console.log('📊 Bugün teslim edilen toplam (delivered + ücretli iptaller):', count)
      setTodayDeliveredCount(count || 0)
    } catch (error: any) {
      console.error('Günlük teslimat sayısı yüklenemedi:', error)
      setTodayDeliveredCount(0)
    }
  }

  useEffect(() => {
    // Aşama 1: İlk mount — geçmiş dahil tüm başlangıç verisi 1 kez
    fetchPackages()
    fetchDeliveredPackages()
    fetchCouriers()
    fetchRestaurants()
    fetchTodayDeliveredCount()

    let packagesChannel: ReturnType<typeof supabase.channel> | null = null
    let couriersChannel: ReturnType<typeof supabase.channel> | null = null
    const reconnectTimers: ReturnType<typeof setTimeout>[] = []
    let packagesReconnectScheduled = false
    let couriersReconnectScheduled = false

    const markPackagesRealtimeDown = (status: string) => {
      console.warn(`⚠️ Packages Realtime koptu: ${status}`)
      packagesRealtimeWasDownRef.current = true
    }

    const handlePackagesRealtimeStatus = (status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime bağlandı: packages-changes')
        packagesReconnectScheduled = false
        // Aşama 2: Kopma sonrası tekrar gelince sadece aktif siparişleri 1 kez full refetch
        if (packagesRealtimeWasDownRef.current && packagesRealtimeEverSubscribedRef.current) {
          console.log('🔄 Realtime geri geldi — aktif siparişler full refetch')
          fetchPackages()
        }
        packagesRealtimeEverSubscribedRef.current = true
        packagesRealtimeWasDownRef.current = false
        return
      }

      if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        markPackagesRealtimeDown(status)
      }
    }

    const setupPackagesRealtime = (retryCount = 0) => {
      const channel = supabase
        .channel(`packages-changes-${retryCount}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'packages' },
          async (payload: any) => {
            console.log('📦 Realtime package event:', payload.eventType, payload.new?.id)

            if (payload.eventType === 'INSERT') {
              const newPackage = payload.new
              if (
                ACTIVE_PACKAGE_STATUSES.includes(
                  newPackage.status as (typeof ACTIVE_PACKAGE_STATUSES)[number]
                )
              ) {
                const { data: restaurant } = await supabase
                  .from('restaurants')
                  .select('id, name, phone')
                  .eq('id', newPackage.restaurant_id)
                  .single()

                const packageWithRestaurant = {
                  ...newPackage,
                  restaurant: restaurant || null,
                }

                setPackages((prev) => [packageWithRestaurant, ...prev].slice(0, 500))
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedPackage = payload.new
              setPackages((prev) => {
                const index = prev.findIndex((p) => p.id === updatedPackage.id)
                if (index !== -1) {
                  const newList = [...prev]
                  newList[index] = { ...newList[index], ...updatedPackage }
                  return newList
                }
                if (
                  ACTIVE_PACKAGE_STATUSES.includes(
                    updatedPackage.status as (typeof ACTIVE_PACKAGE_STATUSES)[number]
                  )
                ) {
                  return [updatedPackage, ...prev].slice(0, 500)
                }
                return prev
              })

              if (['delivered', 'cancelled'].includes(updatedPackage.status)) {
                const { data: restaurant } = await supabase
                  .from('restaurants')
                  .select('id, name')
                  .eq('id', updatedPackage.restaurant_id)
                  .single()

                const packageWithRestaurant = {
                  ...updatedPackage,
                  restaurant: restaurant || null,
                }

                setDeliveredPackages((prev) => [packageWithRestaurant, ...prev].slice(0, 1000))
                setPackages((prev) => prev.filter((p) => p.id !== updatedPackage.id))
              }
            } else if (payload.eventType === 'DELETE') {
              setPackages((prev) => prev.filter((p) => p.id !== payload.old.id))
              setDeliveredPackages((prev) => prev.filter((p) => p.id !== payload.old.id))
            }

            fetchTodayDeliveredCount()
          }
        )

      channel.subscribe((status) => {
        handlePackagesRealtimeStatus(status)

        if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') &&
          retryCount < 10 &&
          !packagesReconnectScheduled
        ) {
          packagesReconnectScheduled = true
          const timer = setTimeout(() => {
            console.log(`🔄 Packages Realtime yeniden bağlanıyor (deneme ${retryCount + 1})`)
            if (packagesChannel) supabase.removeChannel(packagesChannel)
            packagesChannel = setupPackagesRealtime(retryCount + 1)
          }, 3000)
          reconnectTimers.push(timer)
        }
      })

      return channel
    }

    const setupCouriersRealtime = (retryCount = 0) => {
      const channel = supabase
        .channel(`couriers-changes-${retryCount}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'couriers' },
          (payload: any) => {
            console.log('👤 Realtime courier event:', payload.eventType, payload.new?.id)

            if (payload.eventType === 'UPDATE') {
              setCouriers((prev) => {
                const index = prev.findIndex((c) => c.id === payload.new.id)
                if (index !== -1) {
                  const newList = [...prev]
                  newList[index] = { ...newList[index], ...payload.new }
                  return newList
                }
                return prev
              })
            } else {
              fetchCouriers()
            }
          }
        )

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime bağlandı: couriers-changes')
          couriersReconnectScheduled = false
        } else if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') &&
          retryCount < 10 &&
          !couriersReconnectScheduled
        ) {
          console.warn(`⚠️ Couriers Realtime koptu: ${status}`)
          couriersReconnectScheduled = true
          const timer = setTimeout(() => {
            if (couriersChannel) supabase.removeChannel(couriersChannel)
            couriersChannel = setupCouriersRealtime(retryCount + 1)
          }, 3000)
          reconnectTimers.push(timer)
        }
      })

      return channel
    }

    packagesChannel = setupPackagesRealtime()
    couriersChannel = setupCouriersRealtime()

    // Aşama 3: Ağır full polling YOK — sadece son 65 sn delta
    const deltaInterval = setInterval(() => {
      fetchActivePackagesDelta()
    }, 60_000)

    return () => {
      reconnectTimers.forEach((timer) => clearTimeout(timer))
      if (packagesChannel) supabase.removeChannel(packagesChannel)
      if (couriersChannel) supabase.removeChannel(couriersChannel)
      clearInterval(deltaInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        fetchTodayDeliveredCount,
        setCouriers
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
