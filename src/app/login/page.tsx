'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bike, UtensilsCrossed, Shield, ChevronRight, ChevronLeft } from 'lucide-react'
import { login, isAuthenticated, getSession } from '@/services/authService'

type LoginType = 'courier' | 'restaurant' | 'admin' | null

export default function LoginPage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<LoginType>(null)
  const [companyCode, setCompanyCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getSession()
      if (user) {
        if (user.userType === 'courier') {
          router.push('/kurye')
        } else if (user.userType === 'restaurant') {
          router.push('/restoran')
        } else if (user.userType === 'admin') {
          router.push('/')
        }
      }
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    try {
      if (!username || !password || !selectedType) {
        setErrorMessage('Lütfen kullanıcı adı ve şifre girin')
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
          router.push('/')
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
    setCompanyCode('')
    setUsername('')
    setPassword('')
    setErrorMessage('')
  }

  if (!selectedType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-12">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-32 h-32 mx-auto mb-6"
            />
            <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">
              Mergen Kurye Sistemi
            </h1>
            <p className="text-slate-400 text-sm">
              Giriş yapmak için rolünüzü seçin
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setSelectedType('courier')}
              className="group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-blue-500 rounded-md p-8 transition-all duration-300 hover:shadow-sm hover:shadow-blue-500/20 shadow-sm"
            >
              <div className="mb-4 flex justify-center">
                <Bike className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Kurye Girişi
              </h2>
              <p className="text-slate-400">
                Paket teslimatı ve takip sistemi
              </p>
              <div className="mt-6 flex items-center justify-center text-blue-400 font-medium">
                Giriş Yap
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </div>
            </button>

            <button
              onClick={() => setSelectedType('restaurant')}
              className="group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-orange-500 rounded-md p-8 transition-all duration-300 hover:shadow-sm hover:shadow-orange-500/20 shadow-sm"
            >
              <div className="mb-4 flex justify-center">
                <UtensilsCrossed className="w-8 h-8 text-orange-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Restoran Girişi
              </h2>
              <p className="text-slate-400">
                Sipariş yönetimi ve raporlama
              </p>
              <div className="mt-6 flex items-center justify-center text-orange-400 font-medium">
                Giriş Yap
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </div>
            </button>

            <button
              onClick={() => setSelectedType('admin')}
              className="group bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-purple-500 rounded-md p-8 transition-all duration-300 hover:shadow-sm hover:shadow-purple-500/20 shadow-sm"
            >
              <div className="mb-4 flex justify-center">
                <Shield className="w-8 h-8 text-purple-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Admin Girişi
              </h2>
              <p className="text-slate-400">
                Sistem yönetimi ve kontrol paneli
              </p>
              <div className="mt-6 flex items-center justify-center text-purple-400 font-medium">
                Giriş Yap
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" strokeWidth={1.5} />
              </div>
            </button>
          </div>

          <div className="text-center mt-12 text-slate-500 text-sm">
            <p>© 2026 Mergen Teknoloji - Tüm hakları saklıdır</p>
          </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={handleBack}
          className="mb-6 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-2" strokeWidth={1.5} />
          Geri Dön
        </button>

        <div className="bg-slate-900 border border-white/5 rounded-md p-8 shadow-sm">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-24 h-24 mx-auto mb-4"
            />
            <h2 className="text-lg font-semibold text-white mb-2">
              {getLoginTitle()}
            </h2>
            <p className="text-slate-400 text-sm">
              Lütfen giriş bilgilerinizi girin
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {(selectedType === 'admin' || selectedType === 'restaurant') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Şirket Kodu
                </label>
                <input
                  type="text"
                  placeholder="Örn: MERGEN001"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-${color}-500 transition-colors`}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                placeholder="Kullanıcı adınız"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-${color}-500 transition-colors`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Şifre
              </label>
              <input
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
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 bg-${color}-600 hover:bg-${color}-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 text-center text-slate-500 text-xs">
            <p>Şirket kodunuzu bilmiyorsanız yöneticinize danışın</p>
          </div>
        </div>
      </div>
    </div>
  )
}
