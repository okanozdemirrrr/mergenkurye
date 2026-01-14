'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

interface Restaurant {
  id: number
  name: string
}

interface Package {
  id: number
  customer_name: string
  delivery_address: string
  amount: number
  status: string
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card' | null
  restaurant_id?: number | null
  restaurant?: Restaurant | null
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  courier_name?: string
}

interface Courier {
  id: string
  full_name?: string
  deliveryCount?: number
  todayDeliveryCount?: number
  isActive?: boolean
  is_active?: boolean // Veritabanından gelen ham veri
  activePackageCount?: number
  last_lat?: number | null
  last_lng?: number | null
  last_update?: string
  status?: 'idle' | 'picking_up' | 'on_the_way' | 'assigned' | 'inactive'
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'couriers' | 'restaurants'>('live')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredPackages, setDeliveredPackages] = useState<Package[]>([])
  const [selectedCourierOrders, setSelectedCourierOrders] = useState<Package[]>([])
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [showCourierModal, setShowCourierModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedCouriers, setSelectedCouriers] = useState<{ [key: number]: string }>({})
  const [assigningIds, setAssigningIds] = useState<Set<number>>(new Set())
  const [restaurantFilter, setRestaurantFilter] = useState<number | null>(null)
  const [previousPackageCount, setPreviousPackageCount] = useState(0)
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [newOrderDetails, setNewOrderDetails] = useState<Package | null>(null)

  // Bildirim sesi çal
  const playNotificationSound = () => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.5 // Ses seviyesi (0.0 - 1.0)
      audio.play().catch(err => console.log('Ses çalınamadı:', err))
    }
  }

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants!inner(name)')
        .in('status', ['waiting', 'assigned', 'picking_up', 'on_the_way'])
        .order('created_at', { ascending: false }) // En yeni en üstte

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0 
          ? pkg.restaurants[0] 
          : null,
        restaurants: undefined
      }))

      // Yeni sipariş kontrolü
      if (previousPackageCount > 0 && transformedData.length > previousPackageCount) {
        const newOrder = transformedData[0] // En yeni sipariş
        playNotificationSound()
        setNewOrderDetails(newOrder)
        setShowNotificationPopup(true)
        setNotificationMessage('🔔 Yeni sipariş geldi!')
        setTimeout(() => {
          setNotificationMessage('')
          setShowNotificationPopup(false)
        }, 8000) // 8 saniye göster
      }
      
      setPreviousPackageCount(transformedData.length)
      setPackages(transformedData)
    } catch (error: any) {
      setErrorMessage('Siparişler yüklenirken hata: ' + error.message)
    }
  }

  const fetchDeliveredPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name), couriers(full_name)')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(50) // Son 50 teslimat

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        courier_name: pkg.couriers?.full_name,
        restaurants: undefined,
        couriers: undefined
      }))

      setDeliveredPackages(transformedData)
    } catch (error: any) {
      console.error('Geçmiş siparişler yüklenirken hata:', error.message)
    }
  }

  const fetchCouriers = async () => {
    try {
      console.log('🔍 [fetchCouriers] Couriers tablosundan veri çekiliyor...')
      
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) {
        console.error('❌ [fetchCouriers] Couriers tablosu hatası:', error)
        throw error
      }
      
      console.log('✅ [fetchCouriers] Couriers tablosundan gelen RAW veri:', data)
      console.log('🔍 [fetchCouriers] Gelen Kuryeler:', data) // Yeni eklenen log
      
      if (!data || data.length === 0) {
        console.warn('⚠️ [fetchCouriers] Couriers tablosu boş!')
        setCouriers([])
        return
      }
      
      // Her kurye için detaylı log
      data.forEach(courier => {
        console.log(`🚴 [fetchCouriers] RAW: ${courier.full_name}`)
        console.log(`   - id: ${courier.id}`)
        console.log(`   - is_active: ${courier.is_active} (type: ${typeof courier.is_active}) (strict: ${courier.is_active === true})`)
        console.log(`   - status: ${courier.status}`)
        console.log(`   - last_lat: ${courier.last_lat} (type: ${typeof courier.last_lat})`)
        console.log(`   - last_lng: ${courier.last_lng} (type: ${typeof courier.last_lng})`)
      })
      
      // is_active -> isActive mapping ve koordinat dönüşümü
      const couriersData = data.map(courier => ({
        ...courier,
        id: courier.id,
        full_name: courier.full_name || 'İsimsiz Kurye',
        isActive: Boolean(courier.is_active), // Veritabanındaki is_active'i buraya bağla
        last_lat: courier.last_lat ? Number(courier.last_lat) : null,
        last_lng: courier.last_lng ? Number(courier.last_lng) : null,
        deliveryCount: 0,
        todayDeliveryCount: 0,
        activePackageCount: 0
      }))
      
      console.log('✅ [fetchCouriers] Dönüştürülmüş kurye verileri:', couriersData)
      console.log('📊 [fetchCouriers] İsActive durumları:', couriersData.map(c => ({ name: c.full_name, isActive: c.isActive })))
      setCouriers(couriersData)
      
      // Paket sayılarını ayrı olarak çek
      if (couriersData.length > 0) {
        const ids = couriersData.map(c => c.id)
        await Promise.all([
          fetchCourierDeliveryCounts(ids),
          fetchCourierTodayDeliveryCounts(ids),
          fetchCourierActivePackageCounts(ids)
        ])
      }
    } catch (error: any) {
      console.error('❌ [fetchCouriers] Kuryeler yüklenirken hata:', error)
      setErrorMessage('Kuryeler yüklenemedi: ' + error.message)
    }
  }

  const fetchCourierActivePackageCounts = async (courierIds: string[]) => {
    try {
      console.log('📊 [fetchCourierActivePackageCounts] Başlıyor, kurye IDs:', courierIds)
      
      const { data, error } = await supabase
        .from('packages')
        .select('courier_id')
        .in('courier_id', courierIds)
        .neq('status', 'delivered') // Teslim edilmemiş paketler

      if (error) {
        console.error('❌ [fetchCourierActivePackageCounts] Hata:', error)
        throw error
      }

      console.log('✅ [fetchCourierActivePackageCounts] Aktif paketler:', data)

      const counts: { [key: string]: number } = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      console.log('📊 [fetchCourierActivePackageCounts] Hesaplanan sayılar:', counts)

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        activePackageCount: counts[c.id] || 0 
      })))
    } catch (error: any) {
      console.error('❌ [fetchCourierActivePackageCounts] Aktif paket sayıları alınırken hata:', error)
    }
  }

  const fetchCourierDeliveryCounts = async (courierIds: string[]) => {
    try {
      console.log('📊 [fetchCourierDeliveryCounts] Başlıyor, kurye IDs:', courierIds)
      
      const { data, error } = await supabase
        .from('packages')
        .select('courier_id')
        .eq('status', 'delivered')
        .in('courier_id', courierIds)

      if (error) {
        console.error('❌ [fetchCourierDeliveryCounts] Hata:', error)
        throw error
      }

      console.log('✅ [fetchCourierDeliveryCounts] Teslim edilen paketler:', data)

      const counts: { [key: string]: number } = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      console.log('📊 [fetchCourierDeliveryCounts] Hesaplanan sayılar:', counts)

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        deliveryCount: counts[c.id] || 0 
      })))
    } catch (error: any) {
      console.error('❌ [fetchCourierDeliveryCounts] Kurye teslimat sayıları alınırken hata:', error)
    }
  }

  const fetchCourierTodayDeliveryCounts = async (courierIds: string[]) => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('packages')
        .select('courier_id')
        .eq('status', 'delivered')
        .in('courier_id', courierIds)
        .gte('delivered_at', todayStart.toISOString())

      if (error) throw error

      const counts: { [key: string]: number } = {}
      data?.forEach((pkg) => { 
        if (pkg.courier_id) {
          counts[pkg.courier_id] = (counts[pkg.courier_id] || 0) + 1 
        }
      })

      setCouriers(prev => prev.map(c => ({ 
        ...c, 
        todayDeliveryCount: counts[c.id] || 0 
      })))
    } catch (error: any) {
      console.error('Kurye bugünkü teslimat sayıları alınırken hata:', error)
    }
  }

  // fetchCourierStatuses fonksiyonu kaldırıldı - artık fetchCouriers'da tüm bilgiler geliyor

  const handleAssignCourier = async (packageId: number) => {
    console.log('🚀 [handleAssignCourier] Başlıyor:', packageId);
    
    // State'i direkt kullanmak yerine, callback ile al
    setSelectedCouriers(currentState => {
      const courierId = currentState[packageId];
      console.log('   - Seçili Kurye ID (callback):', courierId);
      console.log('   - selectedCouriers state (callback):', currentState);
      
      if (!courierId) {
        console.error('❌ Kurye ID yok, işlem iptal');
        alert('Lütfen önce bir kurye seçin!');
        return currentState;
      }
      
      // Async işlemi başlat
      (async () => {
        try {
          setAssigningIds(prev => new Set(prev).add(packageId));
          console.log('   - Supabase güncelleme başlıyor...');
          
          const { error } = await supabase.from('packages').update({
            courier_id: courierId,
            status: 'assigned',
            assigned_at: new Date().toISOString()
          }).eq('id', packageId);
          
          if (error) {
            console.error('❌ Supabase hatası:', error);
            throw error;
          }
          
          console.log('✅ Kurye başarıyla atandı!');
          setSuccessMessage('Kurye atandı!');
          fetchPackages(); 
          fetchCouriers();
        } catch (error: any) { 
          console.error('❌ Hata:', error);
          setErrorMessage(error.message);
        } finally { 
          setAssigningIds(prev => { const n = new Set(prev); n.delete(packageId); return n });
        }
      })();
      
      return currentState;
    });
  }

  useEffect(() => {
    // İlk yükleme - loading göstermesin
    setIsLoading(true)
    Promise.all([
      fetchPackages(), 
      fetchCouriers(), 
      fetchRestaurants(),
      activeTab === 'history' ? fetchDeliveredPackages() : Promise.resolve()
    ]).finally(() => setIsLoading(false))

    // 20 saniyede bir arka planda güncelle (loading göstermeden)
    const interval = setInterval(async () => { 
      await fetchPackages(); 
      await fetchCouriers();
      if (activeTab === 'history') {
        await fetchDeliveredPackages();
      }
    }, 20000) // 20 saniye

    return () => {
      clearInterval(interval)
    }
  }, [restaurantFilter, activeTab])

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('id, name').order('name', { ascending: true })
    setRestaurants(data || [])
  }

  const handleCourierChange = (packageId: number, courierId: string) => {
    setSelectedCouriers(prev => ({ ...prev, [packageId]: courierId }))
  }

  // Türkiye saatine dönüştürme fonksiyonu
  const formatTurkishTime = (dateString?: string) => {
    if (!dateString) return '--:--'
    
    try {
      const date = new Date(dateString)
      // Türkiye saatine dönüştür (+3 UTC)
      const turkishTime = new Date(date.getTime() + (3 * 60 * 60 * 1000))
      
      const hours = turkishTime.getUTCHours().toString().padStart(2, '0')
      const minutes = turkishTime.getUTCMinutes().toString().padStart(2, '0')
      
      return `${hours}:${minutes}`
    } catch (error) {
      console.error('Saat formatı hatası:', error)
      return '--:--'
    }
  }

  // Kurye siparişlerini getir
  const fetchCourierOrders = async (courierId: string) => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          restaurants!inner(name)
        `)
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        restaurants: undefined
      }))

      setSelectedCourierOrders(transformedData)
    } catch (error: any) {
      console.error('Kurye siparişleri yüklenirken hata:', error.message)
    }
  }

  // Kurye detaylarını göster
  const handleCourierClick = async (courierId: string) => {
    setSelectedCourierId(courierId)
    setShowCourierModal(true)
    await fetchCourierOrders(courierId)
  }

  // Teslimat süresini hesapla (dakika)
  const calculateDeliveryDuration = (pickedUpAt?: string, deliveredAt?: string) => {
    if (!pickedUpAt || !deliveredAt) return '-'
    
    try {
      const pickupTime = new Date(pickedUpAt)
      const deliveryTime = new Date(deliveredAt)
      const diffMs = deliveryTime.getTime() - pickupTime.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} dk`
    } catch (error) {
      return '-'
    }
  }

  // Kasa özetini hesapla
  const calculateCashSummary = (orders: Package[]) => {
    const cashTotal = orders
      .filter(order => order.payment_method === 'cash')
      .reduce((sum, order) => sum + (order.amount || 0), 0)
    
    const cardTotal = orders
      .filter(order => order.payment_method === 'card')
      .reduce((sum, order) => sum + (order.amount || 0), 0)
    
    return {
      cashTotal,
      cardTotal,
      grandTotal: cashTotal + cardTotal
    }
  }

  // Restoran bazlı özet hesapla
  const calculateRestaurantSummary = (orders: Package[]) => {
    const restaurantCounts: { [key: string]: number } = {}
    
    orders.forEach(order => {
      const restaurantName = order.restaurant?.name || 'Bilinmeyen Restoran'
      restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1
    })
    
    return Object.entries(restaurantCounts)
      .sort(([,a], [,b]) => b - a) // En çok paketi olan restoran üstte
      .map(([name, count]) => ({ name, count }))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* YENİ SİPARİŞ POPUP BİLDİRİMİ */}
      {showNotificationPopup && newOrderDetails && (
        <div className="fixed top-4 right-4 z-[100] animate-bounce">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-4 border-red-500 p-6 max-w-md relative">
            {/* Kırmızı Alarm İkonu */}
            <div className="absolute -top-3 -right-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">🚨</span>
            </div>
            
            {/* Kapatma Butonu */}
            <button 
              onClick={() => setShowNotificationPopup(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 text-xl"
            >
              ×
            </button>
            
            {/* Başlık */}
            <div className="mb-4">
              <h2 className="text-2xl font-black text-red-600 dark:text-red-400 mb-1">
                📦 YENİ SİPARİŞ GELDİ!
              </h2>
              <p className="text-sm text-slate-500">Hemen kurye atayın</p>
            </div>
            
            {/* Sipariş Detayları */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Restoran:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {newOrderDetails.restaurant?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Müşteri:</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {newOrderDetails.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tutar:</span>
                <span className="text-lg font-black text-green-600 dark:text-green-400">
                  {newOrderDetails.amount}₺
                </span>
              </div>
              {newOrderDetails.content && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-xs text-slate-500">İçerik:</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{newOrderDetails.content}</p>
                </div>
              )}
            </div>
            
            {/* Aksiyon Butonu */}
            <button
              onClick={() => {
                setShowNotificationPopup(false)
                setActiveTab('live')
              }}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Siparişe Git →
            </button>
          </div>
        </div>
      )}

      {/* Sticky Navbar */}
      <div className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-48 h-48 mr-3"
              />
              <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent" style={{fontFamily: 'Orbitron, sans-serif'}}>
                ADMIN PANEL
              </h1>
            </div>

            {/* Tab Navigation */}
            <nav className="flex space-x-1">
              {[
                { id: 'live', label: 'Canlı Takip', icon: '📦' },
                { id: 'history', label: 'Geçmiş Siparişler', icon: '📋' },
                { id: 'couriers', label: 'Kuryeler', icon: '🚴' },
                { id: 'restaurants', label: 'Restoranlar', icon: '🍽️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Başarı/Hata/Bildirim Mesajları */}
          {notificationMessage && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-300 animate-pulse">
              {notificationMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-300">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Tab İçerikleri */}
          {activeTab === 'live' && <LiveTrackingTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'couriers' && <CouriersTab />}
          {activeTab === 'restaurants' && <RestaurantsTab />}
        </div>
      </div>
    </div>
  )

  // Tab Bileşenleri
  function LiveTrackingTab() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">📦 Canlı Sipariş Takibi</h2>
          
          {/* Sipariş Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-slate-500">Siparişler yükleniyor...</div>
            ) : packages.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">Aktif sipariş bulunmuyor.</div>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className={`bg-white dark:bg-slate-800 p-3 rounded-lg border-l-4 shadow-sm ${
                  pkg.status === 'waiting' ? 'border-l-yellow-500' :
                  pkg.status === 'assigned' ? 'border-l-blue-500' :
                  pkg.status === 'picking_up' ? 'border-l-orange-500' :
                  'border-l-red-500'
                } border-r border-t border-b border-slate-200 dark:border-slate-600`}>
                  
                  {/* Oluşturulma Saati */}
                  <div className="flex justify-end mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      🕐 {formatTurkishTime(pkg.created_at)}
                    </span>
                  </div>

                  {/* Üst Kısım - Restoran ve Durum */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded text-xs font-medium">
                      🍽️ {pkg.restaurant?.name || 'Bilinmeyen'}
                    </span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {pkg.amount}₺
                    </span>
                  </div>

                  {/* Durum Rozeti */}
                  <div className="mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      pkg.status === 'waiting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      pkg.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {pkg.status === 'waiting' ? '⏳ Bekliyor' : 
                       pkg.status === 'assigned' ? '👤 Atandı' :
                       pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                    </span>
                  </div>

                  {/* Müşteri Bilgileri */}
                  <div className="space-y-2 mb-3">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      👤 {pkg.customer_name}
                    </h3>
                    
                    {pkg.content && (
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Paket İçeriği:</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded">
                          📝 {pkg.content}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Adres:</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                        📍 {pkg.delivery_address}
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        pkg.payment_method === 'cash' 
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      }`}>
                        {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </span>
                    </div>
                  </div>

                  {/* Kurye Atama */}
                  {pkg.status === 'waiting' && (
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2 space-y-2">
                      <select 
                        value={selectedCouriers[pkg.id] || ''}
                        onChange={(e) => {
                          console.log('📝 Dropdown değişti:');
                          console.log('   - Package ID:', pkg.id);
                          console.log('   - Seçilen Kurye ID:', e.target.value);
                          handleCourierChange(pkg.id, e.target.value);
                          console.log('   - State güncellendi, yeni selectedCouriers:', selectedCouriers);
                        }}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        disabled={assigningIds.has(pkg.id)}
                      >
                        <option value="">Kurye Seçin</option>
                        {couriers.length === 0 && (
                          <option disabled>Kurye bulunamadı</option>
                        )}
                        {couriers.filter(c => c.isActive).length === 0 && couriers.length > 0 && (
                          <option disabled>Aktif kurye yok (Toplam: {couriers.length})</option>
                        )}
                        {couriers
                          .filter(c => c.isActive) // Sadece aktif kuryeler
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.full_name} ({c.deliveryCount || 0} teslim, {c.activePackageCount || 0} aktif)
                            </option>
                          ))
                        }
                      </select>
                      <button 
                        onClick={() => {
                          console.log('🔘 Kurye Ata butonuna tıklandı');
                          console.log('   - Package ID:', pkg.id);
                          console.log('   - Seçili Kurye ID:', selectedCouriers[pkg.id]);
                          console.log('   - selectedCouriers tüm state:', selectedCouriers);
                          console.log('   - Atanıyor mu:', assigningIds.has(pkg.id));
                          console.log('   - Buton disabled mi:', !selectedCouriers[pkg.id] || assigningIds.has(pkg.id));
                          
                          if (!selectedCouriers[pkg.id]) {
                            alert('Lütfen önce bir kurye seçin!');
                            return;
                          }
                          
                          handleAssignCourier(pkg.id);
                        }}
                        disabled={false}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer"
                      >
                        {assigningIds.has(pkg.id) ? '⏳ Atanıyor...' : '✅ Kurye Ata (TEST)'}
                      </button>
                    </div>
                  )}

                  {/* Atanmış Kurye Bilgisi */}
                  {pkg.status !== 'waiting' && pkg.courier_id && (
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                      <div className="flex items-center justify-center">
                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                          🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* SAĞ PANEL: KURYELERİN DURUMU */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">🚴 Kurye Durumları</h2>
            <div className="space-y-3">
              {couriers.map(c => {
                // Bu kuryenin paketlerini bul
                const courierPackages = packages.filter(pkg => pkg.courier_id === c.id)
                
                return (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border dark:border-slate-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">{c.full_name}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">{c.todayDeliveryCount || 0} bugün</span>
                        <span className="text-[10px] text-green-600 dark:text-green-400 block font-semibold">
                          {c.deliveryCount || 0} toplam teslim
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">
                          {c.activePackageCount || 0} aktif paket
                        </span>
                      </div>
                    </div>
                    
                    {/* Aktiflik Durumu */}
                    <div className="mb-2">
                      {!c.isActive && <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded-md font-bold">⚫ AKTİF DEĞİL</span>}
                      {c.isActive && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">🟢 AKTİF</span>}
                    </div>
                    
                    {/* Paket Durumları */}
                    {courierPackages.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {courierPackages.map(pkg => (
                          <div key={pkg.id} className="text-[10px] flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${
                              pkg.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {pkg.status === 'assigned' ? '👤 Atandı' :
                               pkg.status === 'picking_up' ? '🏃 Alıyor' : '🚗 Yolda'}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 truncate">
                              {pkg.customer_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </div>
      </div>
    )
  }

  function HistoryTab() {
    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">📋 Geçmiş Siparişler</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="text-left py-3 px-4">Tarih/Saat</th>
                <th className="text-left py-3 px-4">Müşteri</th>
                <th className="text-left py-3 px-4">Restoran</th>
                <th className="text-left py-3 px-4">Kurye</th>
                <th className="text-left py-3 px-4">Tutar</th>
                <th className="text-left py-3 px-4">Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {deliveredPackages.map(pkg => (
                <tr key={pkg.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div className="font-medium">{formatTurkishTime(pkg.delivered_at)}</div>
                      <div className="text-slate-500 text-xs">
                        {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('tr-TR') : '-'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{pkg.customer_name}</td>
                  <td className="py-3 px-4">{pkg.restaurant?.name}</td>
                  <td className="py-3 px-4">{pkg.courier_name || 'Bilinmeyen'}</td>
                  <td className="py-3 px-4 font-bold text-green-600">{pkg.amount}₺</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pkg.payment_method === 'cash' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function CouriersTab() {
    return (
      <>
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">🚴 Kurye Yönetimi</h2>
          
          {/* Debug Bilgileri */}
          <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <div className="font-bold mb-2">📊 Kurye Durumu Özeti:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{couriers.length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Kurye</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{couriers.filter(c => c.isActive).length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Aktif Kurye</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{couriers.filter(c => !c.isActive).length}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Pasif Kurye</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {couriers.reduce((sum, c) => sum + (c.activePackageCount || 0), 0)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Toplam Aktif Paket</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 text-center">
              Son güncelleme: {new Date().toLocaleTimeString('tr-TR')} • Otomatik güncelleme: 30 saniye
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {couriers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">🚫</div>
                <div className="font-bold">Kurye bulunamadı!</div>
                <div className="text-sm mt-2">Couriers tablosunda veri yok. SQL'i çalıştırın.</div>
              </div>
            ) : (
              couriers.map(c => (
                <div key={c.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
                  <div className="flex justify-between items-start mb-3">
                    <button
                      onClick={() => handleCourierClick(c.id)}
                      className="font-bold text-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      {c.full_name}
                    </button>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${c.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className="text-xs text-slate-500">
                        {c.last_lat && c.last_lng ? '📍' : '❌'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Durum:</span>
                      <span className={`font-medium ${
                        c.isActive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {c.isActive ? 'Aktif' : 'Aktif Değil'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Aktif Paket:</span>
                      <span className="font-bold text-blue-600">{c.activePackageCount || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Bugün Teslim:</span>
                      <span className="font-bold text-green-600">{c.todayDeliveryCount || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Toplam Teslim:</span>
                      <span className="font-bold text-purple-600">{c.deliveryCount || 0}</span>
                    </div>

                    {/* Konum Bilgisi */}
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Konum:</span>
                      <span className={`text-xs font-medium ${
                        c.last_lat && c.last_lng ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {c.last_lat && c.last_lng ? 
                          `${Number(c.last_lat).toFixed(4)}, ${Number(c.last_lng).toFixed(4)}` : 
                          'Konum yok'
                        }
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <button
                        onClick={() => handleCourierClick(c.id)}
                        className="w-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        📊 Detaylı Rapor Görüntüle
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kurye Detay Modalı */}
        {showCourierModal && selectedCourierId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  🚴 {couriers.find(c => c.id === selectedCourierId)?.full_name} - Detaylı Rapor
                </h3>
                <button
                  onClick={() => setShowCourierModal(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Kasa Özeti */}
                {selectedCourierOrders.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">💰 Kasa Özeti</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const summary = calculateCashSummary(selectedCourierOrders)
                        return (
                          <>
                            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                              <div className="text-center">
                                <div className="text-3xl font-black text-green-700 dark:text-green-400">
                                  {summary.cashTotal.toFixed(2)} ₺
                                </div>
                                <div className="text-sm font-semibold text-green-600 dark:text-green-500 mt-1">
                                  💵 NAKİT TOPLAM
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                                  {selectedCourierOrders.filter(o => o.payment_method === 'cash').length} sipariş
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                              <div className="text-center">
                                <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                                  {summary.cardTotal.toFixed(2)} ₺
                                </div>
                                <div className="text-sm font-semibold text-blue-600 dark:text-blue-500 mt-1">
                                  💳 KART TOPLAM
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                  {selectedCourierOrders.filter(o => o.payment_method === 'card').length} sipariş
                                </div>
                              </div>
                            </div>

                            <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                              <div className="text-center">
                                <div className="text-3xl font-black text-purple-700 dark:text-purple-400">
                                  {summary.grandTotal.toFixed(2)} ₺
                                </div>
                                <div className="text-sm font-semibold text-purple-600 dark:text-purple-500 mt-1">
                                  🎯 GENEL TOPLAM
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                                  {selectedCourierOrders.length} toplam sipariş
                                </div>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* Sipariş Detay Tablosu */}
                <div>
                  <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">📋 Teslim Edilen Siparişler</h4>
                  {selectedCourierOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      Bu kurye henüz sipariş teslim etmemiş.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                            <th className="text-left py-3 px-4 font-semibold">Tarih/Saat</th>
                            <th className="text-left py-3 px-4 font-semibold">Müşteri</th>
                            <th className="text-left py-3 px-4 font-semibold">Restoran</th>
                            <th className="text-left py-3 px-4 font-semibold">İçerik</th>
                            <th className="text-left py-3 px-4 font-semibold">Tutar</th>
                            <th className="text-left py-3 px-4 font-semibold">Konum</th>
                            <th className="text-left py-3 px-4 font-semibold">Ödeme</th>
                            <th className="text-left py-3 px-4 font-semibold">Teslimat Süresi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCourierOrders.map((order, index) => (
                            <tr key={order.id} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                              index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-700/20'
                            }`}>
                              <td className="py-3 px-4">
                                <div className="text-sm">
                                  <div className="font-medium">{formatTurkishTime(order.delivered_at)}</div>
                                  <div className="text-slate-500 text-xs">
                                    {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium">{order.customer_name}</td>
                              <td className="py-3 px-4">
                                <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded text-xs font-medium">
                                  🍽️ {order.restaurant?.name || 'Bilinmeyen'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs">
                                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                    {order.content || 'Belirtilmemiş'}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-green-600 dark:text-green-400">
                                  {order.amount} ₺
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-xs text-xs text-slate-600 dark:text-slate-400 truncate">
                                  📍 {order.delivery_address}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.payment_method === 'cash' 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-purple-600 dark:text-purple-400">
                                  ⏱️ {calculateDeliveryDuration(order.picked_up_at, order.delivered_at)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Restoran Bazlı Özet */}
                {selectedCourierOrders.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">🍽️ Restoran Bazlı Özet</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {calculateRestaurantSummary(selectedCourierOrders).map((restaurant, index) => (
                        <div key={restaurant.name} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border dark:border-slate-600">
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {restaurant.count}
                            </div>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                              {restaurant.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {restaurant.count === 1 ? 'paket' : 'paket'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Özet İstatistik */}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-center text-sm text-blue-700 dark:text-blue-400">
                        <span className="font-semibold">
                          Toplam {calculateRestaurantSummary(selectedCourierOrders).length} farklı restorandan 
                          {' '}{selectedCourierOrders.length} paket teslim edildi
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  function RestaurantsTab() {
    return (
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6">🍽️ Restoran Yönetimi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map(r => {
            // Restoran ID'si ile eşleştir (daha güvenilir)
            const activeOrders = packages.filter(p => p.restaurant_id === r.id || p.restaurant?.name === r.name)
            const deliveredOrders = deliveredPackages.filter(p => p.restaurant_id === r.id || p.restaurant?.name === r.name)
            const totalOrders = activeOrders.length + deliveredOrders.length
            
            return (
              <div key={r.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border dark:border-slate-600">
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3">🍽️</span>
                  <h3 className="font-bold text-lg">{r.name}</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Toplam Sipariş:</span>
                    <span className="font-bold text-blue-600">
                      {totalOrders}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Aktif Sipariş:</span>
                    <span className="font-bold text-orange-600">
                      {activeOrders.length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Teslim Edilen:</span>
                    <span className="font-bold text-green-600">
                      {deliveredOrders.length}
                    </span>
                  </div>

                  {/* Debug bilgisi - geliştirme sırasında görmek için */}
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      ID: {r.id} | Aktif: {activeOrders.length} | Teslim: {deliveredOrders.length}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Debug Paneli */}
        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <h3 className="font-bold mb-2">🔍 Debug Bilgileri</h3>
          <div className="text-sm space-y-1">
            <div>Toplam Restoran: {restaurants.length}</div>
            <div>Aktif Paketler: {packages.length}</div>
            <div>Teslim Edilen Paketler: {deliveredPackages.length}</div>
            <div className="mt-2">
              <strong>Aktif Paket Örnekleri:</strong>
              {packages.slice(0, 3).map(p => (
                <div key={p.id} className="ml-2 text-xs">
                  - ID: {p.id}, Restaurant ID: {p.restaurant_id}, Restaurant Name: {p.restaurant?.name}
                </div>
              ))}
            </div>
            <div className="mt-2">
              <strong>Restoran Örnekleri:</strong>
              {restaurants.slice(0, 3).map(r => (
                <div key={r.id} className="ml-2 text-xs">
                  - ID: {r.id}, Name: {r.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
}