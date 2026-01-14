'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Package {
  id: number
  customer_name: string
  delivery_address: string
  amount: number
  status: string
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card' | null
  created_at?: string
  picked_up_at?: string
  delivered_at?: string
  restaurant?: { name: string }
}

const LOGIN_STORAGE_KEY = 'kurye_logged_in'
const LOGIN_COURIER_ID_KEY = 'kurye_logged_courier_id'

export default function KuryePage() {
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
  const [isActive, setIsActive] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = sessionStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedCourierId = sessionStorage.getItem(LOGIN_COURIER_ID_KEY)
      if (loggedIn === 'true' && loggedCourierId) {
        setIsLoggedIn(true)
        setSelectedCourierId(loggedCourierId)
      }
    }
  }, [])

  const fetchPackages = async () => {
    const courierId = sessionStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      setIsLoading(true)
      console.log('📦 Paketler çekiliyor, courierID:', courierId)
      
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name)')
        .eq('courier_id', courierId)
        .neq('status', 'delivered')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Paket çekme hatası:', error)
        throw error
      }
      
      const transformed = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants
      }))
      
      console.log('✅ Paketler yüklendi:', transformed)
      setPackages(transformed)
    } catch (error: any) {
      console.error('❌ Paketler yüklenemedi:', error)
      setErrorMessage('Paketler yüklenemedi: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDailyStats = async () => {
    const courierId = sessionStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      console.log('📊 Günlük istatistikler çekiliyor, courierID:', courierId)
      
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      
      const { data, error } = await supabase
        .from('packages')
        .select('amount, payment_method, status')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('created_at', todayStart.toISOString())

      if (error) {
        console.error('❌ İstatistik hatası:', error)
        throw error
      }

      if (data) {
        console.log('✅ İstatistikler yüklendi:', data)
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
    const courierId = sessionStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      // Couriers tablosundan kurye bilgilerini çek
      const { data, error } = await supabase
        .from('couriers')
        .select('status, is_active')
        .eq('id', courierId)
        .maybeSingle()

      if (error) {
        console.error('Kurye durumu hatası:', error)
        throw error
      }

      if (data) {
        setCourierStatus(data.status)
        setIsActive(data.is_active || false)
        console.log('✅ Kurye durumu yüklendi:', data) // Debug için
      }
    } catch (error: any) {
      console.error('❌ Kurye durumu alınamadı:', error)
      setErrorMessage('Kurye durumu alınamadı: ' + error.message)
    }
  }

  const updateCourierStatus = async (newStatus: 'idle' | 'busy', newIsActive: boolean) => {
    const courierId = sessionStorage.getItem(LOGIN_COURIER_ID_KEY)
    console.log('🔄 [updateCourierStatus] Başlıyor:', { courierId, newStatus, newIsActive })
    
    if (!courierId) {
      setErrorMessage('Kurye ID bulunamadı')
      return
    }

    try {
      setStatusUpdating(true)
      
      // Önce mevcut durumu kontrol et
      console.log('🔍 [updateCourierStatus] Güncelleme öncesi mevcut durum kontrol ediliyor...')
      const { data: beforeData, error: beforeError } = await supabase
        .from('couriers')
        .select('id, full_name, is_active, status')
        .eq('id', courierId)
        .single()
      
      if (beforeError) {
        console.error('❌ [updateCourierStatus] Mevcut durum okunamadı:', beforeError)
      } else {
        console.log('📊 [updateCourierStatus] Güncelleme öncesi durum:', beforeData)
      }
      
      // Güncelleme yap
      console.log('🔄 [updateCourierStatus] Güncelleme yapılıyor...', { 
        table: 'couriers',
        update: { status: newStatus, is_active: newIsActive },
        where: { id: courierId }
      })
      
      const { error, data } = await supabase
        .from('couriers')
        .update({ 
          status: newStatus,
          is_active: newIsActive,
          last_update: new Date().toISOString() // Timestamp güncelle
        })
        .eq('id', courierId)
        .select() // Güncellenen veriyi geri al

      if (error) {
        console.error('❌ [updateCourierStatus] Güncelleme hatası:', error)
        throw error
      }

      console.log('✅ [updateCourierStatus] Güncelleme başarılı, dönen veri:', data)

      // Güncelleme sonrası kontrol et
      console.log('🔍 [updateCourierStatus] Güncelleme sonrası kontrol ediliyor...')
      const { data: afterData, error: afterError } = await supabase
        .from('couriers')
        .select('id, full_name, is_active, status')
        .eq('id', courierId)
        .single()
      
      if (afterError) {
        console.error('❌ [updateCourierStatus] Güncelleme sonrası durum okunamadı:', afterError)
      } else {
        console.log('📊 [updateCourierStatus] Güncelleme sonrası durum:', afterData)
      }

      // Başarılı güncelleme sonrası state'i güncelle
      setCourierStatus(newStatus)
      setIsActive(newIsActive)
      setSuccessMessage(newIsActive ? '✅ Aktif duruma geçildi!' : '❌ Pasif duruma geçildi!')
      setTimeout(() => setSuccessMessage(''), 2000)
      
    } catch (error: any) {
      console.error('❌ [updateCourierStatus] Genel hata:', error)
      setErrorMessage('Durum güncellenemedi: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setStatusUpdating(false)
    }
  }

  // Konum güncelleme fonksiyonu
  const updateLocationInDatabase = async (lat: number, lng: number) => {
    const courierId = sessionStorage.getItem(LOGIN_COURIER_ID_KEY)
    console.log('🔄 Konum güncelleme çalışıyor:', { courierId, lat, lng })
    
    if (!courierId) {
      console.error('❌ Kurye ID bulunamadı!')
      return
    }

    try {
      const { error } = await supabase
        .from('couriers')
        .update({ 
          last_lat: lat,
          last_lng: lng,
          last_update: new Date().toISOString() // Timestamp güncelle
        })
        .eq('id', courierId)

      if (error) {
        console.error('❌ Konum güncelleme hatası:', error)
      } else {
        console.log('✅ Konum ve timestamp başarıyla güncellendi:', { courierId, lat, lng, timestamp: new Date().toISOString() })
      }
    } catch (error: any) {
      console.error('❌ Konum güncelleme hatası:', error)
    }
  }

  // Konum takibi başlat
  const startLocationTracking = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Konum servisi desteklenmiyor')
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 30 saniye cache
    }

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      setCurrentLocation({ lat: latitude, lng: longitude })
      setLocationError(null)
      
      // Veritabanını güncelle
      updateLocationInDatabase(latitude, longitude)
    }

    const errorCallback = (error: GeolocationPositionError) => {
      let errorMessage = 'Konum alınamadı'
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Konum izni reddedildi'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Konum bilgisi mevcut değil'
          break
        case error.TIMEOUT:
          errorMessage = 'Konum alma zaman aşımı'
          break
      }
      setLocationError(errorMessage)
      console.error('Konum hatası:', errorMessage)
    }

    // Canlı konum takibi başlat
    const id = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      options
    )
    
    setWatchId(id)

    // 30 saniyede bir manuel güncelleme (watchPosition yeterli değilse)
    const intervalId = setInterval(() => {
      if (currentLocation) {
        updateLocationInDatabase(currentLocation.lat, currentLocation.lng)
      }
    }, 30000)

    // Cleanup için interval ID'sini sakla
    return () => {
      clearInterval(intervalId)
    }
  }

  // Konum takibini durdur
  const stopLocationTracking = () => {
    if (typeof window !== 'undefined' && watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setCurrentLocation(null)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      fetchPackages()
      fetchDailyStats()
      fetchCourierStatus()
      
      // Konum takibini başlat
      const cleanupLocation = startLocationTracking()
      
      const interval = setInterval(() => {
        fetchPackages()
        fetchDailyStats()
        fetchCourierStatus()
      }, 30000)
      
      return () => {
        clearInterval(interval)
        stopLocationTracking()
        if (cleanupLocation) cleanupLocation()
      }
    }
  }, [isLoggedIn])

  // Aktif durumu değiştiğinde konum takibini kontrol et
  useEffect(() => {
    if (isLoggedIn) {
      if (isActive) {
        startLocationTracking()
      } else {
        stopLocationTracking()
      }
    }
  }, [isActive, isLoggedIn])

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
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-64 h-64 mx-auto mb-4"
            />
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Kurye Girişi
            </h1>
          </div>
          <input 
            type="text" placeholder="Kullanıcı Adı" 
            className="w-full p-4 mb-4 bg-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500"
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" placeholder="Şifre" 
            className="w-full p-4 mb-6 bg-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500"
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">GİRİŞ YAP</button>
          {errorMessage && <p className="text-red-500 mt-4 text-center">{errorMessage}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-48 h-48 mr-3"
            />
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Kurye Paneli
            </h1>
          </div>
          <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="bg-red-900/50 text-red-400 px-4 py-2 rounded-lg text-sm">Çıkış</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
            <p className="text-slate-400 text-sm">Bugün Paket</p>
            <p className="text-3xl font-bold text-green-500">{deliveredCount}</p>
          </div>
          <button 
            onClick={() => setShowSummary(true)}
            className="bg-blue-900/30 p-4 rounded-2xl border border-blue-800 text-center hover:bg-blue-800/40 transition-all"
          >
            <p className="text-blue-400 text-sm">Hesap Özeti</p>
            <p className="text-xl font-bold text-white">{(cashTotal + cardTotal).toFixed(2)} ₺</p>
          </button>
        </div>

        {/* KURYE DURUM KONTROL BUTONLARI */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Kurye Durumu</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-400">
                {isActive ? 'Aktif' : 'Pasif'} - {courierStatus === 'idle' ? 'Boşta' : courierStatus === 'busy' ? 'Meşgul' : 'Bilinmiyor'}
              </span>
            </div>
          </div>

          {/* Konum Bilgisi */}
          <div className="mb-4 p-3 bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">📍 Konum Durumu:</span>
              <div className="text-right">
                {currentLocation ? (
                  <div className="text-xs">
                    <div className="text-green-400 font-medium">✅ Konum Aktif</div>
                    <div className="text-slate-400">
                      {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </div>
                  </div>
                ) : locationError ? (
                  <div className="text-xs">
                    <div className="text-red-400 font-medium">❌ Konum Hatası</div>
                    <div className="text-slate-400">{locationError}</div>
                  </div>
                ) : (
                  <div className="text-xs">
                    <div className="text-yellow-400 font-medium">⏳ Konum Alınıyor...</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateCourierStatus('idle', true)}
              disabled={statusUpdating}
              className="py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {statusUpdating ? '⏳' : '✅'} Pakete Hazırım
            </button>
            
            <button
              onClick={() => updateCourierStatus('idle', false)}
              disabled={statusUpdating}
              className="py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
            >
              {statusUpdating ? '⏳' : '❌'} Aktif Değilim
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-xl text-green-400 text-center">
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-xl text-red-400 text-center">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          {packages.length === 0 ? (
            <div className="text-center py-20 text-slate-500">Atanmış paket bulunmuyor.</div>
          ) : (
            <>
              {/* Paket Sayısı Göstergesi */}
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                <h3 className="text-lg font-bold text-white mb-1">📦 Aktif Paketlerim</h3>
                <p className="text-slate-400 text-sm">
                  Toplam {packages.length} paket • 
                  {packages.filter(p => p.status === 'assigned').length} bekliyor • 
                  {packages.filter(p => p.status === 'picking_up').length} alınacak • 
                  {packages.filter(p => p.status === 'on_the_way').length} teslimatta
                </p>
              </div>

              {/* Paket Listesi */}
              {packages.map((pkg, index) => (
                <div key={pkg.id} className="bg-slate-900 p-6 rounded-3xl border-2 border-slate-800 shadow-xl relative">
                  {/* Paket Numarası */}
                  <div className="absolute top-4 right-4 bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-xs font-bold">
                    #{index + 1}
                  </div>

                  <div className="flex justify-between items-start mb-4 pr-12">
                    <div>
                      <span className="bg-blue-600 text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-widest">Restoran</span>
                      <h2 className="text-xl font-bold mt-1 text-blue-400">{pkg.restaurant?.name || 'Bilinmiyor'}</h2>
                      <p className="text-slate-400 text-sm mt-1">👤 {pkg.customer_name}</p>
                      {pkg.content && (
                        <p className="text-slate-400 text-sm">📝 {pkg.content}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-500">{pkg.amount} ₺</p>
                      <p className="text-xs text-slate-500">
                        {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mb-6">
                    <span className="text-2xl">📍</span>
                    <p className="text-slate-300 font-medium">{pkg.delivery_address}</p>
                  </div>

                  {/* Durum Göstergesi */}
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      pkg.status === 'assigned' ? 'bg-orange-600 text-white' :
                      pkg.status === 'picking_up' ? 'bg-yellow-500 text-slate-900' :
                      'bg-red-600 text-white'
                    }`}>
                      {pkg.status === 'assigned' ? '🔔 YENİ PAKET' :
                       pkg.status === 'picking_up' ? '🏃 ALMAYA GİT' :
                       '🚗 TESLİMAT'}
                    </span>
                  </div>

                  {/* KADEMELİ BUTONLAR */}
                  {pkg.status === 'assigned' && (
                    <button 
                      disabled={isUpdating.has(pkg.id)}
                      onClick={() => handleUpdateStatus(pkg.id, 'picking_up')}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isUpdating.has(pkg.id) ? '⏳ İŞLENİYOR...' : 'PAKETİ KABUL ET'}
                    </button>
                  )}

                  {pkg.status === 'picking_up' && (
                    <button 
                      disabled={isUpdating.has(pkg.id)}
                      onClick={() => handleUpdateStatus(pkg.id, 'on_the_way', { picked_up_at: new Date().toISOString() })}
                      className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isUpdating.has(pkg.id) ? '⏳ İŞLENİYOR...' : 'PAKETİ ALDIM (YOLA ÇIK)'}
                    </button>
                  )}

                  {pkg.status === 'on_the_way' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setSelectedPaymentMethods({...selectedPaymentMethods, [pkg.id]: 'cash'})}
                          className={`py-4 rounded-xl border-2 font-bold transition-all ${selectedPaymentMethods[pkg.id] === 'cash' ? 'bg-green-600 border-green-400 scale-105' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                        >💵 NAKİT</button>
                        <button 
                          onClick={() => setSelectedPaymentMethods({...selectedPaymentMethods, [pkg.id]: 'card'})}
                          className={`py-4 rounded-xl border-2 font-bold transition-all ${selectedPaymentMethods[pkg.id] === 'card' ? 'bg-blue-600 border-blue-400 scale-105' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                        >💳 KART</button>
                      </div>
                      <button 
                        disabled={!selectedPaymentMethods[pkg.id] || isUpdating.has(pkg.id)}
                        onClick={() => handleUpdateStatus(pkg.id, 'delivered', { 
                          payment_method: selectedPaymentMethods[pkg.id],
                          delivered_at: new Date().toISOString() 
                        })}
                        className="w-full py-5 bg-green-500 text-slate-950 font-black text-xl rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isUpdating.has(pkg.id) ? '⏳ TESLİM EDİLİYOR...' : 'TESLİM ET'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* HESAP ÖZETİ MODAL (TESLİMAT SÜRESİ DAHİL) */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/90 z-50 p-4 overflow-y-auto">
          <div className="max-w-md mx-auto bg-slate-900 rounded-3xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Günlük Rapor</h2>
              <button onClick={() => setShowSummary(false)} className="text-2xl">×</button>
            </div>
            
            <SummaryList courierId={selectedCourierId!} calculateDuration={calculateDuration} />

            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex justify-between text-lg font-bold">
                <span>Toplam Kazanç:</span>
                <span className="text-green-500">{(cashTotal + cardTotal).toFixed(2)} ₺</span>
              </div>
              <button onClick={() => setShowSummary(false)} className="w-full mt-4 py-3 bg-slate-800 rounded-xl font-bold">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  async function handleLogin(e: any) {
    e.preventDefault();
    console.log('🔐 Giriş denemesi:', loginForm.username)
    
    try {
      // Couriers tablosundan username ve password ile kurye bilgilerini çek
      const { data, error } = await supabase
        .from('couriers')
        .select('id, full_name, username, password')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .maybeSingle();
        
      if (error) {
        console.error('❌ Veritabanı hatası:', error)
        setErrorMessage("Veritabanı hatası!");
        return
      }
      
      if (data) {
        console.log('✅ Kurye bulundu:', data)
        
        // Kurye aktif yap
        await supabase
          .from('couriers')
          .update({ is_active: true, status: 'idle' })
          .eq('id', data.id)
        
        sessionStorage.setItem(LOGIN_STORAGE_KEY, 'true');
        sessionStorage.setItem(LOGIN_COURIER_ID_KEY, data.id);
        setIsLoggedIn(true);
        setSelectedCourierId(data.id);
      } else {
        console.error('❌ Hatalı giriş')
        setErrorMessage("Hatalı kullanıcı adı veya şifre!");
      }
    } catch (error: any) {
      console.error('❌ Giriş hatası:', error)
      setErrorMessage("Giriş hatası: " + error.message);
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
    <div className="space-y-3">
      {history.map(p => (
        <div key={p.id} className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">{p.customer_name}</p>
            <p className="text-[10px] text-slate-500">{p.payment_method === 'cash' ? 'Nakit' : 'Kart'}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-400 text-xs font-bold">⏱ {calculateDuration(p.picked_up_at, p.delivered_at)}</p>
            <p className="text-white font-bold">{p.amount} ₺</p>
          </div>
        </div>
      ))}
    </div>
  )
}