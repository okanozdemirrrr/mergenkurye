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
import {
  Package, ClipboardList, BarChart3, Users, Megaphone, ShoppingCart, Smartphone,
  Bike, User, Receipt, Banknote, FileText, Utensils, CreditCard, ChevronDown, ChevronRight, LogOut, Bell, Settings
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'

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
    if (pathname?.startsWith('/admin/kuryeler')) {
      setShowCourierSubmenu(true)
    }
    if (pathname?.startsWith('/admin/restoranlar')) {
      setShowRestaurantSubmenu(true)
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
        // KATİ ROTA GÜVENLİĞİ: Sadece admin olarak giriş yapıldıysa içeri al
        const adminLoggedIn = localStorage.getItem('admin_logged_in')
        
        if (adminLoggedIn === 'true') {
          setIsLoggedIn(true)
        } else {
          // Admin değilse veya session yoksa içeri alma, bekleme
          setIsLoggedIn(false)
          // Güvenlik amacıyla izinsiz girişte direkt kök dizine fırlat (isteğe bağlı ama kullanıcı "anında / at" dedi)
          if (pathname !== '/admin' && !pathname.startsWith('/admin')) {
             window.location.href = '/'
          }
        }
      } catch (error) {
        console.error('Auth kontrolü hatası:', error)
        setIsLoggedIn(false)
        window.location.href = '/'
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthAndRedirect()
  }, [isMounted])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data.success) {
        localStorage.setItem('admin_logged_in', 'true')
        setIsLoggedIn(true)
        setSuccessMessage('Giriş başarılı!')
        setTimeout(() => setSuccessMessage(''), 2000)
      } else {
        setErrorMessage(data.error || 'Kullanıcı adı veya şifre hatalı!')
        setTimeout(() => setErrorMessage(''), 3000)
      }
    } catch (error) {
      console.error('Admin giriş hatası:', error)
      setErrorMessage('Giriş yapılırken bir hata oluştu!')
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
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-md border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Logo" className="w-64 h-64 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Admin Girişi</h1>
          </div>
          <input
            type="text"
            placeholder="Kullanıcı Adı"
            className="w-full p-3 mb-3 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            value={loginForm.username}
            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Şifre"
            className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors">
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
        className="fixed top-4 left-4 z-50 bg-slate-800 text-white p-3 rounded-md shadow-sm hover:bg-slate-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="fixed top-4 right-4 z-50">
        <NotificationBell userId="admin" />
      </div>

      {/* Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMenu(false)} />
          <div className="relative bg-slate-900 w-80 h-full overflow-y-auto p-6 border-r border-slate-800 shadow-sm">
            <div className="mb-8 text-center border-b border-slate-800 pb-6">
              <img src="/logo.png" alt="Logo" className="w-[7.2rem] h-[7.2rem] mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-white tracking-tight">Admin Panel</h2>
            </div>

            <nav className="space-y-2">
              <Link
                href="/admin"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                  isActive('/admin') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Package className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                Canlı Takip
              </Link>

              <Link
                href="/admin/gecmis"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                  isActive('/admin/gecmis') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ClipboardList className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                Geçmiş Siparişler
              </Link>

              <Link
                href="/admin/istatistikler"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                  isActive('/admin/istatistikler') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                Genel İstatistikler
              </Link>

              <Link
                href="/admin/sistem-duyurulari"
                onClick={() => setShowMenu(false)}
                className={`block w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                  isActive('/admin/sistem-duyurulari') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Bell className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                Sistem Duyuruları
              </Link>

              {/* Müşteriler Submenu */}
              <div>
                <button
                  onClick={() => setShowCustomerSubmenu(!showCustomerSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                    pathname?.startsWith('/admin/musteriler') || pathname?.startsWith('/admin/market') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Users className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                  Yemek & Sanal Market
                  <span className="float-right">{showCustomerSubmenu ? <ChevronDown className="inline w-4 h-4" strokeWidth={1.5} /> : <ChevronRight className="inline w-4 h-4" strokeWidth={1.5} />}</span>
                </button>

                {showCustomerSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/musteriler/duyurular"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/musteriler/duyurular') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Megaphone className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Duyurular
                    </Link>
                    <Link
                      href="/admin/market"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        pathname?.startsWith('/admin/market') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <ShoppingCart className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Market Yönetimi
                    </Link>
                    <Link
                      href="/admin/restoranlar/uygulama-siparisleri"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/uygulama-siparisleri') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Smartphone className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Restoranların Uygulama Siparişleri
                    </Link>
                  </div>
                )}
              </div>

              {/* Kuryeler Submenu */}
              <div>
                <button
                  onClick={() => setShowCourierSubmenu(!showCourierSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                    pathname?.startsWith('/admin/kuryeler') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Bike className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                  Kuryeler
                  <span className="float-right">{showCourierSubmenu ? <ChevronDown className="inline w-4 h-4" strokeWidth={1.5} /> : <ChevronRight className="inline w-4 h-4" strokeWidth={1.5} />}</span>
                </button>

                {showCourierSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/kuryeler/hesaplar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/kuryeler/hesaplar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <User className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Kurye Hesapları
                    </Link>
                    <Link
                      href="/admin/kuryeler/mutabakatlar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/kuryeler/mutabakatlar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Receipt className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Kurye Mutabakatları
                    </Link>
                    <Link
                      href="/admin/kuryeler/performans"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/kuryeler/performans') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Kurye Performansları
                    </Link>
                    <Link
                      href="/admin/kuryeler/kazanclar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/kuryeler/kazanclar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Banknote className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Kurye Kazançları
                    </Link>
                    <Link
                      href="/admin/kuryeler/basvurular"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/kuryeler/basvurular') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <FileText className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Kurye Başvuruları
                    </Link>
                  </div>
                )}
              </div>

              {/* Restoranlar Submenu */}
              <div>
                <button
                  onClick={() => setShowRestaurantSubmenu(!showRestaurantSubmenu)}
                  className={`w-full text-left px-4 py-3 rounded-md font-medium transition-all ${
                    pathname?.startsWith('/admin/restoranlar') ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Utensils className="inline mr-3 w-4 h-4" strokeWidth={1.5} />
                  Restoranlar
                  <span className="float-right">{showRestaurantSubmenu ? <ChevronDown className="inline w-4 h-4" strokeWidth={1.5} /> : <ChevronRight className="inline w-4 h-4" strokeWidth={1.5} />}</span>
                </button>

                {showRestaurantSubmenu && (
                  <div className="ml-4 mt-2 space-y-1">
                    <Link
                      href="/admin/restoranlar/liste"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/liste') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <ClipboardList className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Restoranlar Listesi
                    </Link>
                    <Link
                      href="/admin/restoranlar/detaylar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/detaylar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Restoran Sipariş Detayları
                    </Link>
                    <Link
                      href="/admin/restoranlar/borc"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/borc') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <CreditCard className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Restoranların Borcu
                    </Link>
                    <Link
                      href="/admin/restoranlar/odemeler"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/odemeler') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Banknote className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Restoranların Ödemesi
                    </Link>
                    <Link
                      href="/admin/restoranlar/mutabakatlar"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/mutabakatlar') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Receipt className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Mutabakatlar
                    </Link>
                    <Link
                      href="/admin/restoranlar/basvurular"
                      onClick={() => setShowMenu(false)}
                      className={`block w-full text-left px-4 py-2 rounded-md text-sm transition-all ${
                        isActive('/admin/restoranlar/basvurular') ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <FileText className="inline mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                      Restoran Başvuruları
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            <div className="mt-8 space-y-2">
              <Link
                href="/admin/ayarlar"
                onClick={() => setShowMenu(false)}
                className={`w-full px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 border ${
                  isActive('/admin/ayarlar')
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Settings className="w-4 h-4" strokeWidth={1.5} />
                Ayarlar
              </Link>

              <button
                onClick={async () => {
                  try {
                    // 1. Supabase'den çıkış yap (Hard kill)
                    await supabase.auth.signOut()
                  } catch (error) {
                    console.error('SignOut hatası:', error)
                  }
                  
                  // 2. Tarayıcıda kalan tüm verileri yokederek cache'i temizle
                  localStorage.clear()
                  sessionStorage.clear()
                  
                  // 3. Sayfayı tamamen yenileterek state'lerin sıfırlanmasını sağla
                  window.location.href = '/'
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
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
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-md text-green-300">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-300">
          {errorMessage}
        </div>
      )}
    </>
  )
}
