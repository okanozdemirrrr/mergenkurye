/**
 * @file src/app/restoran/RestoranProvider.tsx
 * @description Restoran için shared data provider
 */
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Customer } from '@/types'

interface Package {
  id: number
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card'
  restaurant_id?: number | null
  order_number?: string
  platform?: string
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  courier_name?: string
  cancelled_at?: string | null
  cancelled_by?: 'admin' | 'restaurant' | null
  cancellation_reason?: string | null
  applied_price?: number | null
}



interface Restaurant {
  id: string
  name: string
  password?: string
  latitude?: number
  longitude?: number
  phone?: string
  address?: string
  maps_link?: string
}

interface RestoranContextType {
  restaurantId: string | null
  restaurant: Restaurant | null
  packages: Package[]
  errorMessage: string
  showNewOrderModal: boolean
  cidCustomer: Customer | null
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
  setShowNewOrderModal: (show: boolean) => void
  setCidCustomer: (customer: Customer | null) => void
  fetchPackages: () => Promise<void>
}

const RestoranContext = createContext<RestoranContextType | undefined>(undefined)

export function RestoranProvider({ children }: { children: ReactNode }) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [cidCustomer, setCidCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    const storedId = localStorage.getItem('restoran_logged_restaurant_id')
    if (storedId) {
      setRestaurantId(storedId)
      fetchRestaurant(storedId)
    }
  }, [])

  const fetchRestaurant = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setRestaurant(data)
    } catch (error) {
      console.error('Restoran bilgisi yüklenemedi:', error)
    }
  }

  const fetchPackages = async () => {
    if (!restaurantId) return

    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*, courier:couriers!packages_courier_id_fkey(full_name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Supabase sorgu hatası (Full):', JSON.stringify(error, null, 2))
        console.error('❌ Error Message:', error.message)
        throw error
      }

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        courier_name: pkg.courier?.full_name,
        courier: undefined
      }))

      console.log('✅ Siparişler yüklendi:', transformedData.length, 'adet')
      setPackages(transformedData)
    } catch (error: any) {
      console.error('Siparişler yüklenirken hata:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
    }
  }

  useEffect(() => {
    if (!restaurantId) return

    fetchPackages()

    // Realtime subscription
    const packagesChannel = supabase
      .channel('restaurant-packages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          fetchPackages()
        }
      )
      .subscribe()

    // 5 dakikalık otomatik yenileme
    const refreshInterval = setInterval(() => {
      fetchPackages()
    }, 300000)

    return () => {
      packagesChannel.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [restaurantId])

  return (
    <RestoranContext.Provider
      value={{
        restaurantId,
        restaurant,
        packages,
        errorMessage,
        showNewOrderModal,
        cidCustomer,
        setSuccessMessage,
        setErrorMessage,
        setShowNewOrderModal,
        setCidCustomer,
        fetchPackages
      }}
    >
      {children}
    </RestoranContext.Provider>
  )
}

export function useRestoran() {
  const context = useContext(RestoranContext)
  if (context === undefined) {
    throw new Error('useRestoran must be used within RestoranProvider')
  }
  return context
}
