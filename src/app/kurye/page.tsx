/**
 * @file src/app/kurye/page.tsx
 * @description Kurye Arayüzü Uygulaması.
 * Kuryelerin kendilerine atanan paketleri gördüğü, teslimat süreçlerini 
 * (yola çıktı, teslim edildi vb.) yönettiği ve günlük performanslarını 
 * takip ettiği ana mobil uyumlu arayüzdür. Sesli komut desteği ve 
 * anlık bildirim özelliklerini içerir.
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { App } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import { supabase } from '../lib/supabase'
import { getPlatformBadgeClass, getPlatformDisplayName } from '../lib/platformUtils'
import { CourierEarningsStats } from '@/components/CourierEarningsStats'
import { CourierNotificationWrapper } from '@/components/notifications/CourierNotificationWrapper'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// ============================================
// SAMSUN OPERASYON BÖLGESI TANIMLARI
// ============================================
const OPERATION_BOUNDS = {
  minLat: 41.20,  // Samsun güney sınırı
  maxLat: 41.60,  // Samsun kuzey sınırı
  minLng: 35.90,  // Samsun batı sınırı
  maxLng: 36.40   // Samsun doğu sınırı
}

const OPERATION_CENTER = {
  lat: 41.494714153011856,
  lng: 36.07827997146362
}

// Geliştirme ortamı kontrolü
const isDevelopment = process.env.NODE_ENV === 'development'

interface Package {
  id: number
  order_number?: string
  customer_name: string
  customer_phone?: string
  delivery_address: string
  amount: number
  status: 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card' | 'iban' | null
  platform?: string
  created_at?: string
  assigned_at?: string
  accepted_at?: string
  picked_up_at?: string
  delivered_at?: string
  latitude?: number | null
  longitude?: number | null
  restaurant?: {
    name: string
    phone?: string
    address?: string
  }
  cancelled_at?: string | null
  cancelled_by?: 'admin' | 'restaurant' | null
  cancellation_reason?: string | null
}

interface CourierLeaderboard {
  id: string
  full_name: string
  todayDeliveryCount: number
}

const LOGIN_STORAGE_KEY = 'kurye_logged_in'
const LOGIN_COURIER_ID_KEY = 'kurye_logged_courier_id'

export default function KuryePage() {
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [deliveredCount, setDeliveredCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState<Set<number>>(new Set())
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<{ [key: number]: 'cash' | 'card' | 'iban' }>({})
  const [showIbanModal, setShowIbanModal] = useState(false)
  const [ibanPackageId, setIbanPackageId] = useState<number | null>(null)
  const [ibanPackageAmount, setIbanPackageAmount] = useState<number>(0)
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
  const [activeTab, setActiveTab] = useState<'packages' | 'history' | 'earnings' | 'account'>('packages') // Aktif sekme
  const [courierName, setCourierName] = useState<string>('Kurye') // Giriş yapan kuryenin ismi
  const [todayDeliveredPackages, setTodayDeliveredPackages] = useState<Package[]>([]) // Bugünkü teslim edilenler
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]) // Filtrelenmiş paketler
  const [currentPage, setCurrentPage] = useState(1) // Mevcut sayfa
  const [totalPages, setTotalPages] = useState(1) // Toplam sayfa sayısı
  const [unsettledAmount, setUnsettledAmount] = useState(0) // Verilecek hesap (admin'den)
  const ITEMS_PER_PAGE = 30 // Sayfa başına öğe sayısı

  // Şifre değiştirme modal state'leri
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [historyEndDate, setHistoryEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // SESLİ KOMUT STATE'LERİ
  const [isListening, setIsListening] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState('')
  const [recognition, setRecognition] = useState<any>(null)
  const [showVoiceHelp, setShowVoiceHelp] = useState(false) // Sesli komut yardım pop-up'ı
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Timeout referansı

  // SCROLL POZİSYONU KORUMA
  const scrollPositionRef = useRef<{ [key: string]: number }>({})

  // PACKAGES REF - Sesli komutlar için güncel state
  const packagesRef = useRef<Package[]>([])

  // SAYISAL ETİKETLEME (SLOT SYSTEM) - SABİT NUMARALANDIRMA
  const [packageSlots, setPackageSlots] = useState<{ [key: number]: number }>({}) // packageId -> slotNumber

  // ============================================
  // PUSH NOTIFICATIONS HOOK
  // ============================================
  // Native Push Notifications (FCM) - Cihaz token'ını alır ve veritabanına kaydeder
  const pushNotifications = usePushNotifications({
    courierId: selectedCourierId,
    isLoggedIn: isLoggedIn
  })

  // ============================================
  // ŞİFRE DEĞİŞTİRME FONKSİYONU
  // ============================================
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    // Validasyon
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor!')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır!')
      return
    }

    if (!passwordForm.oldPassword) {
      setPasswordError('Eski şifrenizi girin!')
      return
    }

    setPasswordUpdating(true)

    try {
      // Önce mevcut kullanıcının email'ini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setPasswordError('Kullanıcı bilgileri alınamadı!')
        return
      }

      // Eski şifreyi doğrula
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.oldPassword
      })

      if (signInError) {
        setPasswordError('Eski şifre hatalı!')
        return
      }

      // Şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (updateError) {
        setPasswordError('Şifre güncellenemedi: ' + updateError.message)
        return
      }

      // Başarılı
      setSuccessMessage('Şifreniz başarıyla güncellendi!')
      setShowPasswordModal(false)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      
      // Success mesajını 3 saniye sonra temizle
      setTimeout(() => setSuccessMessage(''), 3000)

    } catch (error: any) {
      console.error('Şifre güncelleme hatası:', error)
      setPasswordError('Şifre güncellenemedi: ' + error.message)
    } finally {
      setPasswordUpdating(false)
    }
  }

  // Packages değiştiğinde ref'i güncelle
  useEffect(() => {
    packagesRef.current = packages
  }, [packages])

  // Paketlere SABİT slot numarası ata (en küçük boş numarayı doldur)
  useEffect(() => {
    if (packages.length === 0) {
      setPackageSlots({})
      return
    }

    setPackageSlots(prevSlots => {
      const newSlots: { [key: number]: number } = {}
      const currentPackageIds = packages.map(p => p.id)

      // Mevcut paketlerin slot'larını koru (SABİT KALSIN)
      currentPackageIds.forEach(pkgId => {
        if (prevSlots[pkgId]) {
          newSlots[pkgId] = prevSlots[pkgId]
        }
      })

      // Yeni paketler için en küçük boş slot'u bul ve ata
      currentPackageIds.forEach(pkgId => {
        if (!newSlots[pkgId]) {
          const usedSlots = Object.values(newSlots)
          // En küçük boş numarayı bul (1-10 arası)
          for (let i = 1; i <= 10; i++) {
            if (!usedSlots.includes(i)) {
              newSlots[pkgId] = i
              break
            }
          }
        }
      })

      return newSlots
    })
  }, [packages.map(p => p.id).sort().join(',')])

  // Sesli komut yardım pop-up'ı - SADECE DİNLEME MODUNDA 10 saniye sonra göster
  useEffect(() => {
    if (!isMounted || !isLoggedIn || !isListening) {
      return
    }

    const timer = setTimeout(() => {
      setShowVoiceHelp(true)
    }, 10000) // 10 saniye

    return () => clearTimeout(timer)
  }, [isMounted, isLoggedIn, isListening])

  // Build-safe mount kontrolü
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Android Back Button Handler - Tab-Aware
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    let backButtonListener: any

    const setupBackButton = async () => {
      try {
        // Android back button'a basıldığında
        backButtonListener = await App.addListener('backButton', () => {
          // Eğer ana sekme (packages) dışındaysa, önce ana sekmeye dön
          if (activeTab !== 'packages') {
            setActiveTab('packages')
          } else {
            // Ana sekmedeyse uygulamayı minimize et (Login'e dönme!)
            App.minimizeApp()
          }
        })
      } catch (error) {
        console.log('Back button listener eklenemedi (web ortamı olabilir):', error)
      }
    }

    setupBackButton()

    return () => {
      // Cleanup
      if (backButtonListener) {
        backButtonListener.remove()
      }
    }
  }, [isMounted, activeTab])


  // ÇELİK GİBİ OTURUM KONTROLÜ - SAYFA YENİLENDİĞİNDE DIŞARI ATMA!
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMounted) return

    setIsCheckingAuth(true)

    const checkSession = async () => {
      try {
        // Önce Capacitor Preferences'tan kontrol et (Native storage - silinmez)
        const { value: savedCourierId } = await Preferences.get({ key: LOGIN_COURIER_ID_KEY })
        const { value: savedLoggedIn } = await Preferences.get({ key: LOGIN_STORAGE_KEY })

        if (savedLoggedIn === 'true' && savedCourierId) {
          console.log('✅ Capacitor Preferences\'tan oturum bulundu:', savedCourierId)
          setIsLoggedIn(true)
          setSelectedCourierId(savedCourierId)
          setIsCheckingAuth(false)
          return
        }

        // Capacitor'da yoksa Supabase session kontrolü yap
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session && session.user) {
          // Aktif session var, courier_id'yi al
          const courierId = session.user.id
          setIsLoggedIn(true)
          setSelectedCourierId(courierId)
          
          // Capacitor Preferences'a kaydet (kalıcı)
          await Preferences.set({ key: LOGIN_STORAGE_KEY, value: 'true' })
          await Preferences.set({ key: LOGIN_COURIER_ID_KEY, value: courierId })
          
          // localStorage'a da kaydet (web uyumluluğu için)
          localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
          localStorage.setItem(LOGIN_COURIER_ID_KEY, courierId)
        } else {
          // Session yok, localStorage kontrolü yap (fallback - web için)
          const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
          const loggedCourierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)

          if (loggedIn === 'true' && loggedCourierId) {
            setIsLoggedIn(true)
            setSelectedCourierId(loggedCourierId)
            
            // Capacitor Preferences'a da kaydet
            await Preferences.set({ key: LOGIN_STORAGE_KEY, value: 'true' })
            await Preferences.set({ key: LOGIN_COURIER_ID_KEY, value: loggedCourierId })
          } else {
            setIsLoggedIn(false)
          }
        }
      } catch (error) {
        console.error('Session kontrolü hatası:', error)
        
        // Hata durumunda localStorage fallback
        const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
        const loggedCourierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)

        if (loggedIn === 'true' && loggedCourierId) {
          setIsLoggedIn(true)
          setSelectedCourierId(loggedCourierId)
        } else {
          setIsLoggedIn(false)
        }
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkSession()
  }, [isMounted])

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
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return // Eski veriler ekranda kalsın
      }

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
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('packages')
        .select('amount, payment_method, status')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString())

      if (error) throw error

      if (data) {
        setDeliveredCount(data.length)
        setCashTotal(data.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0))
        setCardTotal(data.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + (p.amount || 0), 0))
      }
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }

      console.error('❌ İstatistik yüklenemedi:', error)
      setErrorMessage('İstatistikler yüklenemedi: ' + error.message)
    }
  }

  // Bugünkü teslim edilen paketleri çek
  const fetchTodayDeliveredPackages = async () => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name, phone, address)')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString())
        .order('delivered_at', { ascending: false })

      if (error) throw error

      console.log('📦 Bugün teslim edilen paketler:', data?.length || 0)

      const transformed = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants
      }))

      setTodayDeliveredPackages(transformed)
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }

      console.error('❌ Geçmiş paketler yüklenemedi:', error)
    }
  }

  const fetchCourierStatus = async () => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('status, is_active, full_name')
        .eq('id', courierId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setCourierStatus(data.status)
        setIs_active(data.is_active || false)
        setCourierName(data.full_name || 'Kurye')
      }
    } catch (error: any) {
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }

      console.error('❌ Kurye durumu alınamadı:', error)
      setErrorMessage('Kurye durumu alınamadı: ' + error.message)
    }
  }

  // AKILLI NAVİGASYON - Koordinat veya Adres Bazlı
  const handleOpenNavigation = (pkg: Package) => {
    console.log('🗺️ Navigasyon açılıyor:', {
      latitude: pkg.latitude,
      longitude: pkg.longitude,
      address: pkg.delivery_address
    })

    // Koordinat varsa hassas navigasyon kullan
    if (pkg.latitude && pkg.longitude) {
      const lat = pkg.latitude
      const lng = pkg.longitude

      // Cihaz tespiti
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
      const isAndroid = /android/i.test(userAgent)

      console.log('📱 Cihaz:', { isIOS, isAndroid })

      if (isIOS) {
        // iOS - Apple Maps
        const appleMapsUrl = `maps://maps.apple.com/?q=${lat},${lng}&dirflg=d`
        console.log('🍎 Apple Maps URL:', appleMapsUrl)
        window.location.href = appleMapsUrl

        // Fallback: Apple Maps açılmazsa Google Maps'e yönlendir
        setTimeout(() => {
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
          window.open(googleMapsUrl, '_blank')
        }, 1500)
      } else {
        // Android / Web - Google Maps
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        console.log('🤖 Google Maps URL:', googleMapsUrl)
        window.open(googleMapsUrl, '_blank')
      }

      console.log('✅ Koordinat bazlı navigasyon başlatıldı')
    } else {
      // Koordinat yoksa adres bazlı navigasyon
      console.warn('⚠️ Koordinat bulunamadı, adres bazlı navigasyon kullanılıyor')
      const address = encodeURIComponent(pkg.delivery_address)
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`
      console.log('🗺️ Adres bazlı Maps URL:', mapsUrl)
      window.open(mapsUrl, '_blank')
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
      // İnternet hatalarını sessizce geç
      const errorMsg = error.message?.toLowerCase() || ''
      if (errorMsg.includes('failed to fetch') || errorMsg.includes('network')) {
        console.warn('⚠️ Bağlantı hatası (sessiz):', error.message)
        return
      }

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

  // SESLİ KOMUT FONKSİYONLARI
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    // Web Speech API desteği kontrolü
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Tarayıcı ses tanıma desteklemiyor')
      return
    }

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.lang = 'tr-TR'
    recognitionInstance.continuous = false // Tek cümle sonrası otomatik dur
    recognitionInstance.interimResults = true // Cümle bitmeden algılamaya başla
    recognitionInstance.maxAlternatives = 1

    recognitionInstance.onresult = (event: any) => {
      const last = event.results.length - 1
      const result = event.results[last]

      // Final result (kesin sonuç) geldiğinde işle
      if (result.isFinal) {
        const transcript = result[0].transcript.toLowerCase()
        console.log('🎤 Final transcript:', transcript)
        setVoiceCommand(transcript)

        // Komut algılandı, hemen durdur ve işle
        recognitionInstance.abort() // Zorla durdur
        setIsListening(false)
        handleVoiceCommand(transcript)
      } else {
        // Interim result (geçici sonuç) - sadece log
        const transcript = result[0].transcript.toLowerCase()
        console.log('🎤 Interim transcript:', transcript)
        setVoiceCommand(transcript)
      }
    }

    recognitionInstance.onerror = (event: any) => {
      console.error('Ses tanıma hatası:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setErrorMessage('Mikrofon izni gerekli')
        setTimeout(() => setErrorMessage(''), 3000)
      } else if (event.error === 'aborted') {
        // Abort normal, hata değil
        console.log('🛑 Recognition aborted (normal)')
      }
    }

    recognitionInstance.onend = () => {
      console.log('🛑 Recognition ended')
      setIsListening(false)
    }

    setRecognition(recognitionInstance)

    // Media Session API - Bluetooth/Interkom kontrolleri
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('pause', () => {
        toggleVoiceRecognition()
      })
      navigator.mediaSession.setActionHandler('play', () => {
        if (isListening) {
          toggleVoiceRecognition()
        }
      })
    }

    return () => {
      if (recognitionInstance) {
        recognitionInstance.abort()
      }
    }
  }, [isMounted])

  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Önce konuşmayı durdur
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'tr-TR'
      utterance.rate = 0.9 // Daha yavaş ve anlaşılır
      utterance.pitch = 1.1 // Daha nazik ve profesyonel ton
      utterance.volume = 1.0

      // Sesleri yükle ve Türkçe kadın sesini seç
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log('🎙️ Mevcut sesler:', voices.map(v => ({ name: v.name, lang: v.lang })))

        // Türkçe kadın sesi ara (öncelik sırasına göre)
        const turkishFemaleVoice =
          voices.find(voice => voice.lang === 'tr-TR' && voice.name.includes('Filiz')) || // Google Türkçe kadın
          voices.find(voice => voice.lang === 'tr-TR' && voice.name.includes('Yelda')) || // Microsoft Türkçe kadın
          voices.find(voice => voice.lang === 'tr-TR' && voice.name.includes('Female')) ||
          voices.find(voice => voice.lang === 'tr-TR' && !voice.name.includes('Male')) ||
          voices.find(voice => voice.lang.startsWith('tr'))

        if (turkishFemaleVoice) {
          utterance.voice = turkishFemaleVoice
          console.log('🎙️ Seçilen ses:', turkishFemaleVoice.name, turkishFemaleVoice.lang)
        } else {
          console.warn('⚠️ Türkçe kadın sesi bulunamadı, varsayılan ses kullanılıyor')
        }

        window.speechSynthesis.speak(utterance)
      }

      // Sesler yüklenmişse hemen kullan, yoksa yüklenene kadar bekle
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak()
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak()
        }
      }
    }
  }

  const toggleVoiceRecognition = () => {
    if (!recognition) return

    if (isListening) {
      // Dinleme durduruluyor
      recognition.abort()
      setIsListening(false)

      // Timeout'u temizle
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current)
        voiceTimeoutRef.current = null
      }
    } else {
      // Dinleme başlatılıyor
      try {
        recognition.start()
        setIsListening(true)
        playBeep()

        // Müziği sustur (Audio Focus)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused'
        }

        // 6 saniye sonra otomatik kapat (PC için)
        voiceTimeoutRef.current = setTimeout(() => {
          if (recognition && isListening) {
            console.log('⏱️ 6 saniye timeout - otomatik kapatılıyor')
            recognition.abort()
            setIsListening(false)
            speak('Zaman aşımı')
          }
        }, 6000)

      } catch (error) {
        console.error('Ses tanıma başlatılamadı:', error)
        setErrorMessage('Mikrofon başlatılamadı')
        setTimeout(() => setErrorMessage(''), 3000)
      }
    }
  }

  const handleVoiceCommand = async (command: string) => {
    const transcript = command.toLowerCase().trim()
    console.log('🎤 SESLİ KOMUT ALINDI:', transcript)

    // Timeout'u temizle
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current)
      voiceTimeoutRef.current = null
    }

    // Komut işleme başladı - recognition'ı zorla durdur
    if (recognition && isListening) {
      recognition.stop() // Önce normal durdur
      recognition.abort() // Sonra zorla durdur
      setIsListening(false)
    }

    // Müziği tekrar başlat
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
    }

    // Sayı çıkarma - Regex ile ekleri temizle ve saf sayıyı al
    const numberWords: { [key: string]: number } = {
      'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5,
      'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10
    }

    let slotNumber: number | null = null

    // Ekleri temizle (birin -> bir, ikinin -> iki, üçü -> üç)
    const cleanedTranscript = transcript
      .replace(/([a-zğüşıöç]+)(in|ın|un|ün|i|ı|u|ü|e|a|nin|nın|nun|nün)\b/gi, '$1')

    console.log('🧹 Temizlenmiş transcript:', cleanedTranscript)

    for (const [word, num] of Object.entries(numberWords)) {
      // Kelime sınırlarını kontrol et (tam eşleşme)
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(cleanedTranscript)) {
        slotNumber = num
        console.log('� Slot numarası tespit edildi:', slotNumber)
        break
      }
    }

    // REF'ten güncel paketleri al
    const currentPackages = packagesRef.current
    console.log('📦 Ref\'ten alınan paket sayısı:', currentPackages.length)

    // SAYISAL KOMUTLAR - ID ile paket bul
    if (slotNumber) {
      console.log('📦 Aktif paketler:', currentPackages.filter(p => p.status !== 'delivered').map(p => ({ id: p.id, customer: p.customer_name, status: p.status })))

      // ID'den paketi bul
      const pkg = currentPackages.find(p => p.id === slotNumber && p.status !== 'delivered')

      console.log('📦 Bulunan paket:', pkg ? { id: pkg.id, status: pkg.status } : null)

      if (!pkg) {
        console.warn('⚠️ Paket bulunamadı, id:', slotNumber)
        speak(`${slotNumber} bulunamadı`)
        return
      }

      console.log('✅ İşlem yapılacak paket:', { id: pkg.id, customer: pkg.customer_name, status: pkg.status })

      // [Numara] kabul / onayla / tamam
      if (transcript.includes('kabul') || transcript.includes('onayla') || transcript.includes('tamam')) {
        console.log('🟢 KABUL komutu tetiklendi, packageId:', pkg.id, 'status:', pkg.status)
        if (pkg.status === 'assigned' || pkg.status === 'waiting') {
          console.log('🟢 handleAcceptPackage çağrılıyor...')
          await handleAcceptPackage(pkg.id)
          const customerName = pkg.customer_name.split(' ')[0] // İlk isim
          speak(`${slotNumber} numara kabul edildi. Yolun açık olsun ${customerName} Bey'e gidiyorsun`)
        } else {
          console.log('⚠️ Paket zaten kabul edilmiş, mevcut status:', pkg.status)
          speak('Bu paket zaten kabul edilmiş')
        }
        return
      }

      // [Numara] aldım / paket bende / teslim al
      if (transcript.includes('aldım') || transcript.includes('bende') || transcript.includes('teslim al')) {
        console.log('🟡 TESLIM AL komutu tetiklendi, packageId:', pkg.id, 'status:', pkg.status)
        if (pkg.status === 'picking_up') {
          console.log('🟡 handleUpdateStatus çağrılıyor...')
          await handleUpdateStatus(pkg.id, 'on_the_way', { picked_up_at: new Date().toISOString() })
          speak(`${slotNumber} numara alındı. Güvenli sürüşler`)
        } else {
          console.log('⚠️ Paket picking_up durumunda değil, mevcut status:', pkg.status)
          speak('Önce kabul edin')
        }
        return
      }

      // [Numara] bitti / teslim edildi / teslim / kapat (+ ödeme yöntemi)
      if (transcript.includes('bitti') || transcript.includes('teslim') || transcript.includes('kapat')) {
        console.log('🔵 TESLİM ET komutu tetiklendi, packageId:', pkg.id, 'status:', pkg.status)

        if (pkg.status !== 'on_the_way') {
          console.log('⚠️ Paket on_the_way durumunda değil, mevcut status:', pkg.status)
          speak('Önce paketi restorandan almalısınız')
          return
        }

        // Ödeme yöntemini transcript'ten algıla
        let paymentMethod = selectedPaymentMethods[pkg.id]

        if (transcript.includes('nakit') || transcript.includes('nakıt')) {
          paymentMethod = 'cash'
          setSelectedPaymentMethods(prev => ({ ...prev, [pkg.id]: 'cash' }))
          console.log('💵 Ödeme yöntemi sesli komuttan algılandı: NAKİT')
        } else if (transcript.includes('kart') || transcript.includes('kredi')) {
          paymentMethod = 'card'
          setSelectedPaymentMethods(prev => ({ ...prev, [pkg.id]: 'card' }))
          console.log('💳 Ödeme yöntemi sesli komuttan algılandı: KART')
        }

        console.log('💳 Ödeme yöntemi:', paymentMethod)
        if (!paymentMethod) {
          console.warn('⚠️ Ödeme yöntemi seçilmemiş')
          speak('Lütfen ödeme yöntemini nakit veya kart olarak belirtin. Örneğin, bir nakit teslim veya bir kart teslim diyebilirsiniz')
          setErrorMessage('Lütfen ödeme yöntemini seçin!')
          setTimeout(() => setErrorMessage(''), 3000)
          return
        }

        console.log('🔵 handleDeliver çağrılıyor...')
        await handleDeliver(pkg.id)
        const paymentText = paymentMethod === 'cash' ? 'nakit' : 'kart'
        speak(`${slotNumber} numara ${paymentText} olarak teslim edildi. Harika iş`)
        return
      }

      // [Numara] dükkan / restoran / işletme
      if (transcript.includes('dükkan') || transcript.includes('restoran') || transcript.includes('işletme')) {
        console.log('🏪 DÜKKAN ARA komutu tetiklendi')
        console.log('📞 Restoran bilgisi:', pkg.restaurant)

        if (pkg.restaurant?.phone) {
          const phoneNumber = pkg.restaurant.phone
          const restaurantName = pkg.restaurant.name
          console.log('📞 Aranacak numara:', phoneNumber)
          window.location.href = `tel:${phoneNumber}`
          speak(`${restaurantName} restoranı aranıyor`)
        } else {
          console.warn('⚠️ Restoran telefonu yok')
          speak('Restoran telefon numarası bulunamadı')
        }
        return
      }

      // [Numara] müşteri / kişi / ara
      if (transcript.includes('müşteri') || transcript.includes('kişi') || transcript.includes('ara')) {
        console.log('📞 MÜŞTERİ ARA komutu tetiklendi')
        console.log('📞 Müşteri telefonu:', pkg.customer_phone)

        if (pkg.customer_phone) {
          const customerName = pkg.customer_name.split(' ')[0]
          console.log('📞 Aranacak numara:', pkg.customer_phone)
          window.location.href = `tel:${pkg.customer_phone}`
          speak(`${customerName} Bey aranıyor`)
        } else {
          console.warn('⚠️ Müşteri telefonu yok')
          speak('Müşteri telefon numarası bulunamadı')
        }
        return
      }

      // [Numara] konum / yol / harita / navigasyon
      if (transcript.includes('konum') || transcript.includes('yol') || transcript.includes('harita') || transcript.includes('navigasyon')) {
        console.log('🗺️ NAVİGASYON komutu tetiklendi')
        handleOpenNavigation(pkg)
        speak('Navigasyon açılıyor. Güvenli sürüşler')
        return
      }
    }

    // GENEL KOMUTLAR (numarasız) - İlk aktif paketi kullan
    console.log('🔄 Genel komut modu (numarasız)')

    // Kabul
    if (transcript.includes('kabul') || transcript.includes('onayla') || transcript.includes('tamam')) {
      const pendingPackage = currentPackages.find(pkg =>
        pkg.status === 'assigned' || pkg.status === 'waiting'
      )
      console.log('🟢 Genel KABUL komutu, bulunan paket:', pendingPackage)

      if (pendingPackage) {
        await handleAcceptPackage(pendingPackage.id)
        speak('Kabul edildi')
      } else {
        speak('Paket yok')
      }
      return
    }

    // Teslim Et (genel komut - numarasız)
    if (transcript.includes('bitti') || transcript.includes('teslim') || transcript.includes('kapat')) {
      const activePackage = currentPackages.find(pkg => pkg.status === 'on_the_way')
      console.log('🔵 Genel TESLİM komutu, bulunan paket:', activePackage)

      if (activePackage) {
        // Ödeme yöntemini transcript'ten algıla
        let paymentMethod = selectedPaymentMethods[activePackage.id]

        if (transcript.includes('nakit') || transcript.includes('nakıt')) {
          paymentMethod = 'cash'
          setSelectedPaymentMethods(prev => ({ ...prev, [activePackage.id]: 'cash' }))
          console.log('💵 Ödeme yöntemi sesli komuttan algılandı: NAKİT')
        } else if (transcript.includes('kart') || transcript.includes('kredi')) {
          paymentMethod = 'card'
          setSelectedPaymentMethods(prev => ({ ...prev, [activePackage.id]: 'card' }))
          console.log('💳 Ödeme yöntemi sesli komuttan algılandı: KART')
        }

        if (!paymentMethod) {
          speak('Nakit mi kart mı')
          setErrorMessage('Lütfen ödeme yöntemini seçin!')
          setTimeout(() => setErrorMessage(''), 3000)
          return
        }
        await handleDeliver(activePackage.id)
        speak(`${paymentMethod === 'cash' ? 'Nakit' : 'Kart'} teslim edildi`)
      } else {
        speak('Paket yok')
      }
      return
    }

    // Müşteri Ara
    if (transcript.includes('müşteri') || transcript.includes('kişi')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('📞 Genel MÜŞTERİ ARA komutu, bulunan paket:', activePackage)

      if (activePackage && activePackage.customer_phone) {
        window.location.href = `tel:${activePackage.customer_phone}`
        speak('Müşteri aranıyor')
      } else {
        speak('Telefon yok')
      }
      return
    }

    // Dükkan Ara
    if (transcript.includes('dükkan') || transcript.includes('restoran') || transcript.includes('işletme')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('🏪 Genel DÜKKAN ARA komutu, bulunan paket:', activePackage)

      if (activePackage && activePackage.restaurant?.phone) {
        window.location.href = `tel:${activePackage.restaurant.phone}`
        speak('Dükkan aranıyor')
      } else {
        speak('Telefon yok')
      }
      return
    }

    // Navigasyon
    if (transcript.includes('konum') || transcript.includes('yol') || transcript.includes('harita') || transcript.includes('navigasyon')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('🗺️ Genel NAVİGASYON komutu, bulunan paket:', activePackage)

      if (activePackage) {
        handleOpenNavigation(activePackage)
        speak('Navigasyon açılıyor')
      } else {
        speak('Paket yok')
      }
      return
    }

    // Adres Sorgula
    if (transcript.includes('sıra') || transcript.includes('nere') || transcript.includes('adres')) {
      const activePackage = currentPackages.find(pkg => pkg.status !== 'delivered')
      console.log('📍 ADRES SORGULA komutu, bulunan paket:', activePackage)

      if (activePackage) {
        const address = activePackage.delivery_address
        const amount = activePackage.amount
        speak(`${address}. ${amount} lira`)
      } else {
        speak('Paket yok')
      }
      return
    }

    console.warn('⚠️ Komut anlaşılamadı:', transcript)
    // Sessizce geç, kullanıcıyı rahatsız etme
  }

  // Tarih aralığına göre paketleri filtrele - DÜZELTİLDİ
  const filterPackagesByDateRange = async (start: string, end: string) => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      const startDateTime = new Date(start + 'T00:00:00')
      const endDateTime = new Date(end + 'T23:59:59')

      // Tarih aralığındaki TÜM teslim edilmiş paketleri çek
      const { data, error, count } = await supabase
        .from('packages')
        .select('*, restaurants(name, phone, address)', { count: 'exact' })
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        .gte('delivered_at', startDateTime.toISOString())
        .lte('delivered_at', endDateTime.toISOString())
        .order('delivered_at', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants
      }))

      setFilteredPackages(transformed)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
      setCurrentPage(1) // İlk sayfaya dön

      console.log(`📊 ${transformed.length} paket bulundu, ${Math.ceil((count || 0) / ITEMS_PER_PAGE)} sayfa`)
    } catch (error: any) {
      console.error('❌ Paket filtreleme hatası:', error)
    }
  }

  // CARİ HESAP MANTIĞI - Kalan Borç Hesaplama (Admin Paneli ile Aynı)
  const fetchUnsettledAmount = async () => {
    const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
    if (!courierId) return

    try {
      // 1. TÜM ZAMANLARIN teslimat toplamı (tarih filtresi YOK!)
      const { data: allPackages, error: packagesError } = await supabase
        .from('packages')
        .select('amount')
        .eq('courier_id', courierId)
        .eq('status', 'delivered')
        // ⚠️ TARİH FİLTRESİ YOK - Tüm geçmiş dahil!

      if (packagesError) throw packagesError

      const totalOwed = (allPackages || []).reduce((sum, pkg) => sum + (pkg.amount || 0), 0)

      // 2. TÜM ZAMANLARIN ödeme toplamı (courier_settlements tablosundan)
      const { data: allSettlements, error: settlementsError } = await supabase
        .from('courier_settlements')
        .select('amount_paid')
        .eq('courier_id', courierId)
        // ⚠️ TARİH FİLTRESİ YOK - Tüm geçmiş dahil!

      if (settlementsError) throw settlementsError

      const totalPaid = (allSettlements || []).reduce((sum, s) => sum + (s.amount_paid || 0), 0)

      // 3. CARİ HESAP FORMÜLÜ: Kalan Borç = Toplam Teslimat - Toplam Ödeme
      // Negatif olamaz (fazla ödeme = bahşiş, borç 0 olur)
      const remainingDebt = Math.max(0, totalOwed - totalPaid)
      setUnsettledAmount(remainingDebt)

      console.log('💰 CARİ HESAP HESAPLAMASI (Kurye Paneli):', {
        totalOwed: totalOwed.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        remainingDebt: remainingDebt.toFixed(2)
      })
    } catch (error: any) {
      console.error('❌ Kalan borç hesaplanamadı:', error)
    }
  }

  // Mevcut sayfadaki paketleri al
  const getCurrentPagePackages = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredPackages.slice(startIndex, endIndex)
  }

  // Scroll pozisyonunu kaydet
  const saveScrollPosition = (containerId: string) => {
    const container = document.getElementById(containerId)
    if (container) {
      scrollPositionRef.current[containerId] = container.scrollTop
    }
  }

  // Scroll pozisyonunu geri yükle
  const restoreScrollPosition = (containerId: string) => {
    const container = document.getElementById(containerId)
    if (container && scrollPositionRef.current[containerId] !== undefined) {
      container.scrollTop = scrollPositionRef.current[containerId]
    }
  }

  // Veri güncellendiğinde scroll pozisyonunu koru
  useEffect(() => {
    if (activeTab === 'earnings') {
      restoreScrollPosition('earnings-scroll-container')
    } else if (activeTab === 'history') {
      restoreScrollPosition('history-scroll-container')
    }
  }, [filteredPackages, todayDeliveredPackages, activeTab])

  // İlk yüklemede bugünün paketlerini filtrele
  useEffect(() => {
    if (todayDeliveredPackages.length > 0) {
      filterPackagesByDateRange(startDate, endDate)
    }
  }, [todayDeliveredPackages])

  const handleAcceptPackage = async (packageId: number) => {
    setIsUpdating(prev => new Set(prev).add(packageId))

    try {
      // Basit UPDATE
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'picking_up',
          accepted_at: new Date().toISOString()
        })
        .eq('id', packageId)

      if (error) throw error

      // Yerel state'i anında güncelle
      setPackages(prev => prev.map(pkg =>
        pkg.id === packageId
          ? { ...pkg, status: 'picking_up' as const, accepted_at: new Date().toISOString() }
          : pkg
      ))

      setSuccessMessage('✅ Paket kabul edildi!')
      setTimeout(() => setSuccessMessage(''), 2000)

    } catch (error: any) {
      console.error('Kabul hatası:', error)
      setErrorMessage('❌ Hata: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)

      // Hata durumunda yenile
      await fetchPackages(false)
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(packageId)
        return newSet
      })
    }
  }

  const handleDeliver = async (packageId: number) => {
    const paymentMethod = selectedPaymentMethods[packageId]
    if (!paymentMethod) {
      setErrorMessage('Lütfen ödeme yöntemini seçin!')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    // IBAN seçildiyse modal aç
    if (paymentMethod === 'iban') {
      const pkg = packages.find(p => p.id === packageId)
      if (pkg) {
        setIbanPackageId(packageId)
        setIbanPackageAmount(pkg.amount)
        setShowIbanModal(true)
      }
      return
    }

    setIsUpdating(prev => new Set(prev).add(packageId))

    try {
      // Basit UPDATE
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          payment_method: paymentMethod
        })
        .eq('id', packageId)

      if (error) throw error

      // Yerel state'i anında güncelle - paketi listeden çıkar
      setPackages(prev => prev.filter(pkg => pkg.id !== packageId))

      // İstatistikleri güncelle
      setDeliveredCount(prev => prev + 1)
      const pkg = packages.find(p => p.id === packageId)
      if (pkg) {
        if (paymentMethod === 'cash') {
          setCashTotal(prev => prev + pkg.amount)
        } else {
          setCardTotal(prev => prev + pkg.amount)
        }
      }

      setSuccessMessage('✅ Paket teslim edildi!')
      setTimeout(() => setSuccessMessage(''), 2000)

      // Arka planda yenile
      fetchTodayDeliveredPackages()
      fetchLeaderboard()

    } catch (error: any) {
      console.error('Teslim hatası:', error)
      setErrorMessage('❌ Hata: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)

      // Hata durumunda yenile
      await fetchPackages(false)
      await fetchDailyStats()
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(packageId)
        return newSet
      })
    }
  }

  // IBAN ile ödeme gönderildi
  const handleIbanPaymentSent = async () => {
    if (!ibanPackageId) return

    setIsUpdating(prev => new Set(prev).add(ibanPackageId))
    setShowIbanModal(false)

    try {
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          payment_method: 'iban'
        })
        .eq('id', ibanPackageId)

      if (error) throw error

      // Yerel state'i anında güncelle - paketi listeden çıkar
      setPackages(prev => prev.filter(pkg => pkg.id !== ibanPackageId))

      // İstatistikleri güncelle
      setDeliveredCount(prev => prev + 1)

      setSuccessMessage('✅ IBAN ödemesi kaydedildi, paket teslim edildi!')
      setTimeout(() => setSuccessMessage(''), 2000)

    } catch (error: any) {
      console.error('IBAN teslim hatası:', error)
      setErrorMessage('❌ Hata: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(ibanPackageId)
        return newSet
      })
      setIbanPackageId(null)
      setIbanPackageAmount(0)
    }
  }

  // IBAN kopyalama fonksiyonu
  const copyIbanToClipboard = () => {
    const iban = 'TR79 0001 0090 1065 9157 6050 01'
    navigator.clipboard.writeText(iban.replace(/\s/g, ''))
    setSuccessMessage('✅ IBAN kopyalandı!')
    setTimeout(() => setSuccessMessage(''), 2000)
  }

  // Arka plan konum takibi başlat
  const startBackgroundLocationTracking = async (courierId: string) => {
    if (typeof window === 'undefined') {
      return null
    }
    
    try {
      if (window.navigator.userAgent.includes('Mobile')) {
        if (typeof window === 'undefined') return null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bgGeoModule = await import('@capacitor-community/background-geolocation') as any
        const BackgroundGeolocationPlugin = bgGeoModule.BackgroundGeolocationPlugin ?? bgGeoModule.default?.BackgroundGeolocationPlugin ?? bgGeoModule.default
        
        console.log('🔄 Arka plan konum takibi başlatılıyor...')
        
        const watcherId = await BackgroundGeolocationPlugin.addWatcher(
            {
              backgroundMessage: 'Konumunuz Takip Ediliyor',
              backgroundTitle: 'Alda Gel Kurye Aktif',
              requestPermissions: true,
              stale: false,
              distanceFilter: 10 // 10 metre hareket ettiğinde güncelle
            },
            async (location: { latitude: number; longitude: number; accuracy: number; speed: number | null; bearing: number | null; time: number | null } | undefined, error: Error | undefined) => {
              if (error) {
                console.error('❌ Arka plan konum hatası:', error)
                return
              }

              if (!location) {
                console.error('❌ Konum null geldi, işlenmiyor')
                return
              }

              const { latitude, longitude, accuracy, speed, bearing, time } = location
              const timestamp = time || Date.now()

              console.log('📍 Arka plan konum alındı:', { latitude, longitude, accuracy })

              // ============================================
              // ARKA PLAN FİLTRELEME - AYNI KURALLAR
              // ============================================
              
              // FİLTRE 1: NULL/ZERO
              if (!latitude || !longitude || latitude === 0 || longitude === 0) {
                console.error('❌ Arka plan FİLTRE 1 REDDEDİLDİ: Geçersiz koordinatlar')
                return
              }

              // FİLTRE 2: DOĞRULUK BARAJI (1000m baz istasyonu + 100m hassasiyet)
              if (!accuracy || accuracy > 1000) {
                console.error('❌ Arka plan FİLTRE 2 REDDEDİLDİ: Baz istasyonu verisi')
                console.error(`❌ Accuracy: ${accuracy ? accuracy.toFixed(0) : 'N/A'}m`)
                return
              }

              if (accuracy > 100) {
                console.error('❌ Arka plan FİLTRE 2 REDDEDİLDİ: Düşük hassasiyet')
                console.error(`❌ Accuracy: ${accuracy.toFixed(0)}m - Gerekli: <100m`)
                return
              }

              // FİLTRE 3: COĞRAFİ ÇİT (Samsun Geofencing)
              if (!isDevelopment) {
                const isInSamsun = 
                  latitude >= OPERATION_BOUNDS.minLat && 
                  latitude <= OPERATION_BOUNDS.maxLat && 
                  longitude >= OPERATION_BOUNDS.minLng && 
                  longitude <= OPERATION_BOUNDS.maxLng

                if (!isInSamsun) {
                  console.error('🚫 Arka plan FİLTRE 3 REDDEDİLDİ: COĞRAFİ ÇİT DIŞI!')
                  console.error(`🚫 Konum: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                  console.error('🚫 VERİ ÇÖPE ATILDI')
                  return
                }
              }

              // FİLTRE 4: HIZ VE MESAFE FİLTRESİ
              if (lastValidLocationRef.current) {
                const lastLoc = lastValidLocationRef.current
                const distance = calculateDistance(lastLoc.latitude, lastLoc.longitude, latitude, longitude)
                const timeDiff = (timestamp - lastLoc.timestamp) / 1000
                
                if (timeDiff <= 0) {
                  console.error('❌ Arka plan FİLTRE 4 REDDEDİLDİ: Zaman farkı sıfır')
                  return
                }

                const speedKmh = (distance / timeDiff) * 3.6

                if (speedKmh > 120) {
                  console.error('⚡ Arka plan FİLTRE 4 REDDEDİLDİ: IŞINLANMA!')
                  console.error(`⚡ Hız: ${speedKmh.toFixed(0)} km/h - Maksimum: 120 km/h`)
                  console.error('⚡ VERİ BLOKLAND')
                  return
                }
              }

              console.log('✅ Arka plan: Tüm filtreler geçti')

              // Son geçerli konumu güncelle
              lastValidLocationRef.current = {
                latitude,
                longitude,
                timestamp
              }

              console.log('✅ Arka plan konum geçerli, kaydediliyor')

              // Veritabanına kaydet
              try {
                await supabase
                  .from('couriers')
                  .update({
                    last_location: {
                      latitude,
                      longitude,
                      accuracy: accuracy || null,
                      heading: bearing || null,
                      speed: speed || null,
                      updated_at: new Date(timestamp).toISOString(),
                      last_seen: new Date().toISOString()
                    }
                  })
                  .eq('id', courierId)
                
                console.log('✅ Arka plan konum kaydedildi')
              } catch (err) {
                console.error('❌ Arka plan konum kaydetme hatası:', err)
              }
            }
          )

        console.log('✅ Arka plan konum takibi başlatıldı, watcher ID:', watcherId)
        
        return watcherId
      } else {
        console.log('ℹ️ Background geolocation sadece mobil cihazlarda desteklenir')
        return null
      }
    } catch (error) {
      console.error('❌ Arka plan konum takibi başlatılamadı:', error)
      return null
    }
  }

  // Arka plan konum takibini durdur
  const stopBackgroundLocationTracking = async (watcherId: string) => {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      if (window.navigator.userAgent.includes('Mobile')) {
        if (typeof window === 'undefined') return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bgGeoModule = await import('@capacitor-community/background-geolocation') as any
        const BackgroundGeolocationPlugin = bgGeoModule.BackgroundGeolocationPlugin ?? bgGeoModule.default?.BackgroundGeolocationPlugin ?? bgGeoModule.default
        await BackgroundGeolocationPlugin.removeWatcher({ id: watcherId })
        console.log('🛑 Arka plan konum takibi durduruldu')
      } else {
        console.log('ℹ️ Background geolocation sadece mobil cihazlarda desteklenir')
      }
    } catch (error) {
      console.error('❌ Arka plan konum takibi durdurulamadı:', error)
    }
  }

  // Son geçerli konum (sıçrama filtresi için)
  const lastValidLocationRef = useRef<{ latitude: number, longitude: number, timestamp: number } | null>(null)

  // İki konum arasındaki mesafeyi hesapla (Haversine formülü - metre cinsinden)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Dünya yarıçapı (metre)
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Metre cinsinden mesafe
  }

  // Konum güncellemesi fonksiyonu - ULTRA GÜÇLENDİRİLMİŞ FİLTRELEME
  const updateCourierLocation = async (courierId: string) => {
    if (typeof window === 'undefined') return
    try {
      // Capacitor Geolocation plugin'ini kullan (daha güvenilir)
      const geoModule = await import('@capacitor/geolocation')
      const Geolocation = geoModule.Geolocation
      if (!Geolocation) return
      
      // İzin kontrolü
      const permission = await Geolocation.checkPermissions()
      console.log('📍 Konum izni durumu:', permission)
      
      if (permission.location !== 'granted') {
        console.log('📍 Konum izni isteniyor...')
        const requestResult = await Geolocation.requestPermissions()
        if (requestResult.location !== 'granted') {
          console.error('❌ Konum izni reddedildi')
          return
        }
      }

      // ============================================
      // DONANIM ZORLAMASI: GPS ONLY - CACHE YOK
      // ============================================
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,  // ✅ GPS kullan (WiFi/IP/Baz istasyonu değil)
        timeout: 20000,            // 20 saniye bekle
        maximumAge: 0              // ✅ CACHE KULLANMA - Her zaman yeni GPS verisi al
      })

      const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords
      const timestamp = position.timestamp

      console.log('🛰️ GPS Verisi Alındı:', { 
        lat: latitude.toFixed(6), 
        lng: longitude.toFixed(6), 
        accuracy: accuracy ? `${accuracy.toFixed(0)}m` : 'N/A',
        timestamp: new Date(timestamp).toISOString()
      })

      // ============================================
      // FİLTRE 1: NULL/ZERO KONTROLÜ
      // ============================================
      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.error('❌ FİLTRE 1 REDDEDİLDİ: Geçersiz koordinatlar (0,0 veya null)')
        console.error('❌ Son geçerli konum korunuyor')
        return
      }

      // ============================================
      // FİLTRE 2: DOĞRULUK BARAJI (Accuracy Threshold)
      // ============================================
      // Baz istasyonu verilerini engelle (1000m+ accuracy)
      if (!accuracy || accuracy > 1000) {
        console.error('❌ FİLTRE 2 REDDEDİLDİ: Baz istasyonu verisi tespit edildi!')
        console.error(`❌ Accuracy: ${accuracy ? accuracy.toFixed(0) : 'N/A'}m - Maksimum: 1000m`)
        console.error('❌ Bu muhtemelen mobil operatör verisi, GPS değil')
        return
      }

      // Yüksek hassasiyet kontrolü (100m threshold)
      if (accuracy > 100) {
        console.error('❌ FİLTRE 2 REDDEDİLDİ: Konum doğruluğu çok düşük')
        console.error(`❌ Accuracy: ${accuracy.toFixed(0)}m - Minimum gereksinim: 100m`)
        console.error('❌ Sadece yüksek hassasiyetli GPS verisi kabul edilir')
        return
      }

      console.log(`✅ FİLTRE 2 GEÇTİ: Doğruluk kabul edilebilir (${accuracy.toFixed(0)}m)`)

      // ============================================
      // FİLTRE 3: COĞRAFİ ÇİT (Samsun Geofencing)
      // ============================================
      // Production'da Samsun dışı konumları DOĞRUDAN ÇÖPE AT
      if (!isDevelopment) {
        const isInSamsun = 
          latitude >= OPERATION_BOUNDS.minLat && 
          latitude <= OPERATION_BOUNDS.maxLat && 
          longitude >= OPERATION_BOUNDS.minLng && 
          longitude <= OPERATION_BOUNDS.maxLng

        if (!isInSamsun) {
          console.error('🚫 FİLTRE 3 REDDEDİLDİ: COĞRAFİ ÇİT DIŞI!')
          console.error(`🚫 Konum: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          console.error(`🚫 Beklenen: Samsun (${OPERATION_BOUNDS.minLat}-${OPERATION_BOUNDS.maxLat} Lat, ${OPERATION_BOUNDS.minLng}-${OPERATION_BOUNDS.maxLng} Lng)`)
          console.error('🚫 Bu konum Ankara/İstanbul gibi alakasız bir şehir olabilir')
          console.error('🚫 VERİ ÇÖPE ATILDI - Veritabanına yazılmayacak')
          return
        }

        console.log('✅ FİLTRE 3 GEÇTİ: Konum Samsun sınırları içinde')
      } else {
        console.log('ℹ️ Geliştirme ortamı - Coğrafi çit devre dışı')
      }

      // ============================================
      // FİLTRE 4: HIZ VE MESAFE FİLTRESİ (Velocity Check)
      // ============================================
      if (lastValidLocationRef.current) {
        const lastLoc = lastValidLocationRef.current
        const distance = calculateDistance(lastLoc.latitude, lastLoc.longitude, latitude, longitude)
        const timeDiff = (timestamp - lastLoc.timestamp) / 1000 // saniye
        
        // Sıfır bölme hatası kontrolü
        if (timeDiff <= 0) {
          console.error('❌ FİLTRE 4 REDDEDİLDİ: Zaman farkı sıfır veya negatif')
          return
        }

        const calculatedSpeed = distance / timeDiff // m/s
        const speedKmh = calculatedSpeed * 3.6 // km/h

        // İmkansız hız kontrolü (Işınlanma engelleme)
        const MAX_SPEED_KMH = 120 // Motor için makul maksimum hız
        
        if (speedKmh > MAX_SPEED_KMH) {
          console.error('⚡ FİLTRE 4 REDDEDİLDİ: IŞINLANMA TESPİT EDİLDİ!')
          console.error(`⚡ Mesafe: ${distance.toFixed(0)}m (${(distance/1000).toFixed(1)} km)`)
          console.error(`⚡ Süre: ${timeDiff.toFixed(1)} saniye`)
          console.error(`⚡ Hesaplanan Hız: ${speedKmh.toFixed(0)} km/h`)
          console.error(`⚡ Maksimum İzin Verilen: ${MAX_SPEED_KMH} km/h`)
          console.error('⚡ Bu muhtemelen mobil operatör hatası veya mock location')
          console.error('⚡ VERİ BLOKLAND - Kurye son bilinen konumda kalacak')
          return
        }

        // Şüpheli hız uyarısı (80+ km/h)
        if (speedKmh > 80) {
          console.warn(`⚠️ Yüksek hız tespit edildi: ${speedKmh.toFixed(0)} km/h`)
          console.warn('⚠️ Kurye muhtemelen araçla hareket ediyor')
        }

        console.log(`✅ FİLTRE 4 GEÇTİ: Hız makul (${speedKmh.toFixed(1)} km/h, ${distance.toFixed(0)}m / ${timeDiff.toFixed(1)}s)`)
      } else {
        console.log('ℹ️ FİLTRE 4 ATLANDI: İlk konum güncellemesi (karşılaştırma yok)')
      }

      // ============================================
      // ✅ TÜM FİLTRELER GEÇTİ - VERİ GÜVENİLİR
      // ============================================
      console.log('🎉 TÜM FİLTRELER GEÇTİ - Konum güvenilir ve geçerli')
      console.log('📍 Onaylanan Konum:', { 
        latitude: latitude.toFixed(6), 
        longitude: longitude.toFixed(6), 
        accuracy: `${accuracy.toFixed(0)}m`,
        speed: speed ? `${(speed * 3.6).toFixed(1)} km/h` : 'durgun',
        heading: heading ? `${heading.toFixed(0)}°` : 'bilinmiyor',
        altitude: altitude ? `${altitude.toFixed(0)}m` : 'bilinmiyor'
      })

      // Son geçerli konumu güncelle (sıçrama filtresi için)
      lastValidLocationRef.current = {
        latitude,
        longitude,
        timestamp
      }

      // Veritabanına kaydet
      const locationData = {
        latitude,
        longitude,
        accuracy: accuracy || null,
        altitude: altitude || null,
        heading: heading || null,
        speed: speed || null,
        updated_at: new Date(timestamp).toISOString(),
        last_seen: new Date().toISOString()
      }

      const { error } = await supabase
        .from('couriers')
        .update({
          last_location: locationData
        })
        .eq('id', courierId)

      if (error) {
        console.error('❌ Konum güncellenemedi:', error)
      } else {
        console.log('✅ Konum veritabanına kaydedildi')
        console.log('📊 Veri:', locationData)
      }
    } catch (error: any) {
      console.error('❌ Konum alınamadı:', error)
      console.error('❌ Hata mesajı:', error.message)
      
      // Fallback: Web API kullan (aynı filtrelerle)
      console.log('🔄 Web Geolocation API deneniyor...')
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords
            const timestamp = position.timestamp
            
            // AYNI FİLTRELERİ UYGULA
            if (!latitude || !longitude || latitude === 0 || longitude === 0) {
              console.error('❌ Web API FİLTRE 1: Geçersiz koordinatlar')
              return
            }
            
            // Doğruluk barajı
            if (!accuracy || accuracy > 1000) {
              console.error('❌ Web API FİLTRE 2: Baz istasyonu verisi')
              return
            }

            if (accuracy > 100) {
              console.error('❌ Web API FİLTRE 2: Doğruluk çok düşük:', accuracy)
              return
            }
            
            // Samsun sınır kontrolü (Geliştirme ortamında devre dışı)
            if (!isDevelopment) {
              const isInSamsun = 
                latitude >= OPERATION_BOUNDS.minLat && latitude <= OPERATION_BOUNDS.maxLat && 
                longitude >= OPERATION_BOUNDS.minLng && longitude <= OPERATION_BOUNDS.maxLng
              
              if (!isInSamsun) {
                console.error('🚫 Web API FİLTRE 3: Coğrafi çit dışı konum')
                return
              }
            }
            
            console.log('✅ Web API konum geçerli:', { latitude, longitude, accuracy })
            
            try {
              await supabase
                .from('couriers')
                .update({
                  last_location: {
                    latitude,
                    longitude,
                    accuracy,
                    updated_at: new Date(timestamp).toISOString(),
                    last_seen: new Date().toISOString()
                  }
                })
                .eq('id', courierId)
              console.log('✅ Web API ile konum kaydedildi')
            } catch (err) {
              console.error('❌ Web API konum kaydetme hatası:', err)
            }
          },
          (err) => console.error('❌ Web API konum hatası:', err),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        )
      }
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      const courierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
      if (!courierId) return

      // İlk yükleme
      fetchPackages(true)
      fetchDailyStats()
      fetchTodayDeliveredPackages()
      fetchCourierStatus()
      fetchLeaderboard()
      fetchUnsettledAmount() // Verilecek hesabı çek

      // İlk konum güncellemesi - HEMEN yap
      console.log('📍 İlk konum güncellemesi başlatılıyor...')
      updateCourierLocation(courierId)

      // 5 saniye sonra bir daha güncelle (ilk güncelleme başarısız olursa)
      setTimeout(() => {
        console.log('📍 İkinci konum güncellemesi...')
        updateCourierLocation(courierId)
      }, 5000)

      // Arka plan konum takibini başlat
      let backgroundWatcherId: string | null = null
      startBackgroundLocationTracking(courierId).then(watcherId => {
        backgroundWatcherId = watcherId
      })

      // Her 20 saniyede bir konum güncelle (daha sık)
      const locationInterval = setInterval(() => {
        updateCourierLocation(courierId)
      }, 20000) // 20 saniye

      // REALTIME ONLY - Canlı yayın modu
      // ⚠️ ÖNEMLİ: Supabase Dashboard -> Database -> Replication -> 'packages' tablosunu işaretleyin!
      console.log('🔴 Kurye Realtime dinleme başlatıldı - Canlı yayın modu aktif')
      console.log('📍 Dinlenen kurye ID:', courierId)

      // Realtime callback fonksiyonları - her zaman güncel state'e erişmek için burada tanımla
      const handlePackageChange = async (payload: any) => {
        console.log('📦 Paket değişikliği algılandı:', payload.eventType, 'ID:', payload.new?.id || payload.old?.id)
        console.log('📦 Old courier_id:', payload.old?.courier_id, 'New courier_id:', payload.new?.courier_id)
        console.log('📦 Old status:', payload.old?.status, 'New status:', payload.new?.status)

        // ⚠️ ERKEN ÇIKIŞ: Bu paket bu kuryeyle alakalı değilse, işlem yapma
        const isRelevantToThisCourier = (
          payload.new?.courier_id === courierId || // Şu an bu kuryeye ait
          payload.old?.courier_id === courierId    // Önceden bu kuryeye aitti
        )

        if (!isRelevantToThisCourier) {
          console.log('⏭️ Bu paket başka kuryeye ait, atlanıyor')
          return // Gereksiz state güncellemesini önle
        }

        // 1. Kuryenin kendi yaptığı işlemleri filtrele (assigned → picking_up → on_the_way → delivered)
        const isSelfAction = (
          payload.old?.courier_id === courierId && // Zaten bu kuryeye aitti
          payload.new?.courier_id === courierId && // Hala bu kuryeye ait
          payload.old?.status !== payload.new?.status // Sadece status değişti (kendi işlemi)
        )

        // 2. Yeni paket atandı mı kontrol et (courier_id DEĞİŞTİ - NULL/başka kuryeden bu kuryeye)
        const isNewAssignment = (
          payload.eventType === 'UPDATE' &&
          payload.new?.courier_id === courierId && // Şimdi bu kuryeye ait
          payload.old?.courier_id !== courierId && // Önceden bu kuryeye ait DEĞİLDİ (null veya başka kurye)
          payload.new?.status !== 'delivered' && // Teslim edilmemiş
          payload.new?.status !== 'cancelled' // İptal edilmemiş
        )

        console.log('📦 isSelfAction:', isSelfAction, '| isNewAssignment:', isNewAssignment)

        // Self-action ise bildirim ÇALMA
        if (isSelfAction) {
          console.log('🔇 Kuryenin kendi işlemi (status: ' + payload.old?.status + ' → ' + payload.new?.status + ')')
        }
        // Yeni atama ise log kaydet
        else if (isNewAssignment) {
          console.log('🎯 Yeni paket atandı! Sipariş No:', payload.new?.order_number || 'Yeni', '- Tutar:', payload.new?.amount || 0, '₺')
        }
        // Diğer durumlar (başka güncelleme)
        else {
          console.log('ℹ️ Paket güncellendi ama yeni atama değil')
        }

        // State'i güncelle - sayfa yenileme YOK!
        await fetchPackages(false)
        await fetchDailyStats()
        await fetchTodayDeliveredPackages()
        await fetchLeaderboard()
        await fetchUnsettledAmount()
        console.log('✅ Kurye state güncellendi (packages)')
      }

      const handleCourierStatusChange = async (payload: any) => {
        // Sadece status veya is_active değiştiğinde güncelle
        const oldRecord = payload.old as any
        const newRecord = payload.new as any

        if (oldRecord && newRecord) {
          const statusChanged = oldRecord.status !== newRecord.status
          const activeChanged = oldRecord.is_active !== newRecord.is_active

          if (statusChanged || activeChanged) {
            console.log('👤 Kurye durumu değişti:', {
              status: statusChanged ? `${oldRecord.status} → ${newRecord.status}` : 'değişmedi',
              is_active: activeChanged ? `${oldRecord.is_active} → ${newRecord.is_active}` : 'değişmedi'
            })
            await fetchCourierStatus()
            console.log('✅ Kurye state güncellendi (status)')
          }
        } else {
          console.log('👤 Kurye durumu güncellendi')
          await fetchCourierStatus()
          console.log('✅ Kurye state güncellendi (status)')
        }
      }

      // 🔥 ÇELİK GİBİ REALTIME BAĞLANTI - SESSIZ YENİDEN BAĞLANMA
      let packagesChannel: any = null
      let courierChannel: any = null
      let reconnectTimers: NodeJS.Timeout[] = []

      const setupPackagesRealtimeWithRetry = async (retryCount = 0) => {
        try {
          packagesChannel = supabase
            .channel(`courier-packages-${courierId}`, {
              config: {
                broadcast: { self: true }
              }
            })
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'packages'
              },
              handlePackageChange
            )

          const status = await new Promise<string>((resolve) => {
            packagesChannel.subscribe((status: string) => {
              resolve(status)
            })
          })

          if (status === 'SUBSCRIBED') {
            console.log('✅ Kurye Paketler Realtime bağlandı')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`⚠️ Kurye Paketler Realtime hatası: ${status}`)
            
            const timer = setTimeout(() => {
              console.log('🔄 Kurye Paketler Realtime yeniden bağlanılıyor...')
              setupPackagesRealtimeWithRetry(retryCount + 1)
            }, 3000)
            
            reconnectTimers.push(timer)
          }
        } catch (error) {
          console.error('❌ Kurye Paketler Realtime subscription hatası:', error)
          
          if (retryCount < 10) {
            const timer = setTimeout(() => {
              console.log(`🔄 Hata sonrası yeniden bağlanılıyor (Deneme: ${retryCount + 1})`)
              setupPackagesRealtimeWithRetry(retryCount + 1)
            }, 3000)
            
            reconnectTimers.push(timer)
          }
        }
      }

      const setupCourierRealtimeWithRetry = async (retryCount = 0) => {
        try {
          courierChannel = supabase
            .channel(`courier-status-${courierId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'couriers',
                filter: `id=eq.${courierId}`
              },
              handleCourierStatusChange
            )

          const status = await new Promise<string>((resolve) => {
            courierChannel.subscribe((status: string) => {
              resolve(status)
            })
          })

          if (status === 'SUBSCRIBED') {
            console.log('✅ Kurye Durumu Realtime bağlandı')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`⚠️ Kurye Durumu Realtime hatası: ${status}`)
            
            const timer = setTimeout(() => {
              console.log('🔄 Kurye Durumu Realtime yeniden bağlanılıyor...')
              setupCourierRealtimeWithRetry(retryCount + 1)
            }, 3000)
            
            reconnectTimers.push(timer)
          }
        } catch (error) {
          console.error('❌ Kurye Durumu Realtime subscription hatası:', error)
          
          if (retryCount < 10) {
            const timer = setTimeout(() => {
              console.log(`🔄 Hata sonrası yeniden bağlanılıyor (Deneme: ${retryCount + 1})`)
              setupCourierRealtimeWithRetry(retryCount + 1)
            }, 3000)
            
            reconnectTimers.push(timer)
          }
        }
      }

      // 🔥 CARİ HESAP REALTIME - courier_settlements tablosunu dinle
      const setupSettlementsRealtimeWithRetry = async (retryCount = 0) => {
        try {
          const settlementsChannel = supabase
            .channel(`courier-settlements-${courierId}`)
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'courier_settlements',
                filter: `courier_id=eq.${courierId}`
              },
              async (payload) => {
                console.log('💰 Realtime: Gün sonu mutabakatı güncellendi:', payload)
                // Kalan borcu yeniden hesapla
                await fetchUnsettledAmount()
              }
            )

          const status = await new Promise<string>((resolve) => {
            settlementsChannel.subscribe((status: string) => {
              resolve(status)
            })
          })

          if (status === 'SUBSCRIBED') {
            console.log('✅ Kurye Settlements Realtime bağlandı')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`⚠️ Kurye Settlements Realtime hatası: ${status}`)
            
            const timer = setTimeout(() => {
              console.log('🔄 Kurye Settlements Realtime yeniden bağlanılıyor...')
              setupSettlementsRealtimeWithRetry(retryCount + 1)
            }, 3000)
            
            reconnectTimers.push(timer)
          }
        } catch (error) {
          console.error('❌ Kurye Settlements Realtime subscription hatası:', error)
          
          if (retryCount < 10) {
            const timer = setTimeout(() => {
              console.log(`🔄 Hata sonrası yeniden bağlanılıyor (Deneme: ${retryCount + 1})`)
              setupSettlementsRealtimeWithRetry(retryCount + 1)
            }, 3000)
            
            reconnectTimers.push(timer)
          }
        }
      }

      setupPackagesRealtimeWithRetry()
      setupCourierRealtimeWithRetry()
      setupSettlementsRealtimeWithRetry() // Cari Hesap Realtime

      return () => {
        console.log('🔴 Realtime dinleme durduruldu')
        
        // Tüm reconnect timer'larını temizle
        reconnectTimers.forEach(timer => clearTimeout(timer))
        
        // Kanalları temizle
        if (packagesChannel) supabase.removeChannel(packagesChannel)
        if (courierChannel) supabase.removeChannel(courierChannel)
        
        clearInterval(locationInterval)
        
        if (backgroundWatcherId) {
          stopBackgroundLocationTracking(backgroundWatcherId)
        }
      }
    }
  }, [isLoggedIn])

  const handleUpdateStatus = async (packageId: number, nextStatus: Package['status'], additionalData: any = {}) => {
    try {
      // IBAN seçildiyse ve delivered durumuna geçiliyorsa modal aç
      if (nextStatus === 'delivered' && additionalData.payment_method === 'iban') {
        const pkg = packages.find(p => p.id === packageId)
        if (pkg) {
          setIbanPackageId(packageId)
          setIbanPackageAmount(pkg.amount)
          setShowIbanModal(true)
        }
        return
      }

      setIsUpdating(prev => new Set(prev).add(packageId))

      // Basit UPDATE
      const { error } = await supabase
        .from('packages')
        .update({ status: nextStatus, ...additionalData })
        .eq('id', packageId)

      if (error) throw error

      // Yerel state'i anında güncelle
      if (nextStatus === 'delivered') {
        // Teslim edilenler listeden çıkar
        setPackages(prev => prev.filter(pkg => pkg.id !== packageId))
        setDeliveredCount(prev => prev + 1)

        // İstatistikleri güncelle
        const pkg = packages.find(p => p.id === packageId)
        if (pkg && additionalData.payment_method) {
          if (additionalData.payment_method === 'cash') {
            setCashTotal(prev => prev + pkg.amount)
          } else if (additionalData.payment_method === 'card') {
            setCardTotal(prev => prev + pkg.amount)
          }
        }

        fetchTodayDeliveredPackages()
        fetchLeaderboard()
      } else {
        setPackages(prev => prev.map(pkg =>
          pkg.id === packageId
            ? { ...pkg, status: nextStatus, ...additionalData }
            : pkg
        ))
      }

      setSuccessMessage('✅ Durum güncellendi!')
      setTimeout(() => setSuccessMessage(''), 2000)

    } catch (error: any) {
      console.error('Durum güncelleme hatası:', error)
      setErrorMessage('❌ Hata: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)

      // Hata durumunda yenile
      await fetchPackages(false)
    } finally {
      setIsUpdating(prev => { const n = new Set(prev); n.delete(packageId); return n })
    }
  }

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return "-";
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${diff} dk`;
  }

  // RENDER BLOKLAMA - Oturum kontrolü tamamlanmadan hiçbir şey gösterme!
  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-sm">Yükleniyor...</p>
        </div>
      </div>
    )
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
            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
          />
          <input
            type="password" placeholder="Şifre"
            className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Giriş Yap
          </button>
          {errorMessage && <p className="text-red-400 text-sm mt-3 text-center">{errorMessage}</p>}

          {/* Kayıt Ol Linki */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm mb-2">Henüz sisteme dahil değil misin?</p>
            <Link
              href="/register-kurye"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors inline-block"
            >
              Kayıt Ol →
            </Link>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-2 sm:p-4 pb-20 ${darkMode ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* KOMPAKT HEADER - TEK SATIRDA TÜM BİLGİLER */}
      {isLoggedIn && activeTab === 'packages' && (
        <div className="fixed top-2 left-2 right-2 z-[9998] transition-all duration-300">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg p-2 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                {/* Logo */}
                <img
                  src="/logo.png"
                  alt="Mergen"
                  className="w-12 h-12 object-contain flex-shrink-0"
                  style={{
                    filter: 'var(--logo-filter)',
                    WebkitFilter: 'var(--logo-filter)',
                    opacity: 'var(--logo-opacity)'
                  }}
                />

                {/* Kurye Paneli + İsim */}
                <div className="flex-shrink-0 min-w-0">
                  <h1 className="text-xs font-bold truncate">📦 Kurye Paneli</h1>
                  <p className="text-[10px] text-slate-400 truncate">{courierName}</p>
                </div>

                {/* Bugün Teslim */}
                <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700 flex-shrink-0">
                  <p className="text-[10px] text-slate-400">Bugün</p>
                  <p className="text-sm font-bold text-green-400">{deliveredCount}</p>
                </div>

                {/* Toplam Kazanç */}
                <div className="bg-gradient-to-r from-green-900 to-emerald-900 px-2 py-1 rounded border border-green-700 flex-shrink-0">
                  <p className="text-[10px] text-green-300">💰 Kazanç</p>
                  <p className="text-sm font-bold text-green-100">{deliveredCount * 80}₺</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sağ Üst Butonlar - Sadece Aktif Paketler sekmesinde göster */}
      {isLoggedIn && activeTab === 'packages' && (
        <div className="fixed top-20 right-2 sm:top-20 sm:right-4 z-[9999] flex items-center gap-1 sm:gap-2 pointer-events-auto">
          {/* Hız Simgesi - Leaderboard */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className={`flex items-center gap-2 px-4 py-3 text-base rounded-lg shadow-lg transition-all active:scale-95 pointer-events-auto ${darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            title="Günün En Hızlıları"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden xs:inline font-medium whitespace-nowrap">Sıralama</span>
          </button>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR - Sadece Kurye Paneli */}
      {isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 safe-area-bottom">
          <div className="flex items-center justify-around max-w-2xl mx-auto">
            {/* Aktif Paketler */}
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex-1 flex flex-col items-center py-3 transition-all ${activeTab === 'packages'
                ? 'text-blue-400'
                : 'text-slate-400 active:text-slate-300'
                }`}
            >
              <span className="text-2xl mb-1">📦</span>
              <span className="text-xs font-medium">Aktif</span>
            </button>

            {/* Geçmişim */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex flex-col items-center py-3 transition-all ${activeTab === 'history'
                ? 'text-blue-400'
                : 'text-slate-400 active:text-slate-300'
                }`}
            >
              <span className="text-2xl mb-1">📋</span>
              <span className="text-xs font-medium">Geçmişim</span>
            </button>

            {/* Verilecek Hesap */}
            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex-1 flex flex-col items-center py-3 transition-all ${activeTab === 'earnings'
                ? 'text-blue-400'
                : 'text-slate-400 active:text-slate-300'
                }`}
            >
              <span className="text-2xl mb-1">💰</span>
              <span className="text-xs font-medium">Hesap</span>
            </button>

            {/* Profil */}
            <button
              onClick={() => setActiveTab('account')}
              className={`flex-1 flex flex-col items-center py-3 transition-all ${activeTab === 'account'
                ? 'text-blue-400'
                : 'text-slate-400 active:text-slate-300'
                }`}
            >
              <span className="text-2xl mb-1">👤</span>
              <span className="text-xs font-medium">Profil</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-2 sm:px-0 relative pt-20 pb-20">{/* pb-20 bottom nav için boşluk */}
        {/* DURUM TOGGLE VE MİKROFON - SAĞ ALT KÖŞE */}
        {activeTab === 'packages' && (
          <div className="fixed bottom-24 right-4 z-50">
            {/* Mikrofon Butonu - Yukarıda */}
            <button
              onClick={toggleVoiceRecognition}
              onMouseUp={() => {
                // PC'de mouse bırakıldığında zorla durdur
                if (isListening && recognition) {
                  console.log('🖱️ Mouse released - forcing stop')
                  recognition.abort()
                  setIsListening(false)
                }
              }}
              onTouchEnd={() => {
                // Mobilde dokunma bittiğinde zorla durdur
                if (isListening && recognition) {
                  console.log('👆 Touch released - forcing stop')
                  recognition.abort()
                  setIsListening(false)
                }
              }}
              className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center text-2xl ${
                isListening
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          </div>
        )}

        {/* SESLİ KOMUT YARDIM POP-UP */}
        {showVoiceHelp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Başlık */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎤</span>
                  <h2 className="text-xl font-bold text-white">Sesli Komut Rehberi</h2>
                </div>
                <button
                  onClick={() => setShowVoiceHelp(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* İçerik */}
              <div className="p-6 space-y-6">
                {/* Kullanım Talimatı */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-blue-300 text-sm leading-relaxed">
                    🎯 <strong>Nasıl Kullanılır:</strong> Mikrofon butonuna basın veya interkom tuşuna basın, komutunuzu söyleyin.
                    Paket numarasını söyleyip ardından işlemi belirtin.
                  </p>
                </div>

                {/* Komut Grupları */}
                <div className="space-y-4">
                  {/* Onay */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">✅</span> Paketi Kabul Etmek
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">1 kabul</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">1 onayla</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">1 tamam</span>
                    </p>
                  </div>

                  {/* Teslim Alma */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">📦</span> Paketi Teslim Almak (Restorandan)
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">2 aldım</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">2 paket bende</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">2 teslim al</span>
                    </p>
                  </div>

                  {/* Teslim Etme */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">🏁</span> Paketi Teslim Etmek (Müşteriye)
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">3 bitti</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">3 teslim edildi</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">3 kapat</span>
                    </p>
                  </div>

                  {/* Dükkan Arama */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">🏪</span> Restoranı Aramak
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">4 dükkan</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">4 restoran</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">4 işletme</span>
                    </p>
                  </div>

                  {/* Müşteri Arama */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">📞</span> Müşteriyi Aramak
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">5 müşteri</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">5 kişi</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">5 ara</span>
                    </p>
                  </div>

                  {/* Navigasyon */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="text-pink-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-xl">🗺️</span> Akıllı Navigasyon Açmak
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">6 konum</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">6 yol</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">6 harita</span> veya{' '}
                      <span className="text-white font-mono bg-slate-700 px-2 py-1 rounded">6 navigasyon</span>
                    </p>
                    <p className="text-xs text-pink-300 mt-2">
                      💡 Koordinat varsa hassas GPS navigasyonu, yoksa adres bazlı yönlendirme açılır
                    </p>
                  </div>
                </div>

                {/* Alt Bilgi */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-purple-300 text-xs leading-relaxed">
                    💡 <strong>İpucu:</strong> Paket numaraları ekranın sol üstünde mor-pembe renkli kutularda gösterilir.
                    Komutları söylerken net ve yavaş konuşun. Bluetooth kulaklık kullanıyorsanız, play/pause tuşu ile de mikrofonu açabilirsiniz.
                  </p>
                </div>

                {/* Kapat Butonu */}
                <button
                  onClick={() => setShowVoiceHelp(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                >
                  Anladım, Başlayalım! 🚀
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* AKTİF PAKETLER SEKMESİ */}
        {activeTab === 'packages' && (
          <div className="space-y-2 sm:space-y-3">
            {packages.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-slate-500">
                <div className="text-3xl sm:text-4xl mb-2">📦</div>
                <p className="text-xs sm:text-sm">Atanmış paket bulunmuyor</p>
              </div>
            ) : (
              <>
                {/* Paket Sayısı Göstergesi - Merkeze Hizalı */}
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className="bg-blue-600 px-4 py-2 rounded-xl border border-blue-500 shadow-lg">
                    <p className="text-sm sm:text-base text-white font-bold text-center">
                      {packages.length} aktif paket
                    </p>
                  </div>
                </div>

                {/* Paket Listesi - Mobil Responsive */}
                {packages.map((pkg, index) => (
                  <div key={pkg.id} className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
                    {/* Üst Kısım */}
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {/* SLOT NUMARASI */}
                          <span className="text-lg font-black text-white bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 rounded-lg shadow-lg">
                            {packageSlots[pkg.id] || '?'}
                          </span>
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            {pkg.order_number || '......'}
                          </span>
                          {pkg.platform && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                              {getPlatformDisplayName(pkg.platform)}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                            {pkg.restaurant?.name || 'Restoran'}
                          </span>
                        </div>
                        <p className="font-medium text-sm sm:text-base text-white">{pkg.customer_name}</p>

                        {/* İçerik Gösterimi - Müşteri isminin altında */}
                        {pkg.content && (
                          <p className="text-xs text-slate-400 mt-1">📦 {pkg.content}</p>
                        )}

                        {/* Müşteri Telefonu - Koşullu Görünüm */}
                        {pkg.customer_phone && (
                          <div className="mt-2">
                            {/* Yolda ise: Tam numara + Büyük Ara Butonu */}
                            {pkg.status === 'on_the_way' ? (
                              <>
                                <p className="text-xs text-slate-400 mb-2">📞 {pkg.customer_phone}</p>
                                <div className="flex gap-2">
                                  <a
                                    href={`tel:${pkg.customer_phone}`}
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                                  >
                                    <span className="text-xl">📞</span>
                                    <span>Ara</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${pkg.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Merhaba ${pkg.customer_name}, siparişiniz yolda! 🏍️\n\nSiparişinizi buradan takip edebilirsiniz:\n${typeof window !== 'undefined' ? window.location.origin : ''}/takip?kod=${pkg.order_number}\n\nMergen Kurye`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                                  >
                                    <span className="text-xl">💬</span>
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              </>
                            ) : (
                              /* Diğer durumlarda: Maskelenmiş numara + WhatsApp butonu (assigned ve picking_up için) */
                              <>
                                <p className="text-xs text-slate-500">
                                  📞 {pkg.customer_phone.substring(0, 4)} **** {pkg.customer_phone.substring(pkg.customer_phone.length - 2)}
                                </p>
                                {(pkg.status === 'assigned' || pkg.status === 'picking_up') && (
                                  <a
                                    href={`https://wa.me/${pkg.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Merhaba ${pkg.customer_name}, siparişinizi aldım! 🏍️\n\nSiparişinizi buradan takip edebilirsiniz:\n${typeof window !== 'undefined' ? window.location.origin : ''}/takip?kod=${pkg.order_number}\n\nMergen Kurye`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 mt-2 py-2 px-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-medium rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
                                  >
                                    <span>💬</span>
                                    <span>Takip Linki Gönder</span>
                                  </a>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* Restoran bilgileri - Mobil Responsive */}
                        {(pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') && pkg.restaurant?.phone && (
                          <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-xs">🍽️</span>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-orange-900">
                                  {pkg.restaurant.name}
                                </p>
                                <p className="text-xs text-orange-700 break-all">
                                  📞 {pkg.restaurant.phone}
                                </p>
                                {pkg.restaurant.address && (
                                  <p className="text-xs text-orange-700 mt-1">
                                    📍 {pkg.restaurant.address}
                                  </p>
                                )}
                              </div>
                            </div>
                            <a
                              href={`tel:${pkg.restaurant.phone}`}
                              className="block w-full py-1.5 px-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs sm:text-sm font-medium rounded transition-colors text-center mt-2"
                            >
                              📞 Restoranı Ara
                            </a>
                          </div>
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
                    <div className="mb-2 p-2 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-300">{pkg.delivery_address}</p>
                    </div>

                    {/* NAVİGASYON BUTONU - Sadece on_the_way durumunda göster */}
                    {pkg.status === 'on_the_way' && pkg.latitude && pkg.longitude && (
                      <button
                        onClick={() => handleOpenNavigation(pkg)}
                        className="w-full mb-2 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:from-indigo-800 active:to-purple-800 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>📍</span>
                        <span>Konuma Git</span>
                      </button>
                    )}

                    {/* Durum Badge */}
                    <div className="mb-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${pkg.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                        pkg.status === 'picking_up' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {pkg.status === 'assigned' ? 'Yeni Paket' :
                          pkg.status === 'picking_up' ? 'Almaya Git' :
                            'Teslimatta'}
                      </span>
                    </div>

                    {/* Aksiyon Butonları - Mobil Responsive */}
                    {pkg.status === 'assigned' && (
                      <button
                        disabled={isUpdating.has(pkg.id)}
                        onClick={() => handleUpdateStatus(pkg.id, 'picking_up')}
                        className="w-full py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm sm:text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating.has(pkg.id) ? 'İşleniyor...' : 'Kabul Et'}
                      </button>
                    )}

                    {pkg.status === 'picking_up' && (
                      <button
                        disabled={isUpdating.has(pkg.id)}
                        onClick={() => handleUpdateStatus(pkg.id, 'on_the_way', { picked_up_at: new Date().toISOString() })}
                        className="w-full py-2 sm:py-2.5 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white text-sm sm:text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating.has(pkg.id) ? 'İşleniyor...' : 'Paketi Aldım'}
                      </button>
                    )}

                    {pkg.status === 'on_the_way' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setSelectedPaymentMethods({ ...selectedPaymentMethods, [pkg.id]: 'cash' })}
                            className={`py-2 rounded-lg border font-medium text-sm transition-colors ${selectedPaymentMethods[pkg.id] === 'cash'
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                          >
                            💵 Nakit
                          </button>
                          <button
                            onClick={() => setSelectedPaymentMethods({ ...selectedPaymentMethods, [pkg.id]: 'card' })}
                            className={`py-2 rounded-lg border font-medium text-sm transition-colors ${selectedPaymentMethods[pkg.id] === 'card'
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                          >
                            💳 Kart
                          </button>
                          <button
                            onClick={() => setSelectedPaymentMethods({ ...selectedPaymentMethods, [pkg.id]: 'iban' })}
                            className={`py-2 rounded-lg border font-medium text-sm transition-colors ${selectedPaymentMethods[pkg.id] === 'iban'
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              }`}
                          >
                            🏦 IBAN
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
        )}

        {/* PAKET GEÇMİŞİ SEKMESİ */}
        {activeTab === 'history' && (
          <div className="space-y-2 sm:space-y-3">
            {/* Tarih Seçici - Merkeze Hizalı */}
            <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 text-center">Tarih Aralığı Seçin</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Başlangıç</label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Bitiş</label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => filterPackagesByDateRange(historyStartDate, historyEndDate)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                >
                  Göster
                </button>
              </div>
            </div>

            {/* Özet Bilgiler - Kompakt Grid */}
            {filteredPackages.length > 0 && (
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="grid grid-cols-3 gap-2">
                  {/* Toplam Paket */}
                  <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 mb-1">Paket</p>
                    <p className="text-base font-bold text-blue-400">{filteredPackages.length}</p>
                  </div>

                  {/* Nakit */}
                  <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 mb-1">💵 Nakit</p>
                    <p className="text-base font-bold text-green-400">
                      {filteredPackages.filter(p => p.payment_method === 'cash').reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(0)}₺
                    </p>
                  </div>

                  {/* Kart */}
                  <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 mb-1">💳 Kart</p>
                    <p className="text-base font-bold text-blue-400">
                      {filteredPackages.filter(p => p.payment_method === 'card').reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(0)}₺
                    </p>
                  </div>

                  {/* IBAN */}
                  <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 mb-1">🏦 IBAN</p>
                    <p className="text-base font-bold text-orange-400">
                      {filteredPackages.filter(p => p.payment_method === 'iban').reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(0)}₺
                    </p>
                  </div>

                  {/* Kalan Borç - Tüm zamanların net borcu (tarih filtresinden BAĞIMSIZ) */}
                  <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-2 border-orange-500/50 px-3 py-2 rounded-lg col-span-2 shadow-lg">
                    <p className="text-[10px] font-bold text-orange-200 mb-1">💰 Kalan Borç / Ödenecek Tutar</p>
                    <p className="text-lg font-black text-orange-100">
                      {unsettledAmount.toFixed(2)}₺
                    </p>
                    <p className="text-[8px] text-orange-300 mt-0.5">
                      Yöneticiye ödemeniz gereken güncel net borç
                    </p>
                  </div>
                </div>
              </div>
            )}

            {filteredPackages.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-slate-500">
                <div className="text-3xl sm:text-4xl mb-2">📋</div>
                <p className="text-xs sm:text-sm">Bu tarih aralığında paket yok</p>
              </div>
            ) : (
              <>
                {/* Paket Sayısı Göstergesi */}
                <div className="bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-800">
                  <p className="text-xs sm:text-sm text-slate-400">
                    <span className="font-bold text-white">{filteredPackages.length}</span> paket bulundu
                  </p>
                </div>

                {/* Teslim Edilen Paket Listesi */}
                {filteredPackages.map((pkg, index) => (
                  <div key={pkg.id} className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
                    {/* Üst Kısım */}
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            {pkg.order_number || '......'}
                          </span>
                          {pkg.platform && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                              {getPlatformDisplayName(pkg.platform)}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            ✓ Teslim Edildi
                          </span>
                        </div>
                        <p className="font-medium text-sm sm:text-base text-white">{pkg.customer_name}</p>

                        {/* Müşteri Telefonu - Maskelenmiş */}
                        {pkg.customer_phone && (
                          <p className="text-xs text-slate-500 mt-1">
                            📞 {pkg.customer_phone.substring(0, 4)} **** {pkg.customer_phone.substring(pkg.customer_phone.length - 2)}
                          </p>
                        )}

                        {/* Paket İçeriği */}
                        {pkg.content && (
                          <p className="text-xs text-slate-400 mt-1">
                            📦 {pkg.content}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-400">{pkg.amount}₺</p>
                        <p className="text-xs text-slate-500">
                          {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                        </p>
                      </div>
                    </div>

                    {/* Adres */}
                    <div className="mb-2 p-2 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-300">📍 {pkg.delivery_address}</p>
                    </div>

                    {/* Zaman Bilgileri */}
                    <div className="mb-2 p-2 bg-slate-800/50 rounded-lg space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">📅 Sipariş Tarihi:</span>
                        <span className="text-slate-300">{pkg.created_at ? new Date(pkg.created_at).toLocaleDateString('tr-TR') : '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">📋 Atama Saati:</span>
                        <span className="text-blue-400">{pkg.assigned_at ? new Date(pkg.assigned_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">📦 Aldım Saati:</span>
                        <span className="text-yellow-400">{pkg.picked_up_at ? new Date(pkg.picked_up_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">🚚 Teslim Saati:</span>
                        <span className="text-green-400">{pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      </div>
                    </div>

                    {/* Restoran Bilgisi */}
                    {pkg.restaurant?.name && (
                      <div className="p-2 bg-orange-900/20 rounded-lg border border-orange-800">
                        <p className="text-xs text-orange-300">
                          🍽️ {pkg.restaurant.name}
                        </p>
                      </div>
                    )}

                    {/* Teslimat Zamanı Mesajı */}
                    {pkg.picked_up_at && pkg.delivered_at && (
                      <div className="mt-2 p-2 bg-blue-900/20 rounded-lg border border-blue-800">
                        <p className="text-xs text-blue-300 text-center">
                          ⏰ {new Date(pkg.picked_up_at).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} saatinde kabul ettiğiniz bu paketi {new Date(pkg.delivered_at).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} saatinde müşteriye ulaştırdınız
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* VERİLECEK HESAP SEKMESİ */}
        {activeTab === 'earnings' && (
          <div className="space-y-2 sm:space-y-3">
            {/* Tarih Seçici - Merkeze Hizalı */}
            <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3 text-center">Tarih Aralığı Seçin</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Başlangıç</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Bitiş</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => filterPackagesByDateRange(startDate, endDate)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                >
                  Göster
                </button>
              </div>
            </div>

            {/* Özet Bilgiler - Realtime Kalan Borç ile */}
            {selectedCourierId && (
              <CourierEarningsStats
                courierId={selectedCourierId}
                startDate={startDate}
                endDate={endDate}
              />
            )}

            {/* Paket Listesi */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white">Teslim Edilen Paketler</h3>
                <span className="text-xs text-slate-400">
                  Sayfa {currentPage} / {totalPages}
                </span>
              </div>
              <div
                id="earnings-scroll-container"
                className="space-y-2 max-h-96 overflow-y-auto admin-scrollbar"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onScroll={() => saveScrollPosition('earnings-scroll-container')}
              >
                {getCurrentPagePackages().length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-3xl mb-2">📦</div>
                    <p className="text-xs">Göster butonuna basın</p>
                  </div>
                ) : (
                  getCurrentPagePackages().map((pkg) => (
                    <div key={pkg.id} className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                              {pkg.order_number || '......'}
                            </span>
                            {pkg.platform && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                                {getPlatformDisplayName(pkg.platform)}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-sm text-white">{pkg.customer_name}</p>
                          {pkg.customer_phone && (
                            <p className="text-xs text-slate-500 mt-1">
                              📞 {pkg.customer_phone.substring(0, 4)} **** {pkg.customer_phone.substring(pkg.customer_phone.length - 2)}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            📍 {pkg.delivery_address}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-slate-500">
                              📅 Sipariş: {new Date(pkg.created_at || '').toLocaleDateString('tr-TR')}
                            </p>
                            <p className="text-xs text-blue-400">
                              ✅ Kabul: {pkg.accepted_at ? new Date(pkg.accepted_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                            <p className="text-xs text-green-400">
                              🚚 Teslim: {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-400">{pkg.amount}₺</p>
                          <p className="text-xs text-slate-500">
                            {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* SAYFALAMA BUTONLARI */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center items-center gap-1 flex-wrap">
                  {/* Önceki Sayfa */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs rounded transition-colors"
                  >
                    ‹
                  </button>

                  {/* Sayfa Numaraları */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // İlk 3, son 3 ve mevcut sayfa civarındaki 2 sayfayı göster
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1) ||
                      page <= 3 ||
                      page > totalPages - 3
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 text-xs rounded transition-colors ${currentPage === page
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-slate-500 px-1">...</span>
                    }
                    return null
                  })}

                  {/* Sonraki Sayfa */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs rounded transition-colors"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HESAP SEKMESİ */}
        {activeTab === 'account' && (
          <div className="space-y-3">
            {/* Profil Bilgileri */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-3xl">
                  🏍️
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{courierName}</h2>
                  <p className="text-sm text-slate-400">Kurye</p>
                </div>
              </div>

              {/* Durum Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Aktif Durum</p>
                  <p className="text-xs text-slate-400">
                    {is_active ? 'Yeni paketler alabilirsiniz' : 'Yeni paket alamazsınız'}
                  </p>
                </div>
                <button
                  onClick={() => updateCourierStatus('idle', !is_active)}
                  disabled={statusUpdating}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 disabled:opacity-50 ${is_active ? 'bg-green-600' : 'bg-slate-700'
                    }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${is_active ? 'left-7' : 'left-0.5'
                      }`}
                  >
                    {statusUpdating && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* İstatistikler - Kompakt Grid */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3">Bugünkü İstatistikler</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">Teslim</p>
                  <p className="text-base font-bold text-green-400">{deliveredCount}</p>
                </div>
                <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">💵 Nakit</p>
                  <p className="text-base font-bold text-yellow-400">{cashTotal}₺</p>
                </div>
                <div className="bg-slate-800/50 px-2 py-2 rounded-lg">
                  <p className="text-[10px] text-slate-400 mb-1">💳 Kart</p>
                  <p className="text-base font-bold text-purple-400">{cardTotal}₺</p>
                </div>
                <div className="bg-slate-800/50 px-2 py-2 rounded-lg col-span-3">
                  <p className="text-[10px] text-slate-400 mb-1">Toplam Kazanç</p>
                  <p className="text-base font-bold text-blue-400">{deliveredCount * 80}₺</p>
                </div>
              </div>
            </div>

            {/* Sıralama */}
            {myRank !== null && (
              <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-4 rounded-xl border border-purple-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-200 mb-1">Günün Sıralaması</p>
                    <p className="text-3xl font-bold text-white">
                      #{myRank} <span className="text-lg text-purple-300">/ {leaderboard.length}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Detay
                  </button>
                </div>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Tema</p>
                  <p className="text-xs text-slate-400">
                    {darkMode ? 'Gece modu aktif' : 'Gündüz modu aktif'}
                  </p>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-3 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900 border border-gray-300'
                    }`}
                >
                  <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
                </button>
              </div>
            </div>

            {/* Şifre Değiştir */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">🔐</span>
              <span>Şifreyi Güncelle</span>
            </button>

            {/* Çıkış Yap */}
            <button
              onClick={async () => {
                try {
                  // Supabase session'ı temizle
                  await supabase.auth.signOut()
                } catch (error) {
                  console.error('SignOut hatası:', error)
                }
                
                // localStorage temizle
                localStorage.removeItem(LOGIN_STORAGE_KEY)
                localStorage.removeItem(LOGIN_COURIER_ID_KEY)
                localStorage.removeItem('auth_logged_in')
                localStorage.removeItem('auth_user_type')
                localStorage.removeItem('auth_user')
                
                // Capacitor Preferences temizle (KALICI storage)
                await Preferences.remove({ key: LOGIN_STORAGE_KEY })
                await Preferences.remove({ key: LOGIN_COURIER_ID_KEY })
                
                // Ana sayfaya yönlendir
                window.location.href = '/'
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl">🚪</span>
              <span>Çıkış Yap</span>
            </button>
          </div>
        )}
      </div>

      {/* HESAP ÖZETİ MODAL - Mobil Responsive */}
      {
        showSummary && (
          <div className="fixed inset-0 bg-black/80 z-50 p-2 sm:p-4 overflow-y-auto flex items-center justify-center">
            <div className="max-w-md w-full bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-800">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-bold text-white">Günlük Rapor</h2>
                <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-white text-2xl active:scale-90">×</button>
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
        )
      }

      {/* GÜNÜN EN HIZLILARI MODAL - Mobil Responsive */}
      {
        showLeaderboard && (
          <div className="fixed inset-0 bg-black/80 z-50 p-2 sm:p-4 overflow-y-auto flex items-center justify-center">
            <div className="max-w-md w-full bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl p-4 sm:p-6 border border-purple-700">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-purple-100 flex items-center gap-2">
                  🚀 <span className="hidden xs:inline">Günün En Hızlıları</span><span className="xs:hidden">Sıralama</span>
                </h2>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-purple-300 hover:text-white text-2xl active:scale-90"
                >
                  ×
                </button>
              </div>

              {/* Kendi Sıralaman - Mobil Responsive */}
              {myRank !== null && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
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
                        className={`flex items-center justify-between p-3 rounded-lg transition-all ${isMe
                          ? 'bg-purple-500/30 border border-purple-400 scale-105'
                          : rank <= 3
                            ? `bg-gradient-to-r ${badgeColor} bg-opacity-20`
                            : 'bg-purple-800/30'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${rank <= 3 ? 'text-white' : 'text-purple-300'
                            }`}>
                            {badge}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isMe ? 'text-purple-100 font-bold' : 'text-purple-200'
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
        )
      }

      {/* IBAN ÖDEME MODAL */}
      {
        showIbanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">💳 Ödeme Bilgileri</h2>
                <button
                  onClick={() => {
                    setShowIbanModal(false)
                    setIbanPackageId(null)
                    setIbanPackageAmount(0)
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Tutar */}
                <div className="text-center bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-xl">
                  <p className="text-slate-200 text-sm mb-2">Ödenecek Tutar</p>
                  <p className="text-white text-4xl font-bold">{ibanPackageAmount}₺</p>
                </div>

                {/* İsim */}
                <div className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-400 text-xs mb-1">Alıcı Adı</p>
                  <p className="text-white font-semibold text-lg">İbrahim Okan Özdemir</p>
                </div>

                {/* IBAN */}
                <div className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-400 text-xs mb-2">IBAN Numarası</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm flex-1 break-all">
                      TR79 0001 0090 1065 9157 6050 01
                    </p>
                    <button
                      onClick={copyIbanToClipboard}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                    >
                      📋 Kopyala
                    </button>
                  </div>
                </div>

                {/* QR Kod */}
                <div className="bg-white p-6 rounded-xl flex flex-col items-center">
                  <img
                    src="/iban-qr.png"
                    alt="IBAN QR Kod"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <p className="text-center text-slate-400 text-xs -mt-3">
                  QR kodu okutarak IBAN'a ödeme yapabilirsiniz
                </p>

                {/* Onay Butonu */}
                <button
                  onClick={handleIbanPaymentSent}
                  disabled={isUpdating.has(ibanPackageId || 0)}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating.has(ibanPackageId || 0) ? 'İşleniyor...' : '✅ Ödeme Gönderildi'}
                </button>

                <p className="text-center text-slate-500 text-xs">
                  Bu butona bastığınızda paket "Teslim Edildi" olarak işaretlenecektir
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* ŞİFRE DEĞİŞTİRME MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 z-50 p-4 overflow-y-auto flex items-center justify-center">
          <div className="max-w-md w-full bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-2xl">
            <form onSubmit={handlePasswordChange}>
              {/* Başlık */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">🔐 Şifre Güncelle</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordError('')
                  }}
                  className="text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ×
                </button>
              </div>

              {/* Hata Mesajı */}
              {passwordError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                  <p className="text-red-300 text-sm">{passwordError}</p>
                </div>
              )}

              {/* Eski Şifre */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Eski Şifre
                </label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border bg-slate-800 border-slate-700 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="Mevcut şifrenizi girin"
                  required
                />
              </div>

              {/* Yeni Şifre */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border bg-slate-800 border-slate-700 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="Yeni şifrenizi girin (min 6 karakter)"
                  required
                  minLength={6}
                />
              </div>

              {/* Yeni Şifre Tekrar */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Yeni Şifre (Tekrar)
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border bg-slate-800 border-slate-700 text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="Yeni şifrenizi tekrar girin"
                  required
                  minLength={6}
                />
              </div>

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordError('')
                  }}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordUpdating ? '⏳ Güncelleniyor...' : '✅ Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bildirim Sistemi */}
      <CourierNotificationWrapper courierId={selectedCourierId} />
    </div >
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
        // Sadece kurye oturumunu başlat, diğerlerine dokunma
        await supabase
          .from('couriers')
          .update({ is_active: true, status: 'idle' })
          .eq('id', data.id)

        // Kurye oturumunu başlat (eski sistem)
        localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
        localStorage.setItem(LOGIN_COURIER_ID_KEY, data.id)

        // Capacitor Preferences'a kaydet (KALICI - Android'de silinmez)
        await Preferences.set({ key: LOGIN_STORAGE_KEY, value: 'true' })
        await Preferences.set({ key: LOGIN_COURIER_ID_KEY, value: data.id })

        // Yeni auth sistemi için de kaydet (otomatik giriş için)
        localStorage.setItem('auth_logged_in', 'true')
        localStorage.setItem('auth_user_type', 'courier')
        localStorage.setItem('auth_user', JSON.stringify({
          id: data.id,
          username: data.username,
          fullName: data.full_name,
          userType: 'courier'
        }))

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
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
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
            <p className="text-xs text-slate-400">
              {p.payment_method === 'cash' ? 'Nakit' : p.payment_method === 'iban' ? 'IBAN' : 'Kart'}
            </p>
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
