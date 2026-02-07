/**
 * @file src/app/restoran/layout.tsx
 * @description Restoran Panel Layout - Eski tasarım korundu, sadece routing URL tabanlı
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { RestoranProvider, useRestoran } from './RestoranProvider'

const LOGIN_STORAGE_KEY = 'restoran_logged_in'
const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'

export default function RestoranLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') return
      if (!isMounted) return

      setIsCheckingAuth(true)

      try {
        const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
        const restaurantId = localStorage.getItem(LOGIN_RESTAURANT_ID_KEY)

        if (loggedIn === 'true' && restaurantId) {
          setIsLoggedIn(true)
          // Giriş yapılmışsa restoranları çek
          await fetchRestaurants()
        } else {
          setIsLoggedIn(false)
          await fetchRestaurants()
        }
      } catch (error) {
        console.error('Auth kontrolü hatası:', error)
        setIsLoggedIn(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [isMounted])

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, password, maps_link')
        .order('name', { ascending: true })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Restoranlar yüklenemedi:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const restaurant = restaurants.find(
      r => r.name === loginForm.username && r.password === loginForm.password
    )

    if (restaurant) {
      localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
      localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, restaurant.id)
      setIsLoggedIn(true)
      setSuccessMessage('Giriş başarılı!')
      setTimeout(() => setSuccessMessage(''), 2000)
      
      // Eğer restaurants boşsa, bu restoranı ekle
      if (restaurants.length === 0) {
        setRestaurants([restaurant])
      }
    } else {
      setErrorMessage('Restoran adı veya şifre hatalı!')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const isActive = (path: string) => pathname === path

  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Logo" className="w-64 h-64 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Restoran Girişi</h1>
          </div>
          <input
            type="text"
            placeholder="Restoran Adı"
            className="w-full p-3 mb-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            value={loginForm.username}
            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Şifre"
            className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors">
            Giriş Yap
          </button>
          <Link
            href="/register-restoran"
            className="block w-full text-center mt-4 text-orange-400 hover:text-orange-300 text-sm transition-colors"
          >
            Hesabınız yok mu? Başvuru yapın →
          </Link>
          {errorMessage && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage}</p>}
          {successMessage && <p className="text-green-400 text-sm mt-3 text-center">{successMessage}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Main Content */}
      <RestoranProvider>
        <RestoranContent pathname={pathname}>
          {children}
        </RestoranContent>
      </RestoranProvider>
    </div>
  )
}

function RestoranContent({ children, pathname }: { children: React.ReactNode, pathname: string }) {
  const [showMenu, setShowMenu] = useState(false)
  
  const isActive = (path: string) => pathname === path

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="fixed top-4 left-4 z-50 bg-slate-800 text-white p-3 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <RestoranMessages />
      <MenuSidebar showMenu={showMenu} setShowMenu={setShowMenu} isActive={isActive} />
      {children}
    </>
  )
}

function RestoranMessages() {
  const { successMessage, errorMessage } = useRestoran()
  
  return (
    <>
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/90 text-white px-6 py-3 rounded-lg shadow-lg">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg">
          {errorMessage}
        </div>
      )}
    </>
  )
}

function MenuSidebar({ showMenu, setShowMenu, isActive }: { showMenu: boolean, setShowMenu: (show: boolean) => void, isActive: (path: string) => boolean }) {
  const { restaurant, setErrorMessage } = useRestoran()

  const handleCustomerSatisfaction = () => {
    if (!restaurant?.maps_link) {
      setErrorMessage('Google Haritalar linkiniz henüz sisteme tanımlanmamıştır.')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    window.open(restaurant.maps_link, '_blank')
    setShowMenu(false)
  }

  if (!showMenu) return null

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black/50" onClick={() => setShowMenu(false)} />
      <div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Restoran Panel</h2>
        </div>

        <nav className="space-y-2">
          <Link
            href="/restoran"
            onClick={() => setShowMenu(false)}
            className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
              isActive('/restoran') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3">📦</span>
            Siparişler
          </Link>

          <Link
            href="/restoran/istatistikler"
            onClick={() => setShowMenu(false)}
            className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
              isActive('/restoran/istatistikler') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3">📊</span>
            Paketlerim ve Cirom
          </Link>

          <Link
            href="/restoran/borc-durumu"
            onClick={() => setShowMenu(false)}
            className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
              isActive('/restoran/borc-durumu') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="mr-3">💳</span>
            Paket Ücretim
          </Link>

          <button
            onClick={handleCustomerSatisfaction}
            className="w-full text-left px-4 py-3 rounded-lg font-medium transition-all text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <span className="mr-3">⭐</span>
            Müşteri Memnuniyeti
          </button>
        </nav>

        <button
          onClick={() => {
            localStorage.removeItem(LOGIN_STORAGE_KEY)
            localStorage.removeItem(LOGIN_RESTAURANT_ID_KEY)
            window.location.href = '/'
          }}
          className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
        >
          ← Çıkış Yap
        </button>
      </div>
    </div>
  )
}
