'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Package {
  id: number
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: string
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card' | null
  created_at?: string
  picked_up_at?: string
  delivered_at?: string
  restaurant?: { 
    name: string
    phone?: string
    address?: string
  }
}

interface CourierLeaderboard {
  id: string
  full_name: string
  todayDeliveryCount: number
}

const LOGIN_STORAGE_KEY = 'kurye_logged_in'
const LOGIN_COURIER_ID_KEY = 'kurye_logged_courier_id'

export default function KuryePage() {
  const [isMounted, setIsMounted] = useState(false) // Build-safe guard
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredCount, setDeliveredCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState<Set<number>>(new Set())
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<{ [key: number]: 'cash' | 'card' }>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [cashTotal, setCashTotal] = useState(0)
  const [cardTotal, setCardTotal] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [courierStatus, setCourierStatus] = useState<'idle' | 'busy' | null>(null)
  const [is_active, setIs_active] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [darkMode, setDarkMode] = useState(true) // Varsayılan dark mode
  const [leaderboard, setLeaderboard] = useState<CourierLeaderboard[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false) // Leaderboard modal

  // Build-safe mount kontrolü
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedCourierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
      if (loggedIn === 'true' && loggedCourierId) {
        setIsLoggedIn(true)
        setSelectedCourierId(loggedCourierId)
      }
    }
  }, [])

  // Heartbeat fonksiyonu - Kurye aktiflik sinyali
  const sendHeartbeat = async () => {
    if (typeof window === 'undefined') return
    
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      await supabase
        .from('couriers')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', courierId)
    } catch (error: any) {
      console.error('Heartbeat hatası:', error)
    }
  }

  const fetchPackages = async (isInitialLoad = false) => {
    if (typeof window === 'undefined') return
    
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      if (isInitialLoad) setIsLoading(true)
      
      await sendHeartbeat()
      
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name, phone, address)')
        .eq('courier_id', courierId)
        .neq('status', 'delivered')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const transformed = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants
      }))
      
      setPackages(transformed)
    } catch (error: any) {
      console.error('❌ Paketler yüklenemedi:', error)
      setErrorMessage('Paketler yüklenemedi: ' + error.message)
    } finally {
      if (isInitialLoad) setIsLoading(false)
    }
  }

  const fetchDailyStats = async () => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      
      const { data, error } = await supabase
        .from('packages')
        .select('amount, payment_method, status')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('created_at', todayStart.toISOString())

      if (error) throw error

      if (data) {
        setDeliveredCount(data.length)
        setCashTotal(data.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0))
        setCardTotal(data.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + (p.amount || 0), 0))
      }
    } catch (error: any) {
      console.error('❌ İstatistik yüklenemedi:', error)
      setErrorMessage('İstatistikler yüklenemedi: ' + error.message)
    }
  }

  const fetchCourierStatus = async () => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('status, is_active')
        .eq('id', courierId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setCourierStatus(data.status)
        setIs_active(data.is_active || false)
      }
    } catch (error: any) {
      console.error('❌ Kurye durumu alınamadı:', error)
      setErrorMessage('Kurye durumu alınamadı: ' + error.message)
    }
  }

  // Günün En Hızlıları Leaderboard'unu çek
  const fetchLeaderboard = async () => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // Tüm aktif kuryeleri çek
      const { data: couriersData, error: couriersError } = await supabase
        .from('couriers')
        .select('id, full_name, is_active')
        .eq('is_active', true)

      if (couriersError) throw couriersError

      if (!couriersData || couriersData.length === 0) {
        setLeaderboard([])
        setMyRank(null)
        return
      }

      // Her kurye için bugünkü teslimat sayısını çek
      const courierIds = couriersData.map(c => c.id)
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('courier_id')
        .eq('status', 'delivered')
        .in('courier_id', courierIds)
        .gte('delivered_at', todayStart.toISOString())

      if (packagesError) throw packagesError

      // Kurye bazlı paket sayılarını hesapla
      const counts: { [key: string]: number } = {}
      packagesData?.forEach((pkg) => {
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1
        }
      })

      // Leaderboard oluştur - sadece bugün en az 1 paket teslim etmiş kuryeler
      const leaderboardData = couriersData
        .map(courier => ({
          id: courier.id,
          full_name: courier.full_name || 'İsimsiz Kurye',
          todayDeliveryCount: counts[courier.id] || 0
        }))
        .filter(courier => courier.todayDeliveryCount > 0) // Sadece bugün teslimat yapanlar
        .sort((a, b) => b.todayDeliveryCount - a.todayDeliveryCount) // Çoktan aza sırala

      setLeaderboard(leaderboardData)

      // Kendi sıramı bul
      const myIndex = leaderboardData.findIndex(c => c.id === courierId)
      setMyRank(myIndex >= 0 ? myIndex + 1 : null)

    } catch (error: any) {
      console.error('❌ Leaderboard yüklenemedi:', error)
    }
  }

  const updateCourierStatus = async (newStatus: 'idle' | 'busy', newIsActive: boolean) => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    
    if (!courierId) {
      setErrorMessage('Kurye ID bulunamadı')
      return
    }

    try {
      setStatusUpdating(true)
      
      const { error } = await supabase
        .from('couriers')
        .update({ 
          status: newStatus,
          is_active: newIsActive
        })
        .eq('id', courierId)

      if (error) throw error

      setCourierStatus(newStatus)
      setIs_active(newIsActive)
      setSuccessMessage(newIsActive ? '✅ Aktif duruma geçildi!' : '❌ Pasif duruma geçildi!')
      setTimeout(() => setSuccessMessage(''), 2000)
      
    } catch (error: any) {
      console.error('❌ Durum güncellenemedi:', error)
      setErrorMessage('Durum güncellenemedi: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setStatusUpdating(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
      if (!courierId) return

      // İlk yükleme
      fetchPackages(true)
      fetchDailyStats()
      fetchCourierStatus()
      fetchLeaderboard()
      
      // Supabase Realtime - Kuryeye özel paket değişikliklerini dinle
      const packagesChannel = supabase
        .channel(`courier-packages-${courierId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'packages',
            filter: `courier_id=eq.${courierId}`
          },
          (payload) => {
            // Anında güncelle
            fetchPackages(false)
            fetchDailyStats()
            fetchLeaderboard()
          }
        )
        .subscribe()
      
      // Fallback polling - 30 saniyede bir zorunlu güncelleme
      const interval = setInterval(() => {
        fetchPackages(false)
        fetchDailyStats()
        fetchCourierStatus()
        fetchLeaderboard()
      }, 30000)
      
      return () => {
        clearInterval(interval)
        supabase.removeChannel(packagesChannel)
      }
    }
  }, [isLoggedIn])

  const handleUpdateStatus = async (packageId: number, nextStatus: string, additionalData = {}) => {
    try {
      setIsUpdating(prev => new Set(prev).add(packageId))
      const { error } = await supabase
        .from('packages')
        .update({ status: nextStatus, ...additionalData })
        .eq('id', packageId)

      if (error) throw error
      setSuccessMessage('Durum güncellendi!')
      setTimeout(() => setSuccessMessage(''), 2000)
      await fetchPackages()
      await fetchDailyStats()
    } catch (error: any) {
      setErrorMessage('Hata: ' + error.message)
    } finally {
      setIsUpdating(prev => { const n = new Set(prev); n.delete(packageId); return n })
    }
  }

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return "-";
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${diff} dk`;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-48 h-48 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              Kurye Girişi
            </h1>
          </div>
          <input 
            type="text" placeholder="Kullanıcı Adı" 
            className="w-full p-3 mb-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" placeholder="Şifre" 
            className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Giriş Yap
          </button>
          {errorMessage && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Sağ Üst Butonlar */}
      {isLoggedIn && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {/* Hız Simgesi - Leaderboard */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all hover:scale-105 ${
              darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            title="Günün En Hızlıları"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium whitespace-nowrap">Günün En Hızlıları</span>
          </button>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg shadow-lg transition-colors ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
            }`}
            title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      )}

      {/* Fixed Çıkış Butonu - Sol Üst */}
      {isLoggedIn && (
        <button 
          onClick={() => { 
            localStorage.removeItem(LOGIN_STORAGE_KEY);
            localStorage.removeItem(LOGIN_COURIER_ID_KEY);
            window.location.href = '/kurye';
          }} 
          className="fixed top-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
        >
          ← Çıkış
        </button>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center items-center mb-4 pt-2">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-32 h-32"
          />
        </div>

        {/* KURYE DURUM KONTROL TOGGLE - EN ÜSTTE */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-300">Durum</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-slate-400">
                {is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <div className="flex items-center justify-center gap-3 py-2">
            <span className={`text-xs font-medium transition-all ${!is_active ? 'text-red-400' : 'text-slate-500'}`}>
              Pasif
            </span>
            
            <button
              onClick={() => updateCourierStatus('idle', !is_active)}
              disabled={statusUpdating}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 disabled:opacity-50 ${
                is_active ? 'bg-green-600' : 'bg-slate-700'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                is_active ? 'left-7' : 'left-0.5'
              }`}>
                {statusUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </button>
            
            <span className={`text-xs font-medium transition-all ${is_active ? 'text-green-400' : 'text-slate-500'}`}>
              Aktif
            </span>
          </div>
        </div>

        {/* İSTATİSTİKLER */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <p className="text-slate-400 text-xs mb-1">Bugün Teslim</p>
            <p className="text-2xl font-bold text-green-400">{deliveredCount}</p>
          </div>
          <button 
            onClick={() => setShowSummary(true)}
            className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-blue-600 transition-colors text-left"
          >
            <p className="text-slate-400 text-xs mb-1">Toplam Hesap</p>
            <p className="text-2xl font-bold text-blue-400">{(cashTotal + cardTotal).toFixed(2)} ₺</p>
          </button>
        </div>

        {/* TOPLAM KAZANÇ */}
        <div className="bg-gradient-to-r from-green-900 to-emerald-900 p-4 rounded-xl border border-green-700 mb-4">
          <p className="text-green-300 text-xs mb-1">💰 Toplam Kazanç</p>
          <p className="text-3xl font-bold text-green-100">{deliveredCount * 80} ₺</p>
          <p className="text-xs text-green-400 mt-1">{deliveredCount} paket × 80₺</p>
        </div>

        {successMessage && (
          <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm text-center">
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {packages.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-sm">Atanmış paket bulunmuyor</p>
            </div>
          ) : (
            <>
              {/* Paket Sayısı Göstergesi */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <p className="text-sm text-slate-400">
                  <span className="font-bold text-white">{packages.length}</span> aktif paket
                </p>
              </div>

              {/* Paket Listesi */}
              {packages.map((pkg, index) => (
                <div key={pkg.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  {/* Üst Kısım */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500">#{index + 1}</span>
                        <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                          {pkg.restaurant?.name || 'Restoran'}
                        </span>
                      </div>
                      <p className="font-medium text-white">{pkg.customer_name}</p>
                      
                      {/* Restoran bilgileri - assigned, picking_up, on_the_way durumlarında göster */}
                      {(pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') && pkg.restaurant?.phone && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs">🍽️</span>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-900 dark:text-orange-300">
                                {pkg.restaurant.name}
                              </p>
                              <p className="text-xs text-orange-700 dark:text-orange-400">
                                📞 {pkg.restaurant.phone}
                              </p>
                              {pkg.restaurant.address && (
                                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                                  📍 {pkg.restaurant.address}
                                </p>
                              )}
                            </div>
                          </div>
                          <a 
                            href={`tel:${pkg.restaurant.phone}`}
                            className="block w-full py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded transition-colors text-center mt-2"
                          >
                            📞 Restoranı Ara
                          </a>
                        </div>
                      )}
                      
                      {/* Müşteri numarası - sadece on_the_way durumunda göster */}
                      {pkg.status === 'on_the_way' && pkg.customer_phone && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-400 mb-1">👤 Müşteri: {pkg.customer_phone}</p>
                          <div className="flex gap-2">
                            <a 
                              href={`tel:${pkg.customer_phone}`}
                              className="py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors text-center"
                            >
                              📞 Ara
                            </a>
                            <a 
                              href={`https://wa.me/${pkg.customer_phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded transition-colors text-center"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {pkg.content && (
                        <p className="text-xs text-slate-400 mt-1">{pkg.content}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-400">{pkg.amount}₺</p>
                      <p className="text-xs text-slate-500">
                        {pkg.payment_method === 'cash' ? 'Nakit' : 'Kart'}
                      </p>
                    </div>
                  </div>

                  {/* Adres */}
                  <div className="mb-3 p-2 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-300">{pkg.delivery_address}</p>
                  </div>

                  {/* Durum Badge */}
                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      pkg.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                      pkg.status === 'picking_up' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {pkg.status === 'assigned' ? 'Yeni Paket' :
                       pkg.status === 'picking_up' ? 'Almaya Git' :
                       'Teslimatta'}
                    </span>
                  </div>

                  {/* Aksiyon Butonları */}
                  {pkg.status === 'assigned' && (
                    <button 
                      disabled={isUpdating.has(pkg.id)}
                      onClick={() => handleUpdateStatus(pkg.id, 'picking_up')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating.has(pkg.id) ? 'İşleniyor...' : 'Kabul Et'}
                    </button>
                  )}

                  {pkg.status === 'picking_up' && (
                    <button 
                      disabled={isUpdating.has(pkg.id)}
                      onClick={() => handleUpdateStatus(pkg.id, 'on_the_way', { picked_up_at: new Date().toISOString() })}
                      className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating.has(pkg.id) ? 'İşleniyor...' : 'Paketi Aldım'}
                    </button>
                  )}

                  {pkg.status === 'on_the_way' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setSelectedPaymentMethods({...selectedPaymentMethods, [pkg.id]: 'cash'})}
                          className={`py-2 rounded-lg border font-medium text-sm transition-colors ${
                            selectedPaymentMethods[pkg.id] === 'cash' 
                              ? 'bg-green-600 border-green-600 text-white' 
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          Nakit
                        </button>
                        <button 
                          onClick={() => setSelectedPaymentMethods({...selectedPaymentMethods, [pkg.id]: 'card'})}
                          className={`py-2 rounded-lg border font-medium text-sm transition-colors ${
                            selectedPaymentMethods[pkg.id] === 'card' 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          Kart
                        </button>
                      </div>
                      <button 
                        disabled={!selectedPaymentMethods[pkg.id] || isUpdating.has(pkg.id)}
                        onClick={() => handleUpdateStatus(pkg.id, 'delivered', { 
                          payment_method: selectedPaymentMethods[pkg.id],
                          delivered_at: new Date().toISOString() 
                        })}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating.has(pkg.id) ? 'Teslim Ediliyor...' : 'Teslim Et'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* HESAP ÖZETİ MODAL */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/80 z-50 p-4 overflow-y-auto flex items-center justify-center">
          <div className="max-w-md w-full bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Günlük Rapor</h2>
              <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            
            <SummaryList courierId={selectedCourierId!} calculateDuration={calculateDuration} />

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex justify-between text-base font-bold mb-3">
                <span className="text-slate-300">Toplam Kazanç:</span>
                <span className="text-green-400">{(cashTotal + cardTotal).toFixed(2)} ₺</span>
              </div>
              <button 
                onClick={() => setShowSummary(false)} 
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GÜNÜN EN HIZLILARI MODAL */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 z-50 p-4 overflow-y-auto flex items-center justify-center">
          <div className="max-w-md w-full bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl p-6 border border-purple-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-purple-100 flex items-center gap-2">
                🚀 Günün En Hızlıları
              </h2>
              <button 
                onClick={() => setShowLeaderboard(false)} 
                className="text-purple-300 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Kendi Sıralaman */}
            {myRank !== null && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-yellow-200">🏆 Güncel Sıralaman:</span>
                  <span className="text-xl font-bold text-yellow-100">
                    {myRank}. / {leaderboard.length} Kurye
                  </span>
                </div>
              </div>
            )}

            {/* Leaderboard Listesi */}
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-purple-300">
                <div className="text-4xl mb-2">🏁</div>
                <p className="text-sm">Henüz bugün teslimat yapan kurye yok</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaderboard.slice(0, 10).map((courier, index) => {
                  const isMe = courier.id === selectedCourierId
                  const rank = index + 1
                  
                  // Madalya veya sıra numarası
                  let badge = ''
                  let badgeColor = ''
                  if (rank === 1) {
                    badge = '🥇'
                    badgeColor = 'from-yellow-600 to-yellow-500'
                  } else if (rank === 2) {
                    badge = '🥈'
                    badgeColor = 'from-gray-400 to-gray-300'
                  } else if (rank === 3) {
                    badge = '🥉'
                    badgeColor = 'from-orange-600 to-orange-500'
                  } else {
                    badge = `#${rank}`
                    badgeColor = 'from-slate-700 to-slate-600'
                  }

                  return (
                    <div 
                      key={courier.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        isMe 
                          ? 'bg-purple-500/30 border border-purple-400 scale-105' 
                          : rank <= 3
                          ? `bg-gradient-to-r ${badgeColor} bg-opacity-20`
                          : 'bg-purple-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${
                          rank <= 3 ? 'text-white' : 'text-purple-300'
                        }`}>
                          {badge}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            isMe ? 'text-purple-100 font-bold' : 'text-purple-200'
                          }`}>
                            {courier.full_name} {isMe && '(Sen)'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-100">
                          {courier.todayDeliveryCount}
                        </p>
                        <p className="text-xs text-purple-300">paket</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-purple-700">
              <div className="text-xs text-purple-400 text-center mb-3">
                Son güncelleme: {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button 
                onClick={() => setShowLeaderboard(false)} 
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  async function handleLogin(e: any) {
    e.preventDefault()
    if (typeof window === 'undefined') return
    
    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('id, full_name, username, password')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .maybeSingle()
        
      if (error) {
        console.error('Veritabanı hatası:', error)
        setErrorMessage("Veritabanı hatası!")
        return
      }
      
      if (data) {
        // Sadece restoran oturumunu temizle (admin oturumuna DOKUNMA!)
        localStorage.removeItem('restoran_logged_in')
        localStorage.removeItem('restoran_logged_restaurant_id')
        
        // Kurye aktif yap
        await supabase
          .from('couriers')
          .update({ is_active: true, status: 'idle' })
          .eq('id', data.id)
        
        // Kurye oturumunu başlat
        localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
        localStorage.setItem(LOGIN_COURIER_ID_KEY, data.id)
        setIsLoggedIn(true)
        setSelectedCourierId(data.id)
      } else {
        setErrorMessage("Hatalı kullanıcı adı veya şifre!")
      }
    } catch (error: any) {
      console.error('Giriş hatası:', error)
      setErrorMessage("Giriş hatası: " + error.message)
    }
  }
}

function SummaryList({ courierId, calculateDuration }: { courierId: string, calculateDuration: any }) {
  const [history, setHistory] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('packages')
        .select('*')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
      setHistory(data || []);
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {history.map(p => (
        <div key={p.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-medium text-sm text-white">{p.customer_name}</p>
            <p className="text-xs text-slate-400">{p.payment_method === 'cash' ? 'Nakit' : 'Kart'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-400 font-medium">{calculateDuration(p.picked_up_at, p.delivered_at)}</p>
            <p className="text-white font-bold text-sm">{p.amount} ₺</p>
          </div>
        </div>
      ))}
    </div>
  )
}