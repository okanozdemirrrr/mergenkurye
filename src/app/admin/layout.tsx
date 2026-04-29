/**
 * @file src/app/admin/layout.tsx
 * @description Admin Panel Layout - Sidebar ve Auth kontrolü
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { App } from '@capacitor/app'
import { supabase } from '../lib/supabase'
import { AdminDataProvider, useAdminData } from './AdminDataProvider'
import { AdminModals } from './AdminModals'
import { NotificationProvider } from '@/contexts/NotificationContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [showMenu, setShowMenu] = useState(false)
  const [showCourierSubmenu, setShowCourierSubmenu] = useState(false)
  const [showRestaurantSubmenu, setShowRestaurantSubmenu] = useState(false)
  const [showCustomerSubmenu, setShowCustomerSubmenu] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Market sayfasındaysa Müşteriler menüsünü otomatik aç
  useEffect(() => {
    if (pathname?.startsWith('/admin/market') || pathname?.startsWith('/admin/musteriler')) {
      setShowCustomerSubmenu(true)
    }
  }, [pathname])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Android Back Button Handler
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    let backButtonListener: any

    const setupBackButton = async () => {
      try {
        backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            App.minimizeApp()
          } else {
            window.history.back()
          }
        })
      } catch (error) {
        console.log('Back button listener eklenemedi:', error)
      }
    }

    setupBackButton()

    return () => {
      if (backButtonListener) {
        backButtonListener.remove()
      }
    }
  }, [isMounted])

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (typeof window === 'undefined') return
      if (!isMounted) return

      setIsCheckingAuth(true)

      try {
        // 1. Önce Supabase session kontrolü yap
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session && session.user) {
          // Supabase session varsa, admin olarak giriş yap
          localStorage.setItem('admin_logged_in', 'true')
          setIsLoggedIn(true)
          setIsCheckingAuth(false)
          return
        }

        // 2. Supabase session yoksa, localStorage kontrolü yap
        const adminLoggedIn = localStorage.getItem('admin_logged_in')
        const isAdminLoggedIn = adminLoggedIn === 'true'
        setIsLoggedIn(isAdminLoggedIn)
      } catch (error) {
        console.error('Auth kontrolü hatası:', error)
        setIsLoggedIn(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthAndRedirect()
  }, [isMounted])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const adminUser = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin'
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

    if (loginForm.username === adminUser && loginForm.password === adminPass) {
      localStorage.setItem('admin_logged_in', 'true')
      setIsLoggedIn(true)
      setSuccessMessage('Giriş başarılı!')
      setTimeout(() => setSuccessMessage(''), 2000)
    } else {
      setErrorMessage('Kullanıcı adı veya şifre hatalı!')
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
            <h1 className="text-2xl font-bold text-white mb-2">Admin Girişi</h1>
          </div>
          <input
            type="text"
            placeholder="Kullanıcı Adı"
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
          {errorMessage && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage}</p>}
          {successMessage && <p className="text-green-400 text-sm mt-3 text-center">{successMessage}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="fixed top-4 left-4 z-50 bg-slate-800 text-white p-3 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMenu(false)} />
          <div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6">
            <div className="mb-8 text-center">
              <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            </div>

            <nav className="space-y-2">
              <Link
                href="/admin"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive('/admin') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3">📦</span>
                Canlı Takip
              </Link>

              <Link
                href="/admin/gecmis"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive('/admin/gecmis') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3">📋</span>
                Geçmiş Siparişler
              </Link>

              <Link
                href="/admin/istatistikler"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive('/admin/istatistikler') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3">📊</span>
                Genel İstatistikler
              </Link>

              {/* Müşteriler Submenu */}
              <div>
                <button
                  onClick={() => setShowCustomerSubmenu(!showCustomerSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                    pathname?.startsWith('/admin/musteriler') || pathname?.startsWith('/admin/market') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3">👥</span>
                  Müşteriler
                  <span className="float-right">{showCustomerSubmenu ? '▼' : '▶'}</span>
                </button>

                {showCustomerSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/musteriler/duyurular"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/musteriler/duyurular') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      📢 Duyurular
                    </Link>
                    <Link
                      href="/admin/market"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        pathname?.startsWith('/admin/market') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      🛒 Market Yönetimi
                    </Link>
                  </div>
                )}
              </div>

              {/* Kuryeler Submenu */}
              <div>
                <button
                  onClick={() => setShowCourierSubmenu(!showCourierSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                    pathname?.startsWith('/admin/kuryeler') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3">🚴</span>
                  Kuryeler
                  <span className="float-right">{showCourierSubmenu ? '▼' : '▶'}</span>
                </button>

                {showCourierSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/kuryeler/hesaplar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/kuryeler/hesaplar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      👤 Kurye Hesapları
                    </Link>
                    <Link
                      href="/admin/kuryeler/performans"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/kuryeler/performans') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      📊 Kurye Performansları
                    </Link>
                    <Link
                      href="/admin/kuryeler/kazanclar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/kuryeler/kazanclar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      💰 Kurye Kazançları
                    </Link>
                    <Link
                      href="/admin/kuryeler/basvurular"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/kuryeler/basvurular') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      📝 Kurye Başvuruları
                    </Link>
                  </div>
                )}
              </div>

              {/* Restoranlar Submenu */}
              <div>
                <button
                  onClick={() => setShowRestaurantSubmenu(!showRestaurantSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                    pathname?.startsWith('/admin/restoranlar') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3">🍽️</span>
                  Restoranlar
                  <span className="float-right">{showRestaurantSubmenu ? '▼' : '▶'}</span>
                </button>

                {showRestaurantSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/restoranlar/liste"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/restoranlar/liste') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      📋 Restoranlar Listesi
                    </Link>
                    <Link
                      href="/admin/restoranlar/detaylar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/restoranlar/detaylar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      📊 Restoran Sipariş Detayları
                    </Link>
                    <Link
                      href="/admin/restoranlar/borc"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/restoranlar/borc') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      💳 Restoranların Borcu
                    </Link>
                    <Link
                      href="/admin/restoranlar/odemeler"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/restoranlar/odemeler') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      💰 Restoranların Ödemesi
                    </Link>
                    <Link
                      href="/admin/restoranlar/basvurular"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        isActive('/admin/restoranlar/basvurular') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      📝 Restoran Başvuruları
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            <button
              onClick={async () => {
                try {
                  // 1. Supabase'den çıkış yap
                  await supabase.auth.signOut()
                } catch (error) {
                  console.error('SignOut hatası:', error)
                }
                
                // 2. localStorage'dan admin key'i temizle
                localStorage.removeItem('admin_logged_in')
                
                // 3. Ana sayfaya yönlendir
                window.location.href = '/'
              }}
              className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              ← Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <NotificationProvider>
            <AdminDataProvider>
              <AdminMessages />
              <AdminModals />
              {children}
            </AdminDataProvider>
          </NotificationProvider>
        </div>
      </div>
    </div>
  )
}

function AdminMessages() {
  const { successMessage, errorMessage } = useAdminData()
  
  return (
    <>
      {successMessage && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-300">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
          {errorMessage}
        </div>
      )}
    </>
  )
}
