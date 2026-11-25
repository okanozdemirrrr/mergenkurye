'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, UtensilsCrossed, Bike, ChevronRight } from 'lucide-react'
import { login } from '@/services/authService'
import { Preferences } from '@capacitor/preferences'
import { initScrollBuild } from '@/lib/scroll-build'

type LoginType = 'courier' | 'restaurant' | 'admin' | null

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

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { value: prefKurye } = await Preferences.get({ key: COURIER_STORAGE_KEYS.LOGIN })
        const { value: prefCourierId } = await Preferences.get({ key: COURIER_STORAGE_KEYS.COURIER_ID })

        if (prefKurye === 'true' && prefCourierId) {
          console.log('✅ [RootPage] Capacitor Preferences\'tan kurye oturumu bulundu — /kurye\'ye yönlendiriliyor')
          router.replace('/kurye')
          return
        }

        const localKurye = localStorage.getItem(COURIER_STORAGE_KEYS.LOGIN)
        const localCourierId = localStorage.getItem(COURIER_STORAGE_KEYS.COURIER_ID)

        if (localKurye === 'true' && localCourierId) {
          console.log('✅ [RootPage] localStorage\'dan kurye oturumu bulundu — /kurye\'ye yönlendiriliyor')
          router.replace('/kurye')
          return
        }

        const localRestoran = localStorage.getItem(RESTORAN_STORAGE_KEY)
        if (localRestoran === 'true') {
          console.log('✅ [RootPage] Restoran oturumu bulundu — /restoran\'a yönlendiriliyor')
          router.replace('/restoran')
          return
        }

        const localAdmin = localStorage.getItem(ADMIN_STORAGE_KEY)
        if (localAdmin === 'true') {
          console.log('✅ [RootPage] Admin oturumu bulundu — /admin\'e yönlendiriliyor')
          router.replace('/admin')
          return
        }

        console.log('ℹ️ [RootPage] Aktif oturum yok, login ekranı gösteriliyor')
      } catch (error) {
        console.error('[RootPage] Session kontrolü hatası:', error)
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

  // Scroll-triggered build animation (role select + login screens)
  useEffect(() => {
    if (isAuthLoading) return
    const dispose = initScrollBuild()
    return dispose
  }, [isAuthLoading, selectedType])

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

      if (selectedType === 'admin') {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
        const data = await res.json().catch(() => ({}))

        if (res.ok && data.success) {
          localStorage.setItem(ADMIN_STORAGE_KEY, 'true')
          router.push('/admin')
        } else {
          setErrorMessage(data.error || 'Admin kullanıcı adı veya şifre hatalı')
        }
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

  if (!selectedType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4" style={{ backgroundColor: '#0B1D24' }}>
        <div className="max-w-5xl w-full space-y-10 py-8">
          {/* Hero — most spectacular build sequence */}
          <section className="build-section build-section--hero text-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="build-element build-reveal w-20 h-20 mx-auto mb-3"
              data-build-delay="0"
            />
            <h1
              className="build-element build-typewriter text-2xl font-bold text-white mb-1 inline-block px-2"
              data-build-delay="120"
              data-build-text="Alda Gel Kurye"
            >
              Alda Gel Kurye
            </h1>
            <p
              className="build-element text-slate-400 text-sm mt-1 inline-block px-2"
              data-build-delay="280"
            >
              Giriş yapmak için rolünüzü seçin
            </p>
          </section>

          {/* Role cards — staggered L→R */}
          <section className="build-section grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              id="btn-admin-select"
              onClick={() => setSelectedType('admin')}
              className="build-element group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-purple-500 rounded-md p-4 transition-all duration-300 hover:shadow-sm hover:shadow-purple-500/20 shadow-sm"
              data-build-delay="200"
              style={{ ['--build-fill-bg' as string]: 'rgb(15 23 42)' }}
            >
              <div className="mb-2 flex justify-center">
                <Shield className="w-7 h-7 text-purple-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Admin Girişi</h2>
              <p className="text-slate-400 text-xs">Sistem yönetimi ve kontrol paneli</p>
              <div className="build-element build-cta mt-3 flex items-center justify-center text-purple-400 font-medium text-sm" data-build-delay="420">
                Giriş Yap
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </div>
            </button>

            <button
              id="btn-restoran-select"
              onClick={() => setSelectedType('restaurant')}
              className="build-element group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-orange-500 rounded-md p-4 transition-all duration-300 hover:shadow-sm hover:shadow-orange-500/20 shadow-sm"
              data-build-delay="320"
              style={{ ['--build-fill-bg' as string]: 'rgb(15 23 42)' }}
            >
              <div className="mb-2 flex justify-center">
                <UtensilsCrossed className="w-7 h-7 text-orange-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Restoran Girişi</h2>
              <p className="text-slate-400 text-xs">Sipariş yönetimi ve raporlama</p>
              <div className="build-element build-cta mt-3 flex items-center justify-center text-orange-400 font-medium text-sm" data-build-delay="520">
                Giriş Yap
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </div>
            </button>

            <button
              id="btn-kurye-select"
              onClick={() => setSelectedType('courier')}
              className="build-element group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-blue-500 rounded-md p-4 transition-all duration-300 hover:shadow-sm hover:shadow-blue-500/20 shadow-sm"
              data-build-delay="420"
              style={{ ['--build-fill-bg' as string]: 'rgb(15 23 42)' }}
            >
              <div className="mb-2 flex justify-center">
                <Bike className="w-7 h-7 text-blue-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Kurye Girişi</h2>
              <p className="text-slate-400 text-xs">Paket teslimatı ve takip sistemi</p>
              <div className="build-element build-cta mt-3 flex items-center justify-center text-blue-400 font-medium text-sm" data-build-delay="620">
                Giriş Yap
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </div>
            </button>
          </section>

          <section className="build-section text-center text-slate-500 text-sm">
            <p className="build-element inline-block px-2" data-build-delay="700">
              © 2026 Alda Gel - Tüm hakları saklıdır
            </p>
          </section>
        </div>
      </div>
    )
  }

  const getLoginColor = () => {
    if (selectedType === 'courier') return 'blue'
    if (selectedType === 'restaurant') return 'orange'
    return 'purple'
  }

  const getLoginTitle = () => {
    if (selectedType === 'courier') return 'Kurye Girişi'
    if (selectedType === 'restaurant') return 'Restoran Girişi'
    return 'Admin Girişi'
  }

  const color = getLoginColor()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4" style={{ backgroundColor: '#0B1D24' }}>
      <div className="max-w-md w-full">
        <button
          onClick={handleBack}
          className="build-element mb-6 flex items-center text-slate-400 hover:text-white transition-colors"
          data-build-delay="0"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          Geri Dön
        </button>

        <section
          className="build-section build-section--hero build-element bg-slate-900 border border-white/5 rounded-md p-8 shadow-sm"
          data-build-delay="80"
          style={{ ['--build-fill-bg' as string]: 'rgb(15 23 42)' }}
        >
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Logo"
              className="build-element build-reveal w-24 h-24 mx-auto mb-4"
              data-build-delay="0"
            />
            <h2
              className="build-element text-lg font-semibold text-white mb-2 inline-block"
              data-build-delay="140"
            >
              {getLoginTitle()}
            </h2>
            <p className="build-element text-slate-400 text-sm" data-build-delay="260">
              Lütfen giriş bilgilerinizi girin
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="build-element" data-build-delay="320">
              <label className="block text-sm font-medium text-slate-300 mb-2">Kullanıcı Adı</label>
              <input
                id="input-username"
                type="text"
                placeholder="Kullanıcı adınız"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-${color}-500 transition-colors`}
                required
              />
            </div>

            <div className="build-element" data-build-delay="400">
              <label className="block text-sm font-medium text-slate-300 mb-2">Şifre</label>
              <input
                id="input-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-${color}-500 transition-colors`}
                required
              />
            </div>

            {errorMessage && (
              <div className="bg-red-900/30 border border-red-500 rounded-md p-3 text-red-300 text-sm">
                {errorMessage}
              </div>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className={`build-element build-cta w-full py-3 bg-${color}-600 hover:bg-${color}-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              data-build-delay="520"
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>

            {selectedType !== 'admin' && (
              <div className="build-element text-center pt-2" data-build-delay="600">
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
        </section>
      </div>
    </div>
  )
}
