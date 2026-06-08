'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import KanbanBoard from './KanbanBoard'
import NewOrderModal from './NewOrderModal'
import PullToRefresh from '@/components/PullToRefresh'
import { Package, Courier } from '@/types'
import { formatTurkishTime, formatShortDateTime } from '@/utils/dateHelpers'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { useRestaurantReminder } from '@/hooks/useRestaurantReminder'
import { playRestaurantAlert } from '@/hooks/useRestaurantRealtimeNotifications'
import { useRestoran } from '../RestoranProvider'

interface Restaurant {
  id: string
  name: string
  logo_url?: string
  package_fee?: number
}

interface RestaurantDashboardProps {
  restaurantId: string
  darkMode: boolean
  setDarkMode: (value: boolean) => void
}

export default function RestaurantDashboard({ restaurantId, darkMode, setDarkMode }: RestaurantDashboardProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { showNewOrderModal, setShowNewOrderModal } = useRestoran()
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'delivered' | 'cancelled'>('active')
  const [displayLimit, setDisplayLimit] = useState(50) // 🎯 Teslim edilenler listesi gösterim limiti
  const [currentPage, setCurrentPage] = useState(0) // 🎯 Teslim edilenler listesi sayfa numarası (0'dan başlar)
  // Bugünün tarihini YYYY-MM-DD formatında al (varsayılan filtre)
  const getTodayString = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const [startDate, setStartDate] = useState(getTodayString)
  const [endDate, setEndDate] = useState(getTodayString)
  const [cancelledPackages, setCancelledPackages] = useState<Package[]>([])
  const printReceiptRef = useRef<(orderData: Package) => void>(() => {})
  
  // 🎯 Manuel Filtreleme için Temporary State
  const [tempStartDate, setTempStartDate] = useState(getTodayString)
  const [tempEndDate, setTempEndDate] = useState(getTodayString)
  
  // Günlük finansal özet state'leri
  const [todayStats, setTodayStats] = useState({
    packageCount: 0,
    chargeableCount: 0, // Teslim Edilen + Ücretli İptal Sayısı
    packageFee: 0,
    totalRevenue: 0,
    netRevenue: 0,
    isLoading: true
  })

  // Paket başına ücret - Restorandan alınacak, yoksa varsayılan 100
  const PACKAGE_FEE = restaurant?.package_fee || 100

  // 🔔 Akıllı Hatırlatıcı Sistemi
  const { isPackageDelayed, getDelayedMinutes, hasDelayedPackages } = useRestaurantReminder(packages, {
    warningThresholdMinutes: 10, // 10 dakika sonra uyarı
    soundIntervalMinutes: 2 // Her 2 dakikada bir ses
  })

  useEffect(() => {
    const loadData = async () => {
      await fetchRestaurant()
      await fetchTodayStats()
    }

    loadData()
    fetchPackages()
    fetchCouriers()
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase
      .channel('public:packages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrder = payload.new as Package

          setPackages((prev) => {
            if (prev.some((p) => p.id === newOrder.id)) return prev
            return [newOrder, ...prev]
          })

          if (
            newOrder.platform === 'web' &&
            (newOrder.status === 'new_order' || newOrder.status === 'new')
          ) {
            playRestaurantAlert()
          }

          fetchTodayStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as Package
          setPackages((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          )
          setDeliveredPackages((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          )
          setCancelledPackages((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          )
          fetchTodayStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'packages',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const removedId = (payload.old as Package).id
          setPackages((prev) => prev.filter((p) => p.id !== removedId))
          setDeliveredPackages((prev) => prev.filter((p) => p.id !== removedId))
          setCancelledPackages((prev) => prev.filter((p) => p.id !== removedId))
          fetchTodayStats()
        }
      )
      .subscribe((status) => {
        console.log('📡 Restoran Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  // ✅ KRİTİK FIX: Tab değişince, filtre uygulanınca veya sayfa değişince veriyi çek
  useEffect(() => {
    if (!restaurantId) return
    fetchPackages()
  }, [activeTab, startDate, endDate, currentPage])

  const fetchRestaurant = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, logo_url, package_fee')
        .eq('id', restaurantId)
        .single()

      if (error) throw error
      setRestaurant(data)
    } catch (error) {
      console.error('Restoran bilgisi alınamadı:', error)
    }
  }, [restaurantId])

  const fetchPackages = useCallback(async () => {
    // İlk yüklemede loading göster, sonrasında sessiz güncelle
    if (packages.length === 0) {
      setIsLoading(true)
    }
    
    try {
      if (activeTab === 'active') {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .in('status', ['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up', 'on_the_way'])
          .order('created_at', { ascending: false})

        if (error) throw error
        setPackages(data || [])
      } else if (activeTab === 'delivered') {
        // Teslim edilen siparişler - MANUEL FİLTRELEME (sadece startDate/endDate değiştiğinde)
        let query = supabase
          .from('packages')
          .select(`
            *,
            courier:couriers!packages_courier_id_fkey(full_name)
          `)
          .eq('restaurant_id', restaurantId)
          .eq('status', 'delivered')
          .order('delivered_at', { ascending: false })

        // ✅ KESİN DÜZELTME: new Date() UTC offset'i bozar.
        // "YYYY-MM-DD" → doğrudan string olarak gönder, Supabase local time olarak işler.
        const effectiveStart = startDate || getTodayString()
        const effectiveEnd = endDate || getTodayString()

        console.log('🔍 [DEBUG] Giden Parametreler (delivered):', {
          restaurantId,
          effectiveStart,
          effectiveEnd,
          startISO: `${effectiveStart}T00:00:00`,
          endISO: `${effectiveEnd}T23:59:59`,
          currentPage,
          displayLimit
        })

        query = query.gte('delivered_at', `${effectiveStart}T00:00:00`)
        query = query.lte('delivered_at', `${effectiveEnd}T23:59:59`)

        // Sayfalama optimizasyonu - SQL seviyesinde kısıtlama (range)
        const fromOffset = currentPage * displayLimit
        const toOffset = (currentPage + 1) * displayLimit - 1
        query = query.range(fromOffset, toOffset)

        const { data, error } = await query

        console.log('🔍 [DEBUG] Supabase Yanıtı (delivered):', { data, error, count: data?.length })

        if (error) throw error
        setDeliveredPackages(data || [])
      } else if (activeTab === 'cancelled') {
        // İptal edilen siparişler
        let query = supabase
          .from('packages')
          .select(`
            *,
            courier:couriers!packages_courier_id_fkey(full_name)
          `)
          .eq('restaurant_id', restaurantId)
          .eq('status', 'cancelled')
          .order('cancelled_at', { ascending: false })

        // ✅ KESİN DÜZELTME: new Date() UTC offset'i bozar.
        const effectiveCancelStart = startDate || getTodayString()
        const effectiveCancelEnd = endDate || getTodayString()

        console.log('🔍 [DEBUG] Giden Parametreler (cancelled):', {
          restaurantId,
          effectiveCancelStart,
          effectiveCancelEnd,
          startISO: `${effectiveCancelStart}T00:00:00`,
          endISO: `${effectiveCancelEnd}T23:59:59`
        })

        query = query.gte('cancelled_at', `${effectiveCancelStart}T00:00:00`)
        query = query.lte('cancelled_at', `${effectiveCancelEnd}T23:59:59`)

        const { data, error } = await query

        console.log('🔍 [DEBUG] Supabase Yanıtı (cancelled):', { data, error, count: data?.length })

        if (error) throw error
        setCancelledPackages(data || [])
      }
    } catch (error) {
      console.error('Siparişler alınamadı:', error)
    } finally {
      if (packages.length === 0) {
        setIsLoading(false)
      }
    }
  }, [restaurantId, activeTab, startDate, endDate, packages.length, displayLimit, currentPage])

  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('id, full_name')
        .order('full_name')

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error('Kuryeler alınamadı:', error)
    }
  }, [])

  const fetchTodayStats = useCallback(async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const { data: rpcData, error } = await supabase.rpc(
        'get_restaurant_period_financials',
        {
          p_restaurant_id: restaurantId,
          p_start_date: todayStart.toISOString(),
          p_end_date: todayEnd.toISOString(),
        }
      )

      if (error) throw error

      const stats = rpcData as {
        unpaid_package_count?: number
        unpaid_cost?: number
        unpaid_revenue?: number
        net_payable?: number
      } | null

      const packageCount = Number(stats?.unpaid_package_count ?? 0)
      const totalRevenue = Number(stats?.unpaid_revenue ?? 0)
      const calculatedTotalCost = Number(stats?.unpaid_cost ?? 0)
      const netRevenue = Number(stats?.net_payable ?? 0)

      setTodayStats({
        packageCount,
        chargeableCount: packageCount,
        packageFee: calculatedTotalCost,
        totalRevenue,
        netRevenue,
        isLoading: false
      })
    } catch (error) {
      console.error('Günlük istatistikler alınamadı:', error)
      setTodayStats(prev => ({ ...prev, isLoading: false }))
    }
  }, [restaurantId, PACKAGE_FEE])

  const handleNewOrderSuccess = useCallback(() => {
    setSuccessMessage('✅ Yeni sipariş başarıyla oluşturuldu!')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchPackages()
  }, [fetchPackages])

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchRestaurant(),
      fetchPackages(),
      fetchTodayStats()
    ])
  }, [fetchRestaurant, fetchPackages, fetchTodayStats])

  // 🎯 Manuel Filtreleme Fonksiyonları
  const handleApplyFilter = useCallback(() => {
    setStartDate(tempStartDate)
    setEndDate(tempEndDate)
    setCurrentPage(0) // Filtre uygulandığında sayfayı sıfırla
  }, [tempStartDate, tempEndDate])

  const handleClearFilter = useCallback(() => {
    setTempStartDate('')
    setTempEndDate('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0) // Filtre temizlendiğinde sayfayı sıfırla
  }, [])

  const printReceipt = useCallback((orderData: any) => {
    if (typeof window === 'undefined') return

    const iframe = document.getElementById('receipt-printer') as HTMLIFrameElement
    if (!iframe) {
      console.error('❌ Yazıcı iframe bulunamadı!')
      return
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      console.error('❌ Iframe document nesnesine erişilemedi!')
      return
    }

    // Tarihi formatla
    let formattedDate = ''
    try {
      formattedDate = new Date(orderData.created_at || new Date()).toLocaleString('tr-TR')
    } catch (e) {
      formattedDate = new Date().toLocaleString('tr-TR')
    }

    const restaurantName = restaurant?.name || 'Restoran'

    const getPaymentMethodLabel = (method?: string) => {
      switch (method) {
        case 'cash': return 'Nakit'
        case 'card': return 'Kredi Kartı'
        case 'iban': return 'IBAN'
        default: return 'Belirtilmemiş'
      }
    }

    // Ürünleri HTML formatına dönüştür
    const getProductsHtml = (content?: string) => {
      if (!content) {
        return `
          <div class="item">
            <span class="name">Belirtilmemiş</span>
            <span class="price">-</span>
          </div>
        `
      }
      
      const items = content.split(/,|\n/).map(item => item.trim()).filter(Boolean)
      
      return items.map(item => {
        // Fiyat barındıran bir bitiş kısmı var mı kontrol et (Örn: "Lahmacun 100₺" veya "Adana - 150 TL")
        const priceMatch = item.match(/(.*?)\s*[-–]?\s*(\d+(?:\.\d+)?)\s*(?:TL|₺|tl|tL|Tl)?$/)
        
        if (priceMatch) {
          const name = priceMatch[1].trim()
          const price = priceMatch[2].trim()
          return `
            <div class="item">
              <span class="name">${name}</span>
              <span class="price">${price} ₺</span>
            </div>
          `
        } else {
          return `
            <div class="item">
              <span class="name">${item}</span>
              <span class="price"></span>
            </div>
          `
        }
      }).join('')
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sipariş Fişi #${orderData.id}</title>
        <style>
          @page { size: 80mm; margin: 0; }
          body {
            width: 300px; 
            margin: 0 auto;
            background-color: white;
            color: black;
            font-family: monospace;
            font-size: 14px;
            padding: 10px;
          }
          .header { text-align: center; margin-bottom: 10px; }
          .header h2 { margin: 0 0 5px 0; font-size: 20px; }
          .header p { margin: 2px 0; font-size: 12px; }
          .divider { text-align: center; margin: 10px 0; overflow: hidden; white-space: nowrap; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;}
          .total-section { font-size: 18px; font-weight: bold; }
          .total-line { display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 5px;}
          .customer-info p { margin: 3px 0; }
          .bold { font-weight: bold; }
          .receipt-footer-logo { text-align: center; margin-top: 15px; margin-bottom: 5px; }
          .receipt-footer-logo img { width: 80px; height: auto; display: block; margin: 0 auto; filter: grayscale(100%) contrast(200%); }
          .receipt-footer-logo p { font-size: 10px; margin-top: 5px; color: black; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${restaurantName.toUpperCase()}</h2>
          <p>${formattedDate}</p>
          <p>Sipariş ID: #${orderData.id}</p>
        </div>
        
        <div class="divider">--------------------------------</div>
        
        <div class="items">
          ${getProductsHtml(orderData.content)}
        </div>
        
        <div class="divider">--------------------------------</div>
        
        <div class="total-section">
          <div class="total-line">
            <span>TOPLAM:</span>
            <span>${orderData.amount} ₺</span>
          </div>
        </div>
        
        <div class="divider">--------------------------------</div>
        
        <div class="customer-info">
          <p class="bold">MÜŞTERİ BİLGİLERİ</p>
          <p>${orderData.customer_name || 'Belirtilmemiş'}</p>
          <p>${orderData.customer_phone || 'Belirtilmemiş'}</p>
          <p>${orderData.delivery_address || 'Adres Belirtilmemiş (Gel-Al)'}</p>
          <p class="bold">ÖDEME: ${getPaymentMethodLabel(orderData.payment_method).toUpperCase()}</p>
        </div>
        
        <div class="divider">--------------------------------</div>
        
        <div class="receipt-footer-logo">
          <img src="data:image/png;base64,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" />
          <p>Otonom Termal Yazdırma Modu</p>
        </div>
      </body>
      </html>
    `

    doc.open()
    doc.write(htmlContent)
    doc.close()

    // Yazdırmayı tetikle
    setTimeout(() => {
      if (iframe.contentWindow) {
        try {
          iframe.contentWindow.focus()
          iframe.contentWindow.print()
          console.log('✅ Sipariş başarıyla yazıcı kuyruğuna gönderildi.')
        } catch (printError) {
          console.error('❌ Yazdırma işlemi başarısız:', printError)
        }
      }
    }, 250)
  }, [restaurant])

  printReceiptRef.current = printReceipt

  return (
    <>
      {/* Floating Action Button - Yeni Sipariş */}
      <button
        onClick={() => setShowNewOrderModal(true)}
        className="fixed bottom-6 left-6 p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 z-[9999] group"
        title="Yeni Sipariş"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
          YENİ
        </span>
      </button>

      <PullToRefresh onRefresh={handleRefresh} darkMode={darkMode}>
        <div className={`min-h-screen py-6 px-4 ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className={`text-4xl font-black mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {restaurant?.name || 'RESTORAN PANELİ'}
          </h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            Sipariş Yönetim Sistemi
          </p>

          {/* Tab Buttons */}
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => { setActiveTab('active'); setCurrentPage(0); }}
              className={`text-sm px-3 py-2 md:text-base md:px-6 md:py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'active'
                  ? darkMode
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-500 text-white'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              📦 Aktif Siparişler
            </button>
            <button
              onClick={() => { setActiveTab('delivered'); setCurrentPage(0); }}
              className={`text-sm px-3 py-2 md:text-base md:px-6 md:py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'delivered'
                  ? darkMode
                    ? 'bg-green-600 text-white'
                    : 'bg-green-500 text-white'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              ✅ Teslim Edilenler
            </button>
            <button
              onClick={() => { setActiveTab('cancelled'); setCurrentPage(0); }}
              className={`text-sm px-3 py-2 md:text-base md:px-6 md:py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'cancelled'
                  ? darkMode
                    ? 'bg-red-600 text-white'
                    : 'bg-red-500 text-white'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              ❌ İptal Edilenler
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-400 text-center font-medium">{successMessage}</p>
          </div>
        )}

        {/* Günlük Finansal Özet Çubuğu - Sadece Aktif Sekmede */}
        {activeTab === 'active' && (
          <div className="mb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Bugünkü Paket Sayısı */}
            <div className={`p-4 md:p-6 rounded-xl border ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    📦 Bugünkü Paket Sayısı
                  </p>
                  {todayStats.isLoading ? (
                    <div className="h-7 w-14 bg-slate-700 animate-pulse rounded"></div>
                  ) : (
                    <p className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {todayStats.packageCount}
                    </p>
                  )}
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    Teslim edildi + Ücretli iptal
                  </p>
                </div>
                <div className="text-3xl opacity-20">📦</div>
              </div>
            </div>

            {/* Paket Masrafı */}
            <div className={`p-4 md:p-6 rounded-xl border ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    💸 Paket Masrafı
                  </p>
                  {todayStats.isLoading ? (
                    <div className="h-7 w-20 bg-slate-700 animate-pulse rounded"></div>
                  ) : (
                    <p className={`text-2xl font-black ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {todayStats.packageFee.toFixed(0)}₺
                    </p>
                  )}
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    {todayStats.chargeableCount} × {restaurant?.package_fee || PACKAGE_FEE}₺
                  </p>
                </div>
                <div className="text-3xl opacity-20">💸</div>
              </div>
            </div>

            {/* Bugünkü Hak Ediş */}
            <div className={`p-4 md:p-6 rounded-xl border-2 ${
              darkMode ? 'bg-gradient-to-br from-green-900/30 to-slate-900 border-green-700/50' : 'bg-gradient-to-br from-green-50 to-white border-green-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                    💰 Bugünkü Hak Ediş
                  </p>
                  {todayStats.isLoading ? (
                    <div className="h-7 w-28 bg-green-700/30 animate-pulse rounded"></div>
                  ) : (
                    <p className={`text-2xl font-black ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {todayStats.netRevenue.toFixed(0)}₺
                    </p>
                  )}
                  <p className={`text-xs mt-0.5 ${darkMode ? 'text-green-500/70' : 'text-green-600/70'}`}>
                    Ciro: {todayStats.totalRevenue.toFixed(0)}₺ - Masraf: {todayStats.packageFee.toFixed(0)}₺
                  </p>
                </div>
                <div className="text-3xl opacity-30">💰</div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Kanban Board - Aktif Siparişler */}
        {activeTab === 'active' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : (
              <KanbanBoard 
                packages={packages} 
                onRefresh={fetchPackages}
                darkMode={darkMode}
                couriers={couriers}
                restaurantId={restaurantId}
                isPackageDelayed={isPackageDelayed}
                getDelayedMinutes={getDelayedMinutes}
              />
            )}
          </>
        )}

        {/* Teslim Edilen Siparişler Listesi */}
        {activeTab === 'delivered' && (
          <div className={`rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
            {/* Tarih Filtreleri */}
            <div className={`p-4 border-b ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* 📊 Dinamik Sayaç Kutusu */}
                <div className={`px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-xs font-medium mb-0.5 ${darkMode ? 'text-slate-400' : 'text-blue-600'}`}>
                    Toplam Paket
                  </p>
                  <p className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    {deliveredPackages.length}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyFilter}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all hover:scale-105 ${
                      darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    🔍 Filtrele
                  </button>
                  <button
                    onClick={handleClearFilter}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Temizle
                  </button>
                </div>
              </div>
            </div>

            {/* Sipariş Listesi */}
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
              ) : deliveredPackages.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-sm">Teslim edilmiş sipariş bulunmuyor</p>
                </div>
              ) : (
                <>
                  {/* 💡 Yön Tuşları Bilgilendirme Kutusu */}
                  <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
                    darkMode 
                      ? 'bg-blue-950/20 border-blue-900/40 text-blue-300 shadow-lg shadow-blue-950/10' 
                      : 'bg-blue-50 border-blue-150 text-blue-850 shadow-sm'
                  }`}>
                    <span className="text-xl shrink-0">💡</span>
                    <p className="text-xs sm:text-sm font-semibold tracking-wide leading-relaxed">
                      Paketlerinizin tamamına ulaşmak için en aşağıdan yön tuşlarını kullanabilirsiniz.
                    </p>
                  </div>

                  <div className="space-y-3">
                  {deliveredPackages.map((pkg: any) => (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-lg border ${
                        darkMode 
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      } transition-colors`}
                    >
                      <div className="flex flex-wrap gap-4 items-start justify-between">
                        {/* Sol Taraf - Sipariş Bilgileri */}
                        <div className="flex-1 min-w-[250px]">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-bold px-2 py-1 rounded ${
                              darkMode ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {pkg.order_number || '......'}
                            </span>
                            {pkg.platform && (
                              <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                                {getPlatformDisplayName(pkg.platform)}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                            }`}>
                              ✅ Teslim Edildi
                            </span>
                          </div>
                          
                          <div className={`space-y-1 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                            <p className="font-semibold">👤 {pkg.customer_name}</p>
                            {pkg.customer_phone && <p className="text-xs">📞 {pkg.customer_phone}</p>}
                            <p className="text-xs">📍 {pkg.delivery_address}</p>
                            {pkg.content && <p className="text-xs">📝 {pkg.content}</p>}
                          </div>
                        </div>

                        {/* Orta - Kurye ve Ödeme */}
                        <div className="flex-1 min-w-[200px]">
                          <div className={`space-y-2 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                            <div>
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Kurye</p>
                              <p className="font-medium">🚴 {pkg.courier?.full_name || 'Bilinmeyen'}</p>
                            </div>
                            <div>
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Ödeme</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                pkg.payment_method === 'cash'
                                  ? 'bg-green-900/50 text-green-300'
                                  : pkg.payment_method === 'iban'
                                  ? 'bg-purple-900/50 text-purple-300'
                                  : 'bg-orange-900/50 text-orange-300'
                              }`}>
                                {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Sağ Taraf - Tutar ve Tarih */}
                        <div className="text-right min-w-[160px] flex flex-col justify-between">
                          <p className={`text-2xl font-bold mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {pkg.amount}₺
                          </p>
                          <div className={`text-[10px] sm:text-xs space-y-1 font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            <p className="whitespace-nowrap">🕐 Oluşturulma: {formatShortDateTime(pkg.created_at)}</p>
                            {pkg.delivered_at && (
                              <p className="whitespace-nowrap font-bold text-green-500/80">✅ Teslim: {formatShortDateTime(pkg.delivered_at)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 🎯 Sayfalama ve Limit Seçici Buton Grubu */}
                  <div className="flex flex-col items-center justify-center mt-8 pt-6 border-t border-dashed border-slate-700/30">
                    <p className={`text-xs font-semibold mb-3 tracking-wider uppercase ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      Sipariş Gösterimi (Sayfa {currentPage + 1})
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center">
                      {/* Sol Yön Tuşu */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className={`p-2.5 rounded-lg border transition-all duration-200 ${
                          currentPage === 0
                            ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500'
                            : darkMode
                            ? 'bg-slate-800 hover:bg-slate-750 text-white border-slate-700 hover:scale-105 active:scale-95'
                            : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300 hover:scale-105 active:scale-95 shadow-sm'
                        }`}
                        title="Önceki Sayfa"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>

                      {/* Limit Seçim Butonları */}
                      <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                        darkMode 
                          ? 'bg-slate-950/40 border-slate-800' 
                          : 'bg-gray-100 border-gray-200'
                      }`}>
                        {[50, 100, 200, 500].map((limit) => (
                          <button
                            key={limit}
                            onClick={() => {
                              setDisplayLimit(limit)
                              setCurrentPage(0)
                            }}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                              displayLimit === limit
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                                : darkMode
                                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            {limit}
                          </button>
                        ))}
                      </div>

                      {/* Sağ Yön Tuşu */}
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={deliveredPackages.length < displayLimit}
                        className={`p-2.5 rounded-lg border transition-all duration-200 ${
                          deliveredPackages.length < displayLimit
                            ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500'
                            : darkMode
                            ? 'bg-slate-800 hover:bg-slate-750 text-white border-slate-700 hover:scale-105 active:scale-95'
                            : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300 hover:scale-105 active:scale-95 shadow-sm'
                        }`}
                        title="Sonraki Sayfa"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>

                    {/* Gösterilen Aralık Bilgisi */}
                    {deliveredPackages.length > 0 && (
                      <p className={`text-xs mt-3 font-semibold ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        Gösterilen: {currentPage * displayLimit + 1} - {currentPage * displayLimit + deliveredPackages.length} arası siparişler
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* İptal Edilenler Listesi */}
        {activeTab === 'cancelled' && (
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-slate-900' : 'bg-white'} shadow-lg`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ❌ İptal Edilen Siparişler
              </h2>
              
              {/* Tarih Filtreleri */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <span className={darkMode ? 'text-slate-400' : 'text-gray-600'}>-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
              ) : cancelledPackages.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <p className="text-4xl mb-2">✅</p>
                  <p className="text-sm">İptal edilmiş sipariş bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cancelledPackages.map((pkg: any) => (
                    <div
                      key={pkg.id}
                      className={`p-4 rounded-lg border ${
                        darkMode 
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      } transition-colors`}
                    >
                      <div className="flex flex-wrap gap-4 items-start justify-between">
                        {/* Sol Taraf - Sipariş Bilgileri */}
                        <div className="flex-1 min-w-[250px]">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-sm font-bold px-2 py-1 rounded ${
                              darkMode ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {pkg.order_number || '......'}
                            </span>
                            {pkg.platform && (
                              <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                                {getPlatformDisplayName(pkg.platform)}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                            }`}>
                              ❌ İptal Edildi
                            </span>
                            
                            {/* Ücretli/Ücretsiz İptal Badge */}
                            {pkg.is_chargeable_cancellation ? (
                              <span className={`text-xs px-2 py-1 rounded font-bold ${
                                darkMode ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                              }`}>
                                💰 Ücretlendirildi
                              </span>
                            ) : (
                              <span className={`text-xs px-2 py-1 rounded ${
                                darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                              }`}>
                                🆓 Ücretsiz İptal
                              </span>
                            )}
                          </div>
                          
                          <div className={`space-y-1 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                            <p className="font-semibold">👤 {pkg.customer_name}</p>
                            {pkg.customer_phone && <p className="text-xs">📞 {pkg.customer_phone}</p>}
                            <p className="text-xs">📍 {pkg.delivery_address}</p>
                            {pkg.content && <p className="text-xs">📝 {pkg.content}</p>}
                            {pkg.cancellation_reason && (
                              <p className={`text-xs mt-2 p-2 rounded ${
                                darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'
                              }`}>
                                ⚠️ İptal Nedeni: {pkg.cancellation_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Orta - Kurye ve Ödeme */}
                        <div className="flex-1 min-w-[200px]">
                          <div className={`space-y-2 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                            {pkg.courier?.full_name && (
                              <div>
                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Kurye</p>
                                <p className="font-medium">🚴 {pkg.courier.full_name}</p>
                              </div>
                            )}
                            <div>
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Ödeme</p>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                pkg.payment_method === 'cash'
                                  ? 'bg-green-900/50 text-green-300'
                                  : pkg.payment_method === 'iban'
                                  ? 'bg-purple-900/50 text-purple-300'
                                  : 'bg-orange-900/50 text-orange-300'
                              }`}>
                                {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Sağ Taraf - Tutar ve Tarih */}
                        <div className="text-right min-w-[160px] flex flex-col justify-between">
                          <p className={`text-2xl font-bold mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {pkg.amount}₺
                          </p>
                          <div className={`text-[10px] sm:text-xs space-y-1 font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                            <p className="whitespace-nowrap">🕐 Oluşturulma: {formatShortDateTime(pkg.created_at)}</p>
                            {pkg.cancelled_at && (
                              <p className="whitespace-nowrap font-bold text-red-500/80">❌ İptal: {formatShortDateTime(pkg.cancelled_at)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* New Order Modal */}
        {showNewOrderModal && (
          <NewOrderModal
            onClose={() => setShowNewOrderModal(false)}
            onSuccess={handleNewOrderSuccess}
            restaurantId={restaurantId}
            darkMode={darkMode}
          />
        )}

        {/* Gizli Termal Yazıcı Iframe */}
        <iframe id="receipt-printer" className="hidden" style={{ display: 'none' }}></iframe>
      </div>
      </div>
    </PullToRefresh>
  </>
  )
}
