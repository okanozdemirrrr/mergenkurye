'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import KanbanBoard from './KanbanBoard'
import NewOrderModal from './NewOrderModal'
import PullToRefresh from '@/components/PullToRefresh'
import { Package, Courier } from '@/types'
import { formatTurkishTime, formatShortDateTime } from '@/utils/dateHelpers'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { useRestaurantReminder } from '@/hooks/useRestaurantReminder'

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
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'delivered' | 'cancelled'>('active')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cancelledPackages, setCancelledPackages] = useState<Package[]>([])
  
  // 🎯 Manuel Filtreleme için Temporary State
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  
  // Günlük finansal özet state'leri
  const [todayStats, setTodayStats] = useState({
    packageCount: 0,
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

    // 🔥 REALTIME - SESSIZ ARKA PLAN GÜNCELLEMESİ
    let subscription: any = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const setupRealtimeWithRetry = async (retryCount = 0) => {
      try {
        const channel = supabase
          .channel('restaurant-packages')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'packages',
              filter: `restaurant_id=eq.${restaurantId}`
            },
            () => {
              // Sessiz güncelleme - ekran titremiyor
              fetchPackages()
              fetchTodayStats()
            }
          )

        const status = await new Promise<string>((resolve) => {
          channel.subscribe((status) => {
            resolve(status)
          })
        })

        if (status === 'SUBSCRIBED') {
          console.log('✅ Restoran Realtime bağlandı')
          subscription = channel
          
          if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`⚠️ Restoran Realtime bağlantı hatası: ${status}`)
          
          reconnectTimer = setTimeout(() => {
            console.log('🔄 Restoran Realtime yeniden bağlanılıyor...')
            setupRealtimeWithRetry(retryCount + 1)
          }, 3000)
        }
      } catch (error) {
        console.error('❌ Restoran Realtime subscription hatası:', error)
        
        if (retryCount < 10) {
          reconnectTimer = setTimeout(() => {
            console.log(`🔄 Hata sonrası yeniden bağlanılıyor (Deneme: ${retryCount + 1})`)
            setupRealtimeWithRetry(retryCount + 1)
          }, 3000)
        } else {
          console.error('❌ Maksimum yeniden bağlanma denemesi aşıldı')
        }
      }
    }

    setupRealtimeWithRetry()

    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [restaurantId])

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

        // Tarih filtreleri (sadece startDate/endDate state'i değiştiğinde uygulanır)
        if (startDate) {
          query = query.gte('delivered_at', new Date(startDate).toISOString())
        }
        if (endDate) {
          const endDateTime = new Date(endDate)
          endDateTime.setHours(23, 59, 59, 999)
          query = query.lte('delivered_at', endDateTime.toISOString())
        }

        const { data, error } = await query

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

        // Tarih filtreleri
        if (startDate) {
          query = query.gte('cancelled_at', new Date(startDate).toISOString())
        }
        if (endDate) {
          const endDateTime = new Date(endDate)
          endDateTime.setHours(23, 59, 59, 999)
          query = query.lte('cancelled_at', endDateTime.toISOString())
        }

        const { data, error } = await query

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
  }, [restaurantId, activeTab, startDate, endDate, packages.length])

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

      // Restoran bilgisini al (fallback için)
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('package_fee')
        .eq('id', restaurantId)
        .single()

      if (restaurantError) throw restaurantError

      const { data, error } = await supabase
        .from('packages')
        .select('amount, applied_price')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString())

      if (error) throw error

      const packageCount = data?.length || 0
      const totalRevenue = data?.reduce((sum, pkg) => sum + (pkg.amount || 0), 0) || 0
      
      // 2. DASHBOARD MATH: applied_price toplamı (fallback: restaurant.package_fee)
      const fallbackPrice = restaurantData?.package_fee || PACKAGE_FEE
      const calculatedTotalCost = data?.reduce((sum, pkg) => {
        const price = pkg.applied_price ?? fallbackPrice
        return sum + price
      }, 0) || 0

      console.log('📊 fetchTodayStats DEBUG:', {
        restaurantId,
        todayStart: todayStart.toISOString(),
        packageCount,
        totalRevenue,
        fallbackPrice,
        calculatedTotalCost,
        packages: data,
        restaurantPackageFee: restaurantData?.package_fee
      })
      
      const netRevenue = totalRevenue - calculatedTotalCost

      setTodayStats({
        packageCount,
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
  }, [tempStartDate, tempEndDate])

  const handleClearFilter = useCallback(() => {
    setTempStartDate('')
    setTempEndDate('')
    setStartDate('')
    setEndDate('')
  }, [])

  // Sekme değiştiğinde paketleri yeniden yükle (SADECE activeTab ve gerçek startDate/endDate değiştiğinde)
  useEffect(() => {
    fetchPackages()
  }, [activeTab, startDate, endDate, fetchPackages])

  return (
    <PullToRefresh onRefresh={handleRefresh} darkMode={darkMode}>
      <div className={`min-h-screen py-6 px-4 ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-6 right-6 p-3 rounded-full shadow-xl transition-all hover:scale-110 border z-50 ${
          darkMode 
            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' 
            : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300'
        }`}
        title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
      >
        <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
      </button>

      {/* Floating Action Button - Yeni Sipariş */}
      <button
        onClick={() => setShowNewOrderModal(true)}
        className="fixed bottom-6 left-6 p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl transition-all hover:scale-110 z-50 group"
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
              onClick={() => setActiveTab('active')}
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
              onClick={() => setActiveTab('delivered')}
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
              onClick={() => setActiveTab('cancelled')}
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
                    Teslim edildi
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
                    {todayStats.packageCount} × {restaurant?.package_fee || PACKAGE_FEE}₺
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
                            <span classNamee={`text-sm font-bold px-2 py-1 rounded ${
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
      </div>
      </div>
    </PullToRefresh>
  )
}
