'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/services/authService'
import { Preferences } from '@capacitor/preferences'

type LoginType = 'courier' | 'restaurant' | 'admin' | null

// Oturum kontrol anahtarları
const COURIER_STORAGE_KEYS = {
  LOGIN: 'kurye_logged_in',
  COURIER_ID: 'kurye_logged_courier_id',
}
const RESTORAN_STORAGE_KEY = 'restoran_logged_in'
const ADMIN_STORAGE_KEY = 'admin_logged_in'

export default function LoginPage() {
  const router = useRouter()
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<LoginType>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ============================================================
  // AUTH LOADING STATE — Session okunana kadar hiçbir şey render etme
  // ============================================================
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // 1. Önce Capacitor Preferences (native, en güvenilir)
        const { value: prefKurye } = await Preferences.get({ key: COURIER_STORAGE_KEYS.LOGIN })
        const { value: prefCourierId } = await Preferences.get({ key: COURIER_STORAGE_KEYS.COURIER_ID })

        if (prefKurye === 'true' && prefCourierId) {
          console.log('✅ [RootPage] Capacitor Preferences\'tan kurye oturumu bulundu — /kurye\'ye yönlendiriliyor')
          router.replace('/kurye')
          return
        }

        // 2. localStorage kontrolü (hızlı fallback)
        const localKurye = localStorage.getItem(COURIER_STORAGE_KEYS.LOGIN)
        const localCourierId = localStorage.getItem(COURIER_STORAGE_KEYS.COURIER_ID)

        if (localKurye === 'true' && localCourierId) {
          console.log('✅ [RootPage] localStorage\'dan kurye oturumu bulundu — /kurye\'ye yönlendiriliyor')
          router.replace('/kurye')
          return
        }

        // 3. Restoran oturum kontrolü
        const localRestoran = localStorage.getItem(RESTORAN_STORAGE_KEY)
        if (localRestoran === 'true') {
          console.log('✅ [RootPage] Restoran oturumu bulundu — /restoran\'a yönlendiriliyor')
          router.replace('/restoran')
          return
        }

        // 4. Admin oturum kontrolü
        const localAdmin = localStorage.getItem(ADMIN_STORAGE_KEY)
        if (localAdmin === 'true') {
          console.log('✅ [RootPage] Admin oturumu bulundu — /admin\'e yönlendiriliyor')
          router.replace('/admin')
          return
        }

        // Oturum yok — login ekranını göster
        console.log('ℹ️ [RootPage] Aktif oturum yok, login ekranı gösteriliyor')
      } catch (error) {
        console.error('[RootPage] Session kontrolü hatası:', error)
        // Hata olsa bile localStorage'a dön
        const localKurye = localStorage.getItem(COURIER_STORAGE_KEYS.LOGIN)
        const localCourierId = localStorage.getItem(COURIER_STORAGE_KEYS.COURIER_ID)
        if (localKurye === 'true' && localCourierId) {
          router.replace('/kurye')
          return
        }
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkExistingSession()
  }, [router])

  // ============================================================
  // LOADING SPLASH — Session okunana kadar sadece bunu göster
  // ============================================================
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <img
          src="/logo.png"
          alt="Alda Gel"
          className="w-24 h-24 mb-6 animate-pulse"
        />
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Yükleniyor...</p>
      </div>
    )
  }

  // ============================================================
  // LOGIN HANDLER
  // ============================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    try {
      if (!username || !password || !selectedType) {
        setErrorMessage('Lütfen tüm alanları doldurun')
        setIsLoading(false)
        return
      }

      const response = await login({
        companyCode: 'DEFAULT',
        username,
        password,
        userType: selectedType
      })

      if (response.success && response.user) {
        if (response.user.userType === 'courier') {
          router.push('/kurye')
        } else if (response.user.userType === 'restaurant') {
          router.push('/restoran')
        } else if (response.user.userType === 'admin') {
          router.push('/admin')
        }
      } else {
        setErrorMessage(response.error || 'Giriş yapılırken bir hata oluştu')
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrorMessage('Giriş yapılırken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedType(null)
    setUsername('')
    setPassword('')
    setErrorMessage('')
  }

  // ============================================================
  // PANEL SEÇİM EKRANI
  // ============================================================
  if (!selectedType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          {/* Logo ve Başlık */}
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-20 h-20 mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-white mb-1">
              Alda Gel Kurye
            </h1>
            <p className="text-slate-400 text-sm">
              Giriş yapmak için rolünüzü seçin
            </p>
          </div>

          {/* Giriş Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Admin Girişi */}
            <button
              id="btn-admin-select"
              onClick={() => setSelectedType('admin')}
              className="group bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-purple-500 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">👨‍💼</div>
              <h2 className="text-lg font-bold text-white mb-1">Admin Girişi</h2>
              <p className="text-slate-400 text-xs">Sistem yönetimi ve kontrol paneli</p>
              <div className="mt-3 flex items-center justify-center text-purple-400 font-medium text-sm">
                Giriş Yap
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Restoran Girişi */}
            <button
              id="btn-restoran-select"
              onClick={() => setSelectedType('restaurant')}
              className="group bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-orange-500 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-orange-500/20"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🍽️</div>
              <h2 className="text-lg font-bold text-white mb-1">Restoran Girişi</h2>
              <p className="text-slate-400 text-xs">Sipariş yönetimi ve raporlama</p>
              <div className="mt-3 flex items-center justify-center text-orange-400 font-medium text-sm">
                Giriş Yap
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Kurye Girişi */}
            <button
              id="btn-kurye-select"
              onClick={() => setSelectedType('courier')}
              className="group bg-slate-900 hover:bg-slate-800 border-2 border-slate-800 hover:border-blue-500 rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🏍️</div>
              <h2 className="text-lg font-bold text-white mb-1">Kurye Girişi</h2>
              <p className="text-slate-400 text-xs">Paket teslimatı ve takip sistemi</p>
              <div className="mt-3 flex items-center justify-center text-blue-400 font-medium text-sm">
                Giriş Yap
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

          {/* Alt Bilgi */}
          <div className="text-center mt-12 text-slate-500 text-sm">
            <p>© 2026 Alda Gel - Tüm hakları saklıdır</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // GİRİŞ FORMU
  // ============================================================
  const getLoginColor = () => {
    if (selectedType === 'courier') return 'blue'
    if (selectedType === 'restaurant') return 'orange'
    return 'purple'
  }

  const getLoginTitle = () => {
    if (selectedType === 'courier') return '🏍️ Kurye Girişi'
    if (selectedType === 'restaurant') return '🍽️ Restoran Girişi'
    return '👨‍💼 Admin Girişi'
  }

  const color = getLoginColor()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Geri Butonu */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Geri Dön
        </button>

        {/* Giriş Kartı */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{getLoginTitle()}</h2>
            <p className="text-slate-400 text-sm">Lütfen giriş bilgilerinizi girin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Kullanıcı Adı</label>
              <input
                id="input-username"
                type="text"
                placeholder="Kullanıcı adınız"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-${color}-500 transition-colors`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Şifre</label>
              <input
                id="input-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-${color}-500 transition-colors`}
                required
              />
            </div>

            {errorMessage && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                {errorMessage}
              </div>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 bg-${color}-600 hover:bg-${color}-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>

            {selectedType !== 'admin' && (
              <div className="text-center pt-2">
                <p className="text-slate-400 text-sm">
                  Hesabınız yok mu?{' '}
                  <Link
                    href={selectedType === 'courier' ? '/register-kurye' : '/register-restoran'}
                    className={`text-${color}-400 hover:text-${color}-300 font-medium underline transition-colors`}
                  >
                    {selectedType === 'courier' ? 'Kurye Kaydı' : 'Restoran Kaydı'}
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
