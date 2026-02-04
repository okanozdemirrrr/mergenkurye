/**
 * @file src/app/restoran/page.tsx
 * @description Restoran Arayüzü Uygulaması.
 * Restoranların yeni sipariş girdiği (manuel veya eklenti ile otomatik), 
 * aktif siparişlerini takip ettiği ve finansal borç/alacak durumlarını 
 * izlediği ana arayüzdür. Satış istatistikleri ve performans grafikleri sunar.
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getPlatformBadgeClass, getPlatformDisplayName } from '../lib/platformUtils'

const LOGIN_STORAGE_KEY = 'restoran_logged_in'
const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'

interface Restaurant {
  id: string
  name: string
  password?: string
  maps_link?: string
  delivery_fee?: number
  logo_url?: string
}

interface Package {
  id: number
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card'
  restaurant_id?: number | null
  order_number?: string
  platform?: string
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  restaurant?: Restaurant
  courier_name?: string
  cancelled_at?: string | null
  cancelled_by?: 'admin' | 'restaurant' | null
  cancellation_reason?: string | null
}

export default function RestoranPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    packageAmount: '',
    content: ''
  })
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null
  })
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all')
  const [darkMode, setDarkMode] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showStatistics, setShowStatistics] = useState(false)
  const [showDebt, setShowDebt] = useState(false)

  // 3 Nokta Menüsü State
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openDropdownId])
  const [statisticsTab, setStatisticsTab] = useState<'packages' | 'revenue'>('packages')
  const [statisticsFilter, setStatisticsFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [statisticsData, setStatisticsData] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [debtFilter, setDebtFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

  // Tarih ve saat formatı
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-'

    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')

      return `${day}.${month}.${year} ${hours}:${minutes}`
    } catch (error) {
      return '-'
    }
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-'

    try {
      const date = new Date(dateString)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')

      return `${hours}:${minutes}`
    } catch (error) {
      return '-'
    }
  }

  // Build-safe mount kontrolü
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 🎯 MERGEN AGENT LISTENER - OTOMATİK KAYIT SİSTEMİ
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoggedIn || !selectedRestaurantId) return

    console.log('🔌 Mergen Agent otomatik kayıt sistemi aktif - Eklentiden veri bekleniyor...')

    const handleMergenMessage = async (event: MessageEvent) => {
      // Güvenlik kontrolü - Sadece Mergen Agent'tan gelen mesajları kabul et
      if (!event.data || event.data.source !== 'mergen-extension' || event.data.type !== 'MERGEN_ORDER_DATA') {
        return
      }

      console.log('📨 Mergen Agent\'tan veri alındı:', event.data)

      const orderData = event.data.payload

      try {
        // Validasyon
        if (!orderData.customer || !orderData.phone || !orderData.address || !orderData.amount || !orderData.content) {
          console.error('❌ Eksik veri:', orderData)
          setErrorMessage('❌ Eklentiden eksik veri geldi')
          setTimeout(() => setErrorMessage(''), 3000)
          return
        }

        if (!orderData.paymentMethod || (orderData.paymentMethod !== 'cash' && orderData.paymentMethod !== 'card')) {
          console.error('❌ Geçersiz ödeme yöntemi:', orderData.paymentMethod)
          setErrorMessage('❌ Ödeme yöntemi belirtilmemiş')
          setTimeout(() => setErrorMessage(''), 3000)
          return
        }

        console.log('🚀 Otomatik kayıt başlatılıyor...')

        // Supabase'e kayıt - OTOMATİK
        const packageData: any = {
          customer_name: orderData.customer.trim(),
          customer_phone: orderData.phone.trim(),
          content: orderData.content.trim(),
          delivery_address: orderData.address.trim(),
          amount: parseFloat(orderData.amount),
          status: 'waiting',
          restaurant_id: selectedRestaurantId,
          payment_method: orderData.paymentMethod
        }

        // Koordinatlar varsa ekle (Mergen Agent'tan gelmişse)
        if (orderData.latitude && orderData.longitude) {
          packageData.latitude = orderData.latitude
          packageData.longitude = orderData.longitude
          console.log('📍 Koordinatlar veritabanına kaydediliyor:', {
            lat: orderData.latitude,
            lng: orderData.longitude
          })
        } else {
          console.warn('⚠️ Koordinat bilgisi yok - Adres bazlı navigasyon kullanılacak')
        }

        const { data, error } = await supabase
          .from('packages')
          .insert([packageData])
          .select()

        if (error) {
          console.error('❌ Otomatik kayıt hatası:', error)
          setErrorMessage('❌ Sipariş kaydedilemedi: ' + error.message)
          setTimeout(() => setErrorMessage(''), 5000)
          return
        }

        console.log('✅ Sipariş otomatik kaydedildi:', data)

        // Başarı mesajı göster
        setSuccessMessage('🔔 Yeni Sipariş Otomatik Eklendi')
        setTimeout(() => setSuccessMessage(''), 5000)

        // Paketleri yenile
        fetchPackages()

      } catch (error: any) {
        console.error('❌ Otomatik kayıt hatası:', error)
        setErrorMessage('❌ Otomatik kayıt başarısız: ' + error.message)
        setTimeout(() => setErrorMessage(''), 5000)
      }
    }

    // Listener'ı ekle
    window.addEventListener('message', handleMergenMessage)

    // Cleanup - Component unmount olduğunda listener'ı kaldır
    return () => {
      window.removeEventListener('message', handleMergenMessage)
      console.log('🔌 Mergen Agent otomatik kayıt sistemi kapatıldı')
    }
  }, [isLoggedIn, selectedRestaurantId])

  // İstatistik verilerini çek
  const fetchStatisticsData = async () => {
    if (!selectedRestaurantId) return

    try {
      // Otomatik tarih aralığı hesapla
      const end = new Date()
      const start = new Date()

      if (statisticsFilter === 'daily') {
        // Son 30 gün
        start.setDate(end.getDate() - 29) // Bugün dahil 30 gün
      } else if (statisticsFilter === 'weekly') {
        // Son 12 hafta
        start.setDate(end.getDate() - (12 * 7 - 1)) // 12 hafta
      } else {
        // Son 12 ay
        start.setMonth(end.getMonth() - 11) // Bugünkü ay dahil 12 ay
      }

      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      // Seçilen tarih aralığındaki paketleri çek
      const { data, error } = await supabase
        .from('packages')
        .select('created_at, amount, status, delivery_address')
        .eq('restaurant_id', selectedRestaurantId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Tüm tarih aralığını oluştur (veri olmasa bile)
      const allPeriods: string[] = []

      if (statisticsFilter === 'daily') {
        // Günlük: Son 30 günü ekle
        const current = new Date(start)
        while (current <= end) {
          const day = current.getDate().toString().padStart(2, '0')
          const month = (current.getMonth() + 1).toString().padStart(2, '0')
          allPeriods.push(`${day}.${month}`)
          current.setDate(current.getDate() + 1)
        }
      } else if (statisticsFilter === 'weekly') {
        // Haftalık: Son 12 haftayı ekle
        const current = new Date(start)
        let weekCount = 0
        while (weekCount < 12) {
          const dayOfWeek = current.getDay()
          const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          const weekStart = new Date(current.getFullYear(), current.getMonth(), diff)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)

          const startDay = weekStart.getDate().toString().padStart(2, '0')
          const startMonth = (weekStart.getMonth() + 1).toString().padStart(2, '0')
          const endDay = weekEnd.getDate().toString().padStart(2, '0')
          const endMonth = (weekEnd.getMonth() + 1).toString().padStart(2, '0')

          const key = `${startDay}.${startMonth}-${endDay}.${endMonth}`
          if (!allPeriods.includes(key)) {
            allPeriods.push(key)
            weekCount++
          }

          current.setDate(current.getDate() + 7)
        }
      } else {
        // Aylık: Son 12 ayı ekle
        const current = new Date(start)
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
          'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

        for (let i = 0; i < 12; i++) {
          const month = monthNames[current.getMonth()]
          const year = current.getFullYear().toString().slice(-2) // Son 2 rakam
          const key = `${month} '${year}`
          if (!allPeriods.includes(key)) {
            allPeriods.push(key)
          }
          current.setMonth(current.getMonth() + 1)
        }
      }

      // Tüm periyotlar için başlangıç değerleri
      const grouped: { [key: string]: { count: number; revenue: number } } = {}
      allPeriods.forEach(period => {
        grouped[period] = { count: 0, revenue: 0 }
      })

      // Verileri grupla (SADECE TESLİM EDİLEN PAKETLER)
      if (data && data.length > 0) {
        data.forEach((pkg) => {
          if (!pkg.created_at || pkg.status !== 'delivered') return // Sadece teslim edilenler

          const date = new Date(pkg.created_at)
          let key = ''

          if (statisticsFilter === 'daily') {
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            key = `${day}.${month}`
          } else if (statisticsFilter === 'weekly') {
            const dayOfWeek = date.getDay()
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
            const weekStart = new Date(date.getFullYear(), date.getMonth(), diff)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)

            const startDay = weekStart.getDate().toString().padStart(2, '0')
            const startMonth = (weekStart.getMonth() + 1).toString().padStart(2, '0')
            const endDay = weekEnd.getDate().toString().padStart(2, '0')
            const endMonth = (weekEnd.getMonth() + 1).toString().padStart(2, '0')

            key = `${startDay}.${startMonth}-${endDay}.${endMonth}`
          } else {
            const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
              'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
            const month = monthNames[date.getMonth()]
            const year = date.getFullYear().toString().slice(-2)
            key = `${month} '${year}`
          }

          if (grouped[key]) {
            grouped[key].count++
            grouped[key].revenue += pkg.amount || 0
          }
        })
      }

      // Array'e çevir (sıralı)
      const chartData = allPeriods.map(name => ({
        name,
        count: grouped[name].count,
        revenue: grouped[name].revenue
      }))

      setStatisticsData(chartData)
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }

      console.error('❌ İstatistik yüklenemedi:', error)
    }
  }

  // İstatistikler açıldığında veya filtre değiştiğinde veri çek
  useEffect(() => {
    if (showStatistics && selectedRestaurantId) {
      fetchStatisticsData()
    }
  }, [showStatistics, statisticsFilter, selectedRestaurantId])

  // Build-safe mount kontrolü

  // ÇELİK GİBİ OTURUM KONTROLÜ - SAYFA YENİLENDİĞİNDE DIŞARI ATMA!
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMounted) return

    setIsCheckingAuth(true)

    try {
      const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedRestaurantId = localStorage.getItem(LOGIN_RESTAURANT_ID_KEY)

      // Restoran oturumu varsa BURADA KAL!
      if (loggedIn === 'true' && loggedRestaurantId) {
        setIsLoggedIn(true)
        setSelectedRestaurantId(loggedRestaurantId)

        // Oturum bilgileri set edildikten sonra restoranları çek
        fetchRestaurants()
      } else {
        setIsLoggedIn(false)
      }
    } catch (error) {
      console.error('Oturum kontrolü hatası:', error)
      setIsLoggedIn(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }, [isMounted])

  // Restoranları çek
  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, password, logo_url, maps_link, delivery_fee')
        .order('name', { ascending: true })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error: any) {
      // Tüm hataları sessizce geç - ilk yükleme sırasında kullanıcıyı rahatsız etme
      const errorMsg = error.message?.toLowerCase() || ''
      console.warn('⚠️ Restoranlar yüklenirken hata (sessiz):', error.message)

      // Sessizce tekrar dene (retry) - 2 saniye sonra
      setTimeout(() => {
        fetchRestaurants()
      }, 2000)
    }
  }

  // Müşteri Memnuniyeti - Google Maps'e yönlendir
  const handleCustomerSatisfaction = () => {
    const restaurant = restaurants.find(r => String(r.id) === String(selectedRestaurantId))

    if (!restaurant?.maps_link) {
      setErrorMessage('Google Haritalar linkiniz henüz sisteme tanımlanmamıştır.')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    // Yeni sekmede aç
    window.open(restaurant.maps_link, '_blank')
  }

  // Restoran paketlerini çek
  const fetchPackages = async () => {
    if (!selectedRestaurantId) return

    try {
      let query = supabase
        .from('packages')
        .select('*, restaurants(name), couriers(full_name)')
        .eq('restaurant_id', selectedRestaurantId)

      // Tarih filtresine göre sorgu ekle
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate = new Date()

        if (dateFilter === 'today') {
          // Bugün (gece 00:00'dan itibaren)
          startDate.setHours(0, 0, 0, 0)
        } else if (dateFilter === 'week') {
          // Son 7 gün
          startDate.setDate(now.getDate() - 7)
        } else if (dateFilter === 'month') {
          // Son 30 gün
          startDate.setDate(now.getDate() - 30)
        }

        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants,
        courier_name: pkg.couriers?.full_name
      }))
      setPackages(transformed)
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return // Eski veriler ekranda kalsın
      }

      console.error('Paketler yüklenirken hata:', error.message)
    }
  }

  // Login işlemi - Veritabanı sorgusu
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window === 'undefined') return

    setErrorMessage('')

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, password, logo_url, maps_link, delivery_fee')
        .eq('name', loginForm.username)
        .single()

      if (error) {
        setErrorMessage('Restoran bulunamadı!')
        return
      }

      if (data && data.password === loginForm.password) {
        // Sadece restoran oturumunu başlat, diğerlerine dokunma
        localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
        localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, data.id)
        setIsLoggedIn(true)
        setSelectedRestaurantId(data.id)

        // Restoran bilgilerini state'e ekle (logo için)
        setRestaurants([data])
      } else {
        setErrorMessage('Hatalı şifre!')
      }
    } catch (error: any) {
      setErrorMessage('Giriş yapılırken hata oluştu')
    }
  }

  // Sayfa yüklendiğinde restoranları çek - KALDIRILDI (auth useEffect'te çağrılıyor)
  // useEffect(() => {
  //   fetchRestaurants()
  // }, [])

  // REALTIME ONLY - Canlı yayın modu
  useEffect(() => {
    if (isLoggedIn && selectedRestaurantId) {
      // İlk yükleme
      fetchPackages()

      console.log('🔴 Restoran Realtime dinleme başlatıldı - Canlı yayın modu aktif')
      console.log('📍 Dinlenen restoran ID:', selectedRestaurantId)

      // Realtime callback fonksiyonu - her zaman güncel state'e erişmek için burada tanımla
      const handlePackageChange = async (payload: any) => {
        console.log('📦 Paket değişikliği algılandı:', payload.eventType, 'ID:', payload.new?.id || payload.old?.id)

        // Sadece bu restorana ait değişiklikleri işle (ekstra güvenlik)
        const packageRestaurantId = payload.new?.restaurant_id || payload.old?.restaurant_id
        if (packageRestaurantId && String(packageRestaurantId) !== String(selectedRestaurantId)) {
          console.warn('⚠️ Başka restoranın paketi, atlanıyor:', packageRestaurantId)
          return
        }

        // State'i güncelle - sayfa yenileme YOK!
        await fetchPackages()
        console.log('✅ Restoran state güncellendi (packages)')
      }

      // Benzersiz kanal ismi - packages-follow-{restaurant_id}-{timestamp}
      const channelName = `packages-follow-${selectedRestaurantId}-${Date.now()}`

      // Restoran paketlerini dinle (sadece bu restoranın paketleri)
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: true }
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT', // Yeni sipariş eklendiğinde
            schema: 'public',
            table: 'packages',
            filter: `restaurant_id=eq.${selectedRestaurantId}` // Sadece bu restoranın paketleri
          },
          handlePackageChange
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', // Sipariş güncellendiğinde (kurye atandı, durum değişti)
            schema: 'public',
            table: 'packages',
            filter: `restaurant_id=eq.${selectedRestaurantId}` // Sadece bu restoranın paketleri
          },
          handlePackageChange
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Restoran Realtime bağlantısı kuruldu')
            console.log('📡 Kanal:', channelName)
            console.log('📍 Filtreleme: restaurant_id =', selectedRestaurantId)
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime bağlantı hatası:', err)
            console.error('💡 Çözüm: Supabase Dashboard > Database > Replication > packages tablosunu işaretleyin')
            setTimeout(() => {
              console.log('🔄 Realtime yeniden bağlanıyor...')
              channel.subscribe()
            }, 5000)
          }
          if (status === 'TIMED_OUT') {
            console.warn('⏱️ Realtime zaman aşımı, yeniden bağlanıyor...')
            setTimeout(() => {
              channel.subscribe()
            }, 5000)
          }
        })

      return () => {
        console.log('🔴 Restoran Realtime dinleme durduruldu')
        console.log('📡 Kanal kapatılıyor:', channelName)
        supabase.removeChannel(channel)
      }
    }
  }, [isLoggedIn, selectedRestaurantId, dateFilter])

  // Restoran seçimini değiştir ve LocalStorage'a kaydet
  const handleRestaurantChange = (restaurantId: string) => {
    const id = restaurantId || null
    setSelectedRestaurantId(id)
    if (id && typeof window !== 'undefined') {
      localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, id)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Hata mesajlarını temizle
    if (errorMessage) setErrorMessage('')
    if (successMessage) setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      // Validasyon
      if (!formData.customerName.trim()) {
        throw new Error('Müşteri adı gereklidir')
      }
      if (!formData.customerPhone.trim()) {
        throw new Error('Müşteri numarası gereklidir')
      }
      if (!formData.content.trim()) {
        throw new Error('Paket içeriği gereklidir')
      }
      if (!formData.deliveryAddress.trim()) {
        throw new Error('Teslimat adresi gereklidir')
      }
      if (!formData.packageAmount.trim() || parseFloat(formData.packageAmount) < 0) {
        throw new Error('Geçerli bir paket tutarı giriniz')
      }
      if (!selectedRestaurantId) {
        throw new Error('Restoran bilgisi bulunamadı')
      }
      if (!paymentMethod) {
        throw new Error('Lütfen ödeme tercihi seçiniz')
      }

      // Supabase'e kayıt - order_number SQL trigger tarafından otomatik üretilecek
      const packageData: any = {
        customer_name: formData.customerName.trim(),
        customer_phone: formData.customerPhone.trim(),
        content: formData.content.trim(),
        delivery_address: formData.deliveryAddress.trim(),
        amount: parseFloat(formData.packageAmount),
        status: 'waiting',
        restaurant_id: selectedRestaurantId,
        payment_method: paymentMethod
      }

      // Koordinatlar varsa ekle (Mergen Agent'tan gelmişse)
      if (coordinates.latitude !== null && coordinates.longitude !== null) {
        packageData.latitude = coordinates.latitude
        packageData.longitude = coordinates.longitude
        console.log('📍 Koordinatlar veritabanına kaydediliyor:', coordinates)
      }

      const { data, error } = await supabase
        .from('packages')
        .insert([packageData])
        .select()

      if (error) {
        console.error('Sipariş kayıt hatası:', error)
        throw error
      }

      console.log('Sipariş başarıyla kaydedildi:', data)

      // Başarı mesajı göster
      setSuccessMessage('Sipariş başarıyla kaydedildi!')

      // Formu temizle
      setFormData({
        customerName: '',
        customerPhone: '',
        deliveryAddress: '',
        packageAmount: '',
        content: ''
      })
      setPaymentMethod(null)
      setCoordinates({
        latitude: null,
        longitude: null
      })

      // Paketleri yenile
      fetchPackages()

      // Başarı mesajını 3 saniye sonra temizle
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)

    } catch (error: any) {
      setErrorMessage(error.message || 'Sipariş kaydedilirken bir hata oluştu')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  // SİPARİŞ İPTAL FONKSİYONU (Restoran)
  const handleCancelOrder = async (packageId: number, packageInfo: string) => {
    const confirmed = window.confirm(
      `⚠️ Bu siparişi iptal etmek istediğinizden emin misiniz?\n\n${packageInfo}\n\nBu işlem geri alınamaz!`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'restaurant',
          cancellation_reason: 'Restoran tarafından iptal edildi',
          courier_id: null // Kuryeden düşür
        })
        .eq('id', packageId)

      if (error) throw error

      setSuccessMessage('✅ Sipariş İptal Edildi')
      setTimeout(() => setSuccessMessage(''), 2000)

      // Paketleri yenile
      fetchPackages()

    } catch (error: any) {
      console.error('Sipariş iptal hatası:', error)
      setErrorMessage('❌ İptal Hatası: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId)

  // RENDER BLOKLAMA - Oturum kontrolü tamamlanmadan hiçbir şey gösterme!
  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-sm">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Giriş ekranı
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-48 h-48 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              Restoran Girişi
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Restoran Adı"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                required
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Şifre"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Giriş Yap
            </button>

            {errorMessage && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm text-center">{errorMessage}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen py-6 px-4 ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      {/* Hamburger Menü - Sol Üst */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="fixed top-4 left-4 z-50 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg shadow-lg transition-colors"
      >
        <div className="space-y-1.5">
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
        </div>
      </button>

      {/* Açılır Menü */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMenu(false)}
          ></div>

          <div className="fixed top-0 left-0 h-full w-64 bg-slate-900 shadow-2xl z-50 overflow-y-auto admin-scrollbar">
            <div className="p-6">
              <div className="mb-8 text-center -mt-4">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-36 h-36 mx-auto mb-3"
                />
                <h2 className="text-xl font-bold text-white">Restoran Panel</h2>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => {
                    setShowStatistics(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg font-medium transition-all text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <span className="mr-3">📊</span>
                  Paketlerim ve Cirom
                </button>
                <button
                  onClick={() => {
                    setShowDebt(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg font-medium transition-all text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <span className="mr-3">💳</span>
                  Paket Ücretim
                </button>

                <button
                  onClick={() => {
                    handleCustomerSatisfaction()
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg font-medium transition-all text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <span className="mr-3">⭐</span>
                  Müşteri Memnuniyeti
                </button>
              </nav>

              <button
                onClick={() => {
                  localStorage.removeItem(LOGIN_STORAGE_KEY);
                  localStorage.removeItem(LOGIN_RESTAURANT_ID_KEY);
                  window.location.href = '/restoran';
                }}
                className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                ← Çıkış
              </button>
            </div>
          </div>
        </>
      )}

      {/* Logo - Sağ Üst */}
      <div className="fixed -top-10 right-4 z-50 flex items-center gap-3">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Logo"
          className="w-36 h-36"
        />
      </div>

      {/* Dark Mode Toggle - SAĞ ALT KÖŞE */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed bottom-6 right-6 p-2 rounded-full shadow-xl transition-all hover:scale-110 border ${
          darkMode 
            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' 
            : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300'
        }`}
        style={{ zIndex: 99999 }}
        title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
      >
        <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
      </button>

      {/* İSTATİSTİKLER MODAL */}
      {showStatistics && (
        <div className="fixed inset-0 bg-black/80 z-50 p-4 overflow-y-auto flex items-center justify-center">
          <div className="max-w-4xl w-full bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">📊 Paketlerim ve Cirom</h2>
              <button
                onClick={() => setShowStatistics(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Sekmeler */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setStatisticsTab('packages')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${statisticsTab === 'packages'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                📦 Paket Sayıları
              </button>
              <button
                onClick={() => setStatisticsTab('revenue')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${statisticsTab === 'revenue'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                💰 Ciro Analizi
              </button>
            </div>

            {/* Görünüm Butonları */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setStatisticsFilter('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statisticsFilter === 'daily'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                Günlük (Son 30 Gün)
              </button>
              <button
                onClick={() => setStatisticsFilter('weekly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statisticsFilter === 'weekly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                Haftalık (Son 12 Hafta)
              </button>
              <button
                onClick={() => setStatisticsFilter('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statisticsFilter === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                Aylık (Son 12 Ay)
              </button>
            </div>

            {/* Grafik */}
            <div className="bg-slate-800/50 rounded-lg p-4" style={{ height: '400px' }}>
              {statisticsData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Seçilen dönemde veri bulunamadı
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statisticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    {statisticsTab === 'packages' ? (
                      <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        name="Paket Sayısı"
                        radius={[8, 8, 0, 0]}
                      />
                    ) : (
                      <Bar
                        dataKey="revenue"
                        fill="#10b981"
                        name="Gerçekleşen Ciro (₺)"
                        radius={[8, 8, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAKET ÜCRETİM (BORÇ) MODAL */}
      {showDebt && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="max-w-4xl w-full bg-slate-900 rounded-xl p-6 border border-slate-800 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">💳 Paket Ücretim (Borç Durumu)</h2>
              <button
                onClick={() => setShowDebt(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tarih Filtresi */}
            <div className="flex justify-end mb-6">
              <select
                value={debtFilter}
                onChange={(e) => setDebtFilter(e.target.value as 'today' | 'week' | 'month' | 'all')}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none font-medium"
              >
                <option value="today">📅 Bugün</option>
                <option value="week">📅 Haftalık (7 Gün)</option>
                <option value="month">📅 Aylık (30 Gün)</option>
                <option value="all">📅 Tüm Zamanlar</option>
              </select>
            </div>

            {/* Borç Hesaplama */}
            {(() => {
              const getStartDate = () => {
                const now = new Date()
                const start = new Date()

                if (debtFilter === 'today') {
                  start.setHours(0, 0, 0, 0)
                } else if (debtFilter === 'week') {
                  start.setDate(now.getDate() - 7)
                } else if (debtFilter === 'month') {
                  start.setDate(now.getDate() - 30)
                } else if (debtFilter === 'all') {
                  // Tüm zamanlar için çok eski bir tarih
                  start.setFullYear(2000, 0, 1)
                }

                return start
              }

              const startDate = getStartDate()

              // Seçilen tarih aralığındaki delivered paketleri say
              const deliveredPackages = packages.filter(pkg =>
                pkg.status === 'delivered' &&
                pkg.delivered_at &&
                new Date(pkg.delivered_at) >= startDate
              )

              const deliveredCount = deliveredPackages.length
              const deliveryFee = selectedRestaurant?.delivery_fee || 100
              const totalDebt = deliveredCount * deliveryFee

              return (
                <>
                  {/* Genel Özet */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-300">
                      <div className="text-center">
                        <div className="text-4xl font-black text-red-700">
                          {totalDebt.toFixed(2)} ₺
                        </div>
                        <div className="text-sm font-semibold text-red-600 mt-2">
                          💳 TOPLAM BORÇ
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-300">
                      <div className="text-center">
                        <div className="text-4xl font-black text-blue-700">
                          {deliveredCount}
                        </div>
                        <div className="text-sm font-semibold text-blue-600 mt-2">
                          📦 TESLİM EDİLEN PAKET
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-300">
                      <div className="text-center">
                        <div className="text-4xl font-black text-purple-700">
                          {deliveryFee} ₺
                        </div>
                        <div className="text-sm font-semibold text-purple-600 mt-2">
                          💰 PAKET BAŞI ÜCRET
                        </div>
                        {!selectedRestaurant?.delivery_fee && (
                          <div className="text-xs text-purple-500 mt-1">
                            (Varsayılan)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hesaplama Detayı */}
                  <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4">📊 Hesaplama Detayı</h3>
                    <div className="space-y-3 text-slate-300">
                      <div className="flex justify-between items-center">
                        <span>Teslim Edilen Paket Sayısı:</span>
                        <span className="font-bold text-blue-400">{deliveredCount} adet</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Paket Başı Ücret:</span>
                        <span className="font-bold text-purple-400">{deliveryFee} ₺</span>
                      </div>
                      <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                        <span className="text-lg font-bold">Toplam Borç:</span>
                        <span className="text-2xl font-black text-red-400">{deliveredCount} × {deliveryFee}₺ = {totalDebt.toFixed(2)} ₺</span>
                      </div>
                    </div>
                  </div>

                  {/* Paket Listesi */}
                  {deliveredPackages.length > 0 && (
                    <div className="bg-slate-800/50 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-white mb-4">📋 Teslim Edilen Paketler</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {deliveredPackages.map((pkg, index) => (
                          <div key={pkg.id} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-slate-400">#{index + 1}</span>
                                  <span className="text-sm font-medium text-white">{pkg.customer_name}</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                  📅 {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                  {' • '}
                                  💵 {pkg.amount}₺
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-red-400">{deliveryFee} ₺</div>
                                <p className="text-xs text-slate-500">ücret</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bilgilendirme */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      ℹ️ <strong>Not:</strong> Paket ücretleri, teslim edilen her paket için {deliveryFee}₺ {!selectedRestaurant?.delivery_fee && '(varsayılan) '}üzerinden hesaplanmaktadır.
                      Sadece <strong>status = 'delivered'</strong> olan paketler hesaplamaya dahildir.
                      {!selectedRestaurant?.delivery_fee && ' Özel ücret tanımlaması için lütfen yöneticinizle iletişime geçin.'}
                    </p>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* SOL PANEL - YENİ SİPARİŞ FORMU */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            {/* Hero Section - Dükkana Özel Logo ve Başlık */}
            <div className="flex flex-col items-center mb-6">
              {/* Dinamik Restoran Logosu */}
              {selectedRestaurant && (
                <div className="mb-4">
                  <img
                    src={selectedRestaurant.logo_url || '/logo.png'}
                    alt={selectedRestaurant.name}
                    className="h-24 w-auto mx-auto"
                    onError={(e) => {
                      // Logo yüklenemezse varsayılan Mergen logosunu göster
                      const target = e.target as HTMLImageElement;
                      target.src = '/logo.png';
                    }}
                  />
                </div>
              )}

              {/* Restoran İsmi */}
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                {selectedRestaurant?.name || 'RESTORAN PANELİ'}
              </h1>

              {/* Alt Başlık */}
              <p className="text-sm text-slate-400 mt-1">
                Yeni Sipariş Kayıt Ekranı
              </p>
            </div>

            {/* Başarı Mesajı */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Hata Mesajı */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Müşteri Adı */}
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-300 mb-1">
                  Müşteri Adı <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                  placeholder="Ahmet Yılmaz"
                  disabled={isSubmitting}
                />
              </div>

              {/* Müşteri Numarası */}
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-slate-300 mb-1">
                  Müşteri Numarası <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                  placeholder="05XX-XXX-XX-XX"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Lütfen numarayı 05XX-XXX-XX-XX şeklinde giriniz
                </p>
              </div>

              {/* Paket İçeriği */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-1">
                  Paket İçeriği <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors resize-none"
                  placeholder="2x Döner, 1x Ayran"
                  disabled={isSubmitting}
                />
              </div>

              {/* Teslimat Adresi */}
              <div>
                <label htmlFor="deliveryAddress" className="block text-sm font-medium text-slate-300 mb-1">
                  Teslimat Adresi <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors resize-none"
                  placeholder="Atatürk Mah. İnönü Cad. No:123"
                  disabled={isSubmitting}
                />
              </div>

              {/* Paket Tutarı */}
              <div>
                <label htmlFor="packageAmount" className="block text-sm font-medium text-slate-300 mb-1">
                  Tutar (₺) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  id="packageAmount"
                  name="packageAmount"
                  value={formData.packageAmount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>

              {/* Müşteri Ödeme Tercihi */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ödeme Tercihi <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    disabled={isSubmitting}
                    className={`py-2.5 rounded-lg border font-medium transition-colors ${paymentMethod === 'cash'
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Nakit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    disabled={isSubmitting}
                    className={`py-2.5 rounded-lg border font-medium transition-colors ${paymentMethod === 'card'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Kart
                  </button>
                </div>
              </div>

              {/* Submit Butonu */}
              <button
                type="submit"
                disabled={isSubmitting || !paymentMethod}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  'Sipariş Kaydet'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* SAĞ PANEL - SİPARİŞ LİSTESİ */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Başlık ve Filtre */}
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Verilen Siparişler</h2>
                <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">
                  {packages.filter(pkg => {
                    if (statusFilter === 'delivered') return pkg.status === 'delivered'
                    if (statusFilter === 'cancelled') return pkg.status === 'cancelled'
                    return true
                  }).length}
                </span>
                
                {/* Durum Filtreleme Butonları */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setStatusFilter('delivered')}
                    className={`text-xs px-2 py-1 rounded font-medium transition-all ${
                      statusFilter === 'delivered'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    ✅ Teslim
                  </button>
                  <button
                    onClick={() => setStatusFilter('cancelled')}
                    className={`text-xs px-2 py-1 rounded font-medium transition-all ${
                      statusFilter === 'cancelled'
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    🚫 İptal
                  </button>
                  {statusFilter !== 'all' && (
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      title="Filtreyi Temizle"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 focus:border-orange-500 outline-none"
              >
                <option value="today">Bugün</option>
                <option value="week">7 Gün</option>
                <option value="month">30 Gün</option>
                <option value="all">Tümü</option>
              </select>
            </div>

            {/* Kompakt Liste - Tam Boy Scroll */}
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
              {packages.filter(pkg => {
                if (statusFilter === 'delivered') return pkg.status === 'delivered'
                if (statusFilter === 'cancelled') return pkg.status === 'cancelled'
                return true
              }).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-sm">
                    {statusFilter === 'delivered' 
                      ? 'Teslim edilen sipariş yok'
                      : statusFilter === 'cancelled'
                        ? 'İptal edilen sipariş yok'
                        : 'Sipariş yok'
                    }
                  </p>
                </div>
              ) : (
                packages.filter(pkg => {
                  if (statusFilter === 'delivered') return pkg.status === 'delivered'
                  if (statusFilter === 'cancelled') return pkg.status === 'cancelled'
                  return true
                }).map(pkg => (
                  <div key={pkg.id} className="relative bg-slate-800/50 p-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors mb-2">

                    {/* 3 Nokta Menüsü - SOL ÜST */}
                    <div className="absolute top-2 left-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)
                        }}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Menü"
                      >
                        <span className="text-slate-400 text-sm">⋮</span>
                      </button>

                      {openDropdownId === pkg.id && (
                        <div className="absolute left-0 top-8 bg-slate-700 rounded-lg shadow-xl border border-slate-600 py-1 min-w-[160px] z-20">
                          {pkg.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setOpenDropdownId(null)
                                handleCancelOrder(
                                  pkg.id,
                                  `Sipariş: ${pkg.order_number || pkg.id}\nMüşteri: ${pkg.customer_name}\nTutar: ${pkg.amount}₺`
                                )
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
                            >
                              <span>🚫</span>
                              <span>Siparişi İptal Et</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1 ml-6">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                            {pkg.order_number || 'Hazırlanıyor...'}
                          </span>
                          {pkg.platform && (
                            <span className={`text-xs py-0.5 px-1.5 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                              {getPlatformDisplayName(pkg.platform)}
                            </span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            pkg.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            pkg.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                            pkg.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                            pkg.status === 'picking_up' ? 'bg-orange-500/20 text-orange-400' :
                            pkg.status === 'on_the_way' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-green-500/20 text-green-400'
                            }`}>
                            {pkg.status === 'cancelled' ? '🚫 İptal Edildi' :
                             pkg.status === 'waiting' ? 'Bekliyor' :
                             pkg.status === 'assigned' ? 'Atandı' :
                             pkg.status === 'picking_up' ? 'Alınıyor' :
                             pkg.status === 'on_the_way' ? 'Yolda' : 'Teslim'}
                          </span>
                        </div>

                        {/* Kurye Bilgisi - Kompakt */}
                        {pkg.courier_id && (
                          <div className="mb-1">
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-indigo-500/20 text-indigo-400 inline-flex items-center gap-1">
                              🚴 {pkg.courier_name || 'Kurye'}
                            </span>
                          </div>
                        )}

                        <h3 className="font-medium text-sm text-white">{pkg.customer_name}</h3>
                        {pkg.customer_phone && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            📞 {pkg.customer_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tarih ve Saat Bilgileri - Kompakt */}
                    <div className="bg-slate-900/50 p-1.5 rounded mb-1.5 space-y-0.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">📅 Sipariş:</span>
                        <span className="text-slate-300 font-medium">{formatDateTime(pkg.created_at)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">🕐 Giriş:</span>
                        <span className="text-blue-400 font-medium">{formatTime(pkg.created_at)}</span>
                      </div>
                      {pkg.delivered_at && pkg.status === 'delivered' && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">✅ Teslim:</span>
                          <span className="text-green-400 font-medium">{formatTime(pkg.delivered_at)}</span>
                        </div>
                      )}
                      {pkg.cancelled_at && pkg.status === 'cancelled' && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">🚫 İptal:</span>
                          <span className="text-red-400 font-medium">{formatTime(pkg.cancelled_at)}</span>
                        </div>
                      )}
                    </div>

                    {pkg.content && (
                      <p className="text-xs text-slate-400 mb-1.5">
                        📦 {pkg.content}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 mb-1.5 line-clamp-1">
                      📍 {pkg.delivery_address}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-400 text-sm">
                        {pkg.amount}₺
                      </span>
                      <span className="text-xs text-slate-500">
                        {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}