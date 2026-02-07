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
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined)

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | string | null>(null)

  const fetchPackages = async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

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

          // Bugün teslim edilen paketleri çek
          const { data: todayDeliveries } = await supabase
            .from('packages')
            .select('id')
            .eq('courier_id', courier.id)
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

          // Toplam teslimat sayısı
          const { data: allDeliveries } = await supabase
            .from('packages')
            .select('id')
            .eq('courier_id', courier.id)
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

  useEffect(() => {
    fetchPackages()
    fetchDeliveredPackages()
    fetchCouriers()
    fetchRestaurants()

    // Realtime subscriptions
    const packagesChannel = supabase
      .channel('packages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
        fetchPackages()
        fetchDeliveredPackages()
      })
      .subscribe()

    const couriersChannel = supabase
      .channel('couriers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couriers' }, () => {
        fetchCouriers()
      })
      .subscribe()

    const courierDebtsChannel = supabase
      .channel('courier-debts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courier_debts' }, () => {
        fetchCouriers()
      })
      .subscribe()

    // 5 dakikalık otomatik yenileme
    const refreshInterval = setInterval(() => {
      fetchPackages()
      fetchDeliveredPackages()
      fetchCouriers()
      fetchRestaurants()
    }, 300000)

    return () => {
      packagesChannel.unsubscribe()
      couriersChannel.unsubscribe()
      courierDebtsChannel.unsubscribe()
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
        fetchRestaurants
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
