'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Shield, UtensilsCrossed, Bike } from 'lucide-react'

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
      <div className="mb-12 text-center">
        <img
          src="/logo.png"
          alt="Mergen Teknoloji"
          className="w-32 h-32 mx-auto mb-6"
        />
        <h1 className="text-2xl md:text-2xl font-bold text-white mb-3">
          Mergen Kurye Sistemi
        </h1>
        <p className="text-slate-400 text-lg">
          Giriş yapmak için paneli seçin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <Link href="/admin">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-md p-8 hover:bg-slate-800 hover:border-orange-500 transition-all duration-300 cursor-pointer shadow-sm">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Shield className="w-8 h-8 text-purple-400" strokeWidth={1.5} />
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

        <Link href="/restoran">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-md p-8 hover:bg-slate-800 hover:border-orange-500 transition-all duration-300 cursor-pointer shadow-sm">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <UtensilsCrossed className="w-8 h-8 text-orange-400" strokeWidth={1.5} />
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

        <Link href="/kurye">
          <div className="group bg-slate-800/50 backdrop-blur-sm border border-white/5 rounded-md p-8 hover:bg-slate-800 hover:border-orange-500 transition-all duration-300 cursor-pointer shadow-sm">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Bike className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
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

      <div className="mt-12 text-center text-slate-500 text-sm">
        © 2026 Mergen Teknoloji - Tüm hakları saklıdır
        <br />
        <span className="text-xs">Powered by Kiro assistant</span>
      </div>
    </div>
  )
}
