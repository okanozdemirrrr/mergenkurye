'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import RestaurantDashboard from './components/RestaurantDashboard'
import { useRestaurantRealtimeNotifications } from '@/hooks/useRestaurantRealtimeNotifications'

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

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
        <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl ${
          darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'
        }`}>
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-24 mx-auto mb-4" />
            <h1 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              RESTORAN GİRİŞİ
            </h1>
            <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              Sipariş yönetim paneline hoş geldiniz
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm text-center">{loginError}</p>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Restoran Adı
              </label>
              <select
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-colors ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                }`}
              >
                <option value="">Restoran Seçin</option>
                {restaurants.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                Şifre
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-colors ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                }`}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors"
            >
              🔐 Giriş Yap
            </button>
          </form>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full mt-4 py-2 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {darkMode ? '☀️ Gündüz Modu' : '🌙 Gece Modu'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <RestaurantDashboard
        restaurantId={selectedRestaurantId!}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    </>
  )
}
