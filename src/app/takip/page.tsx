/**
 * @file src/app/takip/page.tsx
 * @description Müşteri Sipariş Takip Paneli
 */
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Package } from '@/types'
import { supabase } from '../lib/supabase'

// Harita bileşenini dinamik olarak yükle (SSR devre dışı)
const CustomerTrackingMap = dynamic(
  () => import('./components/CustomerTrackingMap').then(mod => ({ default: mod.CustomerTrackingMap })),
  { ssr: false, loading: () => <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">Harita yükleniyor...</div> }
)

function TakipContent() {
  const searchParams = useSearchParams()
  const orderCode = searchParams.get('kod')
  
  const [isLoading, setIsLoading] = useState(true)
  const [orderNumber, setOrderNumber] = useState(orderCode || '')
  const [packageData, setPackageData] = useState<Package | null>(null)
  const [error, setError] = useState('')
  const [deliveredMessage, setDeliveredMessage] = useState('')

  // Sipariş sorgulama
  const handleSearch = async (code?: string) => {
    const searchCode = code || orderNumber
    if (!searchCode.trim()) {
      setError('Lütfen sipariş kodunu girin')
      return
    }

    setIsLoading(true)
    setError('')
    setDeliveredMessage('')
    setPackageData(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('packages')
        .select(`
          *,
          restaurant:restaurants(id, name, latitude, longitude)
        `)
        .eq('order_number', searchCode.trim())
        .single()

      if (fetchError || !data) {
        setError('Girdiğiniz sipariş numarasını kontrol edin')
        setIsLoading(false)
        return
      }

      // Teslim edilmiş mi kontrol et
      if (data.status === 'delivered') {
        const deliveredDate = new Date(data.delivered_at || data.created_at)
        const formattedDate = deliveredDate.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        const formattedTime = deliveredDate.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit'
        })
        
        setDeliveredMessage(
          `${formattedDate} tarihinde, saat ${formattedTime} itibariyle ${searchCode} numaralı siparişiniz başarıyla teslim edilmiştir. Afiyet olsun!`
        )
        setIsLoading(false)
        return
      }

      // İptal edilmiş mi kontrol et
      if (data.status === 'cancelled') {
        setError('Bu sipariş iptal edilmiştir')
        setIsLoading(false)
        return
      }

      // Aktif sipariş - haritayı göster
      setPackageData(data)
      setIsLoading(false)
    } catch (err) {
      console.error('Sipariş sorgu hatası:', err)
      setError('Bir hata oluştu, lütfen tekrar deneyin')
      setIsLoading(false)
    }
  }

  // URL'de kod varsa otomatik sorgula
  useEffect(() => {
    if (orderCode) {
      handleSearch(orderCode)
    } else {
      setIsLoading(false)
    }
  }, [orderCode])

  // Giriş ekranı
  if (!packageData && !deliveredMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo ve Başlık */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📦</div>
            <h1 className="text-3xl font-bold text-white mb-2">Mergen Kurye</h1>
            <p className="text-slate-400">Siparişinizi Takip Edin</p>
          </div>

          {/* Giriş Formu */}
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sipariş Kodu
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Örn: MRG-2024-001"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Sorgulanıyor...' : 'Siparişi Takip Et'}
              </button>
            </div>
          </div>

          {/* Bilgilendirme */}
          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Sipariş kodunuz restoranınız tarafından size iletilmiştir.</p>
          </div>
        </div>
      </div>
    )
  }

  // Teslim edilmiş sipariş mesajı
  if (deliveredMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-4">Sipariş Teslim Edildi</h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                {deliveredMessage}
              </p>
              <button
                onClick={() => {
                  setDeliveredMessage('')
                  setOrderNumber('')
                  setPackageData(null)
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Başka Sipariş Sorgula
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Aktif sipariş - harita göster
  return (
    <div className="h-screen w-screen overflow-hidden">
      <CustomerTrackingMap packageData={packageData!} />
    </div>
  )
}

export default function TakipPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    }>
      <TakipContent />
    </Suspense>
  )
}
