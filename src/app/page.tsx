/**
 * @file src/app/page.tsx
 * @description Ana Giriş Terminali
 * Kullanıcılar buradan Admin, Restoran veya Kurye paneline yönlendirilir.
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getSession } from '@/services/authService'

export default function HomePage() {
  const router = useRouter()
  const [isAndroid, setIsAndroid] = useState(false)

  // Platform kontrolü
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      setIsAndroid(/android/i.test(userAgent))
    }
  }, [])

  // Zaten giriş yapmışsa otomatik yönlendir
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getSession()
      if (user) {
        if (user.userType === 'admin') {
          router.push('/admin')
        } else if (user.userType === 'restaurant') {
          router.push('/restoran')
        } else if (user.userType === 'courier') {
          router.push('/kurye')
        }
      }
    }
  }, [router])

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-16 mt-[22px]">
          <img
            src="/logo.png"
            alt="Mergen Kurye Logo"
            className="w-72 h-72 mx-auto mb-8 drop-shadow-2xl"
          />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Mergen Kurye Sistemi
          </h1>
          <p className="text-slate-400 text-xl md:text-2xl font-light">
            Giriş yapmak için paneli seçin
          </p>
        </div>

        {/* Giriş Kartları - Android: Yatay (yan yana), Web: Dikey (geniş) */}
        <div className={isAndroid 
          ? "grid grid-cols-3 gap-3 mb-12 px-2" 
          : "grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
        }>
          {/* Admin Girişi */}
          <button
            onClick={() => handleNavigation('/admin')}
            className={isAndroid
              ? "group relative bg-gradient-to-br from-slate-900 to-slate-800 active:from-purple-900/30 active:to-slate-800 border-2 border-slate-700 active:border-purple-500 rounded-2xl p-4 transition-all duration-300 active:scale-95 overflow-hidden"
              : "group relative bg-gradient-to-br from-slate-900 to-slate-800 hover:from-purple-900/30 hover:to-slate-800 border-2 border-slate-700 hover:border-purple-500 rounded-3xl p-10 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 overflow-hidden"
            }
          >
            {/* Arka Plan Efekti */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-transparent transition-all duration-500"></div>

            {/* İçerik */}
            <div className="relative z-10 flex flex-col items-center">
              {/* İkon */}
              <div className={isAndroid 
                ? "text-5xl mb-3 group-active:scale-110 transition-transform duration-300"
                : "text-7xl mb-6 group-hover:scale-110 transition-transform duration-500"
              }>
                🔑
              </div>

              {/* Başlık */}
              <h2 className={isAndroid
                ? "text-lg font-bold text-white mb-1 group-active:text-purple-300 transition-colors text-center"
                : "text-3xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors"
              }>
                Admin
              </h2>

              {/* Açıklama - Sadece Web'de göster */}
              {!isAndroid && (
                <>
                  <p className="text-slate-400 text-base mb-6 group-hover:text-slate-300 transition-colors">
                    Sistem yönetimi ve kontrol paneli
                  </p>

                  {/* Alt Çizgi */}
                  <div className="h-1 w-0 group-hover:w-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 rounded-full mx-auto"></div>

                  {/* Ok İkonu */}
                  <div className="mt-6 flex items-center justify-center text-purple-400 font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="mr-2">Giriş Yap</span>
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Restoran Girişi */}
          <button
            onClick={() => handleNavigation('/restoran')}
            className={isAndroid
              ? "group relative bg-gradient-to-br from-slate-900 to-slate-800 active:from-orange-900/30 active:to-slate-800 border-2 border-slate-700 active:border-orange-500 rounded-2xl p-4 transition-all duration-300 active:scale-95 overflow-hidden"
              : "group relative bg-gradient-to-br from-slate-900 to-slate-800 hover:from-orange-900/30 hover:to-slate-800 border-2 border-slate-700 hover:border-orange-500 rounded-3xl p-10 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30 overflow-hidden"
            }
          >
            {/* Arka Plan Efekti */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/10 group-hover:to-transparent transition-all duration-500"></div>

            {/* İçerik */}
            <div className="relative z-10 flex flex-col items-center">
              {/* İkon */}
              <div className={isAndroid 
                ? "text-5xl mb-3 group-active:scale-110 transition-transform duration-300"
                : "text-7xl mb-6 group-hover:scale-110 transition-transform duration-500"
              }>
                🍽️
              </div>

              {/* Başlık */}
              <h2 className={isAndroid
                ? "text-lg font-bold text-white mb-1 group-active:text-orange-300 transition-colors text-center"
                : "text-3xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors"
              }>
                Restoran
              </h2>

              {/* Açıklama - Sadece Web'de göster */}
              {!isAndroid && (
                <>
                  <p className="text-slate-400 text-base mb-6 group-hover:text-slate-300 transition-colors">
                    Sipariş yönetimi ve raporlama
                  </p>

                  {/* Alt Çizgi */}
                  <div className="h-1 w-0 group-hover:w-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 rounded-full mx-auto"></div>

                  {/* Ok İkonu */}
                  <div className="mt-6 flex items-center justify-center text-orange-400 font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="mr-2">Giriş Yap</span>
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Kurye Girişi */}
          <button
            onClick={() => handleNavigation('/kurye')}
            className={isAndroid
              ? "group relative bg-gradient-to-br from-slate-900 to-slate-800 active:from-blue-900/30 active:to-slate-800 border-2 border-slate-700 active:border-blue-500 rounded-2xl p-4 transition-all duration-300 active:scale-95 overflow-hidden"
              : "group relative bg-gradient-to-br from-slate-900 to-slate-800 hover:from-blue-900/30 hover:to-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-3xl p-10 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 overflow-hidden"
            }
          >
            {/* Arka Plan Efekti */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-transparent transition-all duration-500"></div>

            {/* İçerik */}
            <div className="relative z-10 flex flex-col items-center">
              {/* İkon */}
              <div className={isAndroid 
                ? "text-5xl mb-3 group-active:scale-110 transition-transform duration-300"
                : "text-7xl mb-6 group-hover:scale-110 transition-transform duration-500"
              }>
                🏍️
              </div>

              {/* Başlık */}
              <h2 className={isAndroid
                ? "text-lg font-bold text-white mb-1 group-active:text-blue-300 transition-colors text-center"
                : "text-3xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors"
              }>
                Kurye
              </h2>

              {/* Açıklama - Sadece Web'de göster */}
              {!isAndroid && (
                <>
                  <p className="text-slate-400 text-base mb-6 group-hover:text-slate-300 transition-colors">
                    Paket teslimatı ve takip sistemi
                  </p>

                  {/* Alt Çizgi */}
                  <div className="h-1 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full mx-auto"></div>

                  {/* Ok İkonu */}
                  <div className="mt-6 flex items-center justify-center text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="mr-2">Giriş Yap</span>
                    <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Alt Bilgi */}
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-2">
            © 2026 Mergen Teknoloji - Tüm hakları saklıdır
          </p>
          <p className="text-slate-600 text-xs">
            Güvenli ve hızlı teslimat çözümleri
          </p>
        </div>
      </div>
    </div>
  )
}
