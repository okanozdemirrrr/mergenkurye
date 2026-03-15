'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-12 text-center">
        <img
          src="/logo.png"
          alt="Mergen Teknoloji"
          className="w-32 h-32 mx-auto mb-6"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Mergen Kurye Sistemi
        </h1>
        <p className="text-slate-400 text-lg">
          Giriş yapmak için paneli seçin
        </p>
      </div>

      {/* Panel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Admin Panel */}
        <Link href="/admin">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:bg-slate-800 hover:border-orange-500 transition-all duration-300 cursor-pointer transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🔑
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Admin
              </h2>
              <p className="text-slate-400 text-sm">
                Sistem yönetimi ve kontrol paneli
              </p>
            </div>
          </div>
        </Link>

        {/* Restoran Panel */}
        <Link href="/restoran">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:bg-slate-800 hover:border-orange-500 transition-all duration-300 cursor-pointer transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🍽️
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Restoran
              </h2>
              <p className="text-slate-400 text-sm">
                Sipariş yönetimi ve raporlama
              </p>
            </div>
          </div>
        </Link>

        {/* Kurye Panel */}
        <Link href="/kurye">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:bg-slate-800 hover:border-orange-500 transition-all duration-300 cursor-pointer transform hover:scale-105">
            <div className="text-center">
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                🚴
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Kurye
              </h2>
              <p className="text-slate-400 text-sm">
                Paket teslimatı ve takip sistemi
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-slate-500 text-sm">
        © 2026 Mergen Teknoloji - Tüm hakları saklıdır
        <br />
        <span className="text-xs">Powered by Kiro assistant</span>
      </div>
    </div>
  )
}
