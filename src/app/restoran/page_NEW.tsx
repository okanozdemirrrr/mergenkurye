'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import RestaurantDashboard from './components/RestaurantDashboard'
import { useRestaurantRealtimeNotifications } from '@/hooks/useRestaurantRealtimeNotifications'
import ChangelogModal from '@/components/ChangelogModal'

const LOGIN_STORAGE_KEY = 'restoran_logged_in'
const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'

interface Restaurant {
  id: string
  name: string
  password?: string
}

export default function RestoranPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const [loginError, setLoginError] = useState('')

  // Realtime bildirimler (INSERT event'leri için)
  useRestaurantRealtimeNotifications(
    selectedRestaurantId ? parseInt(selectedRestaurantId) : null,
    isLoggedIn
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const checkAuth = async () => {
      try {
        // 1. Önce Supabase session kontrolü yap
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session && session.user) {
          // Supabase session varsa, restoran ID'sini al
          const restaurantId = session.user.id
          localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
          localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, restaurantId)
          setIsLoggedIn(true)
          setSelectedRestaurantId(restaurantId)
          setIsCheckingAuth(false)
          return
        }

        // 2. Supabase session yoksa, localStorage kontrolü yap
        const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY) === 'true'
        const restaurantId = localStorage.getItem(LOGIN_RESTAURANT_ID_KEY)

        if (loggedIn && restaurantId) {
          setIsLoggedIn(true)
          setSelectedRestaurantId(restaurantId)
        }
      } catch (error) {
        console.error('Auth kontrolü hatası:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [isMounted])

  useEffect(() => {
    if (!isMounted) return
    fetchRestaurants()
  }, [isMounted])

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, password')
        .order('name')

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Restoranlar alınamadı:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    const restaurant = restaurants.find(r => r.name === loginForm.username)

    if (!restaurant) {
      setLoginError('Restoran bulunamadı')
      return
    }

    if (restaurant.password !== loginForm.password) {
      setLoginError('Şifre hatalı')
      return
    }

    localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
    localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, restaurant.id)
    setIsLoggedIn(true)
    setSelectedRestaurantId(restaurant.id)
  }

  const handleLogout = async () => {
    try {
      // 1. Supabase'den çıkış yap
      await supabase.auth.signOut()
    } catch (error) {
      console.error('SignOut hatası:', error)
    }
    
    // 2. localStorage'dan restoran key'lerini temizle
    localStorage.removeItem(LOGIN_STORAGE_KEY)
    localStorage.removeItem(LOGIN_RESTAURANT_ID_KEY)
    
    // 3. State'leri temizle
    setIsLoggedIn(false)
    setSelectedRestaurantId(null)
    setLoginForm({ username: '', password: '' })
    
    // 4. Ana sayfaya yönlendir
    window.location.href = '/'
  }

  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  // Sayfa içeriği artık layout'tan gelen isLoggedIn state'ine güveniyor
  // RestoranPage render oluyorsa zaten layout girişi doğrulamıştır.

  return (
    <>
      {/* Changelog Modal */}
      <ChangelogModal userType="restaurant" userId={selectedRestaurantId} />
      
      <RestaurantDashboard
        restaurantId={selectedRestaurantId!}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    </>
  )
}
