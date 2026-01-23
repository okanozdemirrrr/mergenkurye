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
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
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
  const [showMenu, setShowMenu] = useState(false) // Hamburger menü
  const [activeTab, setActiveTab] = useState<'packages' | 'history' | 'earnings'>('packages') // Aktif sekme
  const [todayDeliveredPackages, setTodayDeliveredPackages] = useState<Package[]>([]) // Bugünkü teslim edilenler
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // SESLİ KOMUT STATE'LERİ
  const [isListening, setIsListening] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState('')
  const [recognition, setRecognition] = useState<any>(null)

  // Build-safe mount kontrolü
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ÇELİK GİBİ OTURUM KONTROLÜ - SAYFA YENİLENDİĞİNDE DIŞARI ATMA!
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMounted) return

    setIsCheckingAuth(true)

    try {
      const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedCourierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)
      
      // Kurye oturumu varsa BURADA KAL!
      if (loggedIn === 'true' && loggedCourierId) {
        setIsLoggedIn(true)
        setSelectedCourierId(loggedCourierId)
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
        .select('status, is_active')
        .eq('id', courierId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setCourierStatus(data.status)
        setIs_active(data.is_active || false)
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
    recognitionInstance.continuous = false
    recognitionInstance.interimResults = false

    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      setVoiceCommand(transcript)
      handleVoiceCommand(transcript)
    }

    recognitionInstance.onerror = (event: any) => {
      console.error('Ses tanıma hatası:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setErrorMessage('Mikrofon izni gerekli')
        setTimeout(() => setErrorMessage(''), 3000)
      }
    }

    recognitionInstance.onend = () => {
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
        recognitionInstance.stop()
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
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'tr-TR'
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const toggleVoiceRecognition = () => {
    if (!recognition) return

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      try {
        recognition.start()
        setIsListening(true)
        playBeep()
        
        // Müziği sustur (Audio Focus)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused'
        }
      } catch (error) {
        console.error('Ses tanıma başlatılamadı:', error)
        setErrorMessage('Mikrofon başlatılamadı')
        setTimeout(() => setErrorMessage(''), 3000)
      }
    }
  }

  const handleVoiceCommand = async (command: string) => {
    console.log('Sesli komut:', command)

    // Müziği tekrar başlat
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
    }

    // Komut: Paketi teslim et
    if (command.includes('teslim') || command.includes('teslimat')) {
      const activePackage = packages.find(pkg => pkg.status !== 'delivered')
      if (activePackage) {
        await handleDeliver(activePackage.id)
        speak('Paket teslim edildi')
      } else {
        speak('Aktif paket bulunamadı')
      }
      return
    }

    // Komut: Müşteriyi ara
    if (command.includes('ara') || command.includes('müşteri')) {
      const activePackage = packages.find(pkg => pkg.status !== 'delivered')
      if (activePackage && activePackage.customer_phone) {
        window.location.href = `tel:${activePackage.customer_phone}`
        speak('Müşteri aranıyor')
      } else {
        speak('Telefon numarası bulunamadı')
      }
      return
    }

    // Komut: Sıradaki / Neresi
    if (command.includes('sıra') || command.includes('nere') || command.includes('adres')) {
      const activePackage = packages.find(pkg => pkg.status !== 'delivered')
      if (activePackage) {
        const address = activePackage.delivery_address
        const amount = activePackage.amount
        speak(`Sıradaki adres: ${address}. Tutar: ${amount} lira`)
      } else {
        speak('Aktif paket bulunamadı')
      }
      return
    }

    speak('Komut anlaşılamadı')
  }

  const handleDeliver = async (packageId: number) => {
    const paymentMethod = selectedPaymentMethods[packageId]
    if (!paymentMethod) {
      setErrorMessage('Lütfen ödeme yöntemini seçin!')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setIsUpdating(prev => new Set(prev).add(packageId))

    try {
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          payment_method: paymentMethod
        })
        .eq('id', packageId)

      if (error) throw error

      setSuccessMessage('✅ Paket teslim edildi!')
      setTimeout(() => setSuccessMessage(''), 2000)

      await fetchPackages(false)
      await fetchDailyStats()
      await fetchTodayDeliveredPackages()
      await fetchLeaderboard()

    } catch (error: any) {
      console.error('Teslim hatası:', error)
      setErrorMessage('Teslim işlemi başarısız: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(packageId)
        return newSet
      })
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
        fetchTodayDeliveredPackages()
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
    if (typeof window === 'undefined') return
    
    console.log('🔄 handleUpdateStatus çağrıldı:', { packageId, nextStatus, additionalData })
    
    try {
      setIsUpdating(prev => new Set(prev).add(packageId))
      setErrorMessage('') // Önceki hataları temizle
      
      console.log('📤 Supabase update başlatılıyor...')
      const { error, data } = await supabase
        .from('packages')
        .update({ status: nextStatus, ...additionalData })
        .eq('id', packageId)

      console.log('📥 Supabase response:', { error, data })

      if (error) {
        console.error('❌ Durum güncelleme hatası:', error)
        throw error
      }
      
      console.log('✅ Durum başarıyla güncellendi')
      setSuccessMessage('Durum güncellendi!')
      setTimeout(() => setSuccessMessage(''), 2000)
      
      // Verileri yenile
      console.log('🔄 Veriler yenileniyor...')
      await Promise.all([
        fetchPackages(false),
        fetchDailyStats()
      ])
      console.log('✅ Veriler yenilendi')
    } catch (error: any) {
      console.error('❌ handleUpdateStatus hatası:', error)
      setErrorMessage('Hata: ' + (error.message || 'Bilinmeyen hata'))
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setIsUpdating(prev => { const n = new Set(prev); n.delete(packageId); return n })
      console.log('✅ handleUpdateStatus tamamlandı')
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
    <div className={`min-h-screen p-2 sm:p-4 pb-20 ${darkMode ? 'bg-slate-950 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Sağ Üst Butonlar - Mobil Responsive */}
      {isLoggedIn && (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1 sm:gap-2">
          {/* Hız Simgesi - Leaderboard */}
          <button
            onClick={() => setShowLeaderboard(true)}
            className={`flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-lg shadow-lg transition-all active:scale-95 ${
              darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            title="Günün En Hızlıları"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden xs:inline font-medium whitespace-nowrap">Sıralama</span>
          </button>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 sm:p-2 rounded-lg shadow-lg transition-colors ${
              darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
            }`}
            title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
          >
            <span className="text-sm sm:text-base">{darkMode ? '☀️' : '🌙'}</span>
          </button>
        </div>
      )}

      {/* Hamburger Menü Butonu - Sol Üst */}
      {isLoggedIn && (
        <button 
          onClick={() => setShowMenu(!showMenu)} 
          className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50 bg-slate-800 hover:bg-slate-700 text-white p-2 sm:p-3 rounded-lg shadow-lg transition-colors active:scale-95"
        >
          <div className="space-y-1">
            <div className="w-5 h-0.5 bg-white"></div>
            <div className="w-5 h-0.5 bg-white"></div>
            <div className="w-5 h-0.5 bg-white"></div>
          </div>
        </button>
      )}

      {/* Açılır Menü */}
      {isLoggedIn && (
        <div className={`fixed top-0 left-0 h-full w-64 sm:w-80 bg-slate-900 text-white z-40 transform transition-transform duration-300 ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto admin-scrollbar`}>
          <div className="p-6 pt-20">
            <h2 className="text-xl sm:text-2xl font-bold mb-6">📦 Kurye Panel</h2>
            
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab('packages')
                  setShowMenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'packages'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3">📦</span>
                Aktif Paketlerim
              </button>

              <button
                onClick={() => {
                  setActiveTab('history')
                  setShowMenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3">📋</span>
                Paket Geçmişim
              </button>

              <button
                onClick={() => {
                  setActiveTab('earnings')
                  setShowMenu(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'earnings'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="mr-3">💰</span>
                Toplam Hesap
              </button>

              <button
                onClick={() => { 
                  localStorage.removeItem(LOGIN_STORAGE_KEY);
                  localStorage.removeItem(LOGIN_COURIER_ID_KEY);
                  window.location.href = '/kurye';
                }} 
                className="w-full text-left px-4 py-3 rounded-lg font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all mt-4"
              >
                <span className="mr-3">🚪</span>
                Çıkış Yap
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-2 sm:px-0 relative">
        {/* TOPLAM KAZANÇ - EN ÜSTTE */}
        {activeTab === 'packages' && (
          <div className="bg-gradient-to-r from-green-900 to-emerald-900 p-2 sm:p-3 rounded-xl border border-green-700 mb-3 sm:mb-4 mt-12 sm:mt-2">
            <div className="flex justify-between items-center">
              <p className="text-green-300 text-xs">💰 Toplam Kazanç</p>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-green-100">{deliveredCount * 80} ₺</p>
                <p className="text-xs text-green-400">{deliveredCount} paket × 80₺</p>
              </div>
            </div>
          </div>
        )}

        {/* LOGO VE BUGÜN TESLİM YAN YANA */}
        {activeTab === 'packages' && (
          <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-20 h-20 sm:w-24 sm:h-24"
            />
            <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 flex-1">
              <p className="text-slate-400 text-xs mb-1">Bugün Teslim</p>
              <p className="text-xl sm:text-2xl font-bold text-green-400">{deliveredCount}</p>
            </div>
          </div>
        )}

        {/* DURUM TOGGLE VE MİKROFON - SAĞ ALT KÖŞE */}
        {activeTab === 'packages' && (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
            {/* Mikrofon Butonu */}
            <button
              onClick={toggleVoiceRecognition}
              className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center text-2xl ${
                isListening 
                  ? 'bg-red-600 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
            
            {/* Durum Toggle */}
            <button
              onClick={() => updateCourierStatus('idle', !is_active)}
              disabled={statusUpdating}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 disabled:opacity-50 shadow-lg ${
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
                {/* Paket Sayısı Göstergesi - Mobil Responsive */}
                <div className="bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-800">
                  <p className="text-xs sm:text-sm text-slate-400">
                    <span className="font-bold text-white">{packages.length}</span> aktif paket
                  </p>
                </div>

                {/* Paket Listesi - Mobil Responsive */}
                {packages.map((pkg, index) => (
                <div key={pkg.id} className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
                  {/* Üst Kısım */}
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                          #{pkg.order_number || '------'}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                          {pkg.restaurant?.name || 'Restoran'}
                        </span>
                      </div>
                      <p className="font-medium text-sm sm:text-base text-white">{pkg.customer_name}</p>
                      
                      {/* Restoran bilgileri - Mobil Responsive */}
                      {(pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') && pkg.restaurant?.phone && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs">🍽️</span>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-orange-900 dark:text-orange-300">
                                {pkg.restaurant.name}
                              </p>
                              <p className="text-xs text-orange-700 dark:text-orange-400 break-all">
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
                            className="block w-full py-1.5 px-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs sm:text-sm font-medium rounded transition-colors text-center mt-2"
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
        )}

        {/* PAKET GEÇMİŞİ SEKMESİ */}
        {activeTab === 'history' && (
          <div className="space-y-2 sm:space-y-3">
            {todayDeliveredPackages.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-slate-500">
                <div className="text-3xl sm:text-4xl mb-2">📋</div>
                <p className="text-xs sm:text-sm">Bugün teslim edilen paket yok</p>
              </div>
            ) : (
              <>
                {/* Paket Sayısı Göstergesi */}
                <div className="bg-slate-900 p-2 sm:p-3 rounded-xl border border-slate-800">
                  <p className="text-xs sm:text-sm text-slate-400">
                    Bugün <span className="font-bold text-white">{todayDeliveredPackages.length}</span> paket teslim edildi
                  </p>
                </div>

                {/* Teslim Edilen Paket Listesi */}
                {todayDeliveredPackages.map((pkg, index) => (
                  <div key={pkg.id} className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
                    {/* Üst Kısım */}
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            #{pkg.order_number || '------'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            ✓ Teslim Edildi
                          </span>
                        </div>
                        <p className="font-medium text-sm sm:text-base text-white">{pkg.customer_name}</p>
                        
                        {/* Müşteri Telefonu */}
                        {pkg.customer_phone && (
                          <p className="text-xs text-slate-400 mt-1">
                            📞 {pkg.customer_phone}
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
                          {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                        </p>
                      </div>
                    </div>

                    {/* Adres */}
                    <div className="mb-2 p-2 bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-300">📍 {pkg.delivery_address}</p>
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

        {/* TOPLAM HESAP SEKMESİ */}
        {activeTab === 'earnings' && (
          <div className="space-y-2 sm:space-y-3">
            {/* Tarih Seçici */}
            <div className="bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-3">Tarih Aralığı Seçin</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Başlangıç</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Bitiş</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Özet Bilgiler */}
            {startDate && endDate && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-400 text-xs mb-1">Toplam Paket</p>
                    <p className="text-xl font-bold text-blue-400">
                      {todayDeliveredPackages.filter(pkg => {
                        const deliveredDate = new Date(pkg.delivered_at || '')
                        return deliveredDate >= new Date(startDate) && deliveredDate <= new Date(endDate + 'T23:59:59')
                      }).length}
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-400 text-xs mb-1">Toplam Hesap</p>
                    <p className="text-xl font-bold text-green-400">
                      {todayDeliveredPackages.filter(pkg => {
                        const deliveredDate = new Date(pkg.delivered_at || '')
                        return deliveredDate >= new Date(startDate) && deliveredDate <= new Date(endDate + 'T23:59:59')
                      }).reduce((sum, pkg) => sum + (pkg.amount || 0), 0).toFixed(2)} ₺
                    </p>
                  </div>
                </div>

                {/* Paket Listesi */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-3">Teslim Edilen Paketler</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {todayDeliveredPackages.filter(pkg => {
                      const deliveredDate = new Date(pkg.delivered_at || '')
                      return deliveredDate >= new Date(startDate) && deliveredDate <= new Date(endDate + 'T23:59:59')
                    }).length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <div className="text-3xl mb-2">📦</div>
                        <p className="text-xs">Bu tarih aralığında paket yok</p>
                      </div>
                    ) : (
                      todayDeliveredPackages.filter(pkg => {
                        const deliveredDate = new Date(pkg.delivered_at || '')
                        return deliveredDate >= new Date(startDate) && deliveredDate <= new Date(endDate + 'T23:59:59')
                      }).map((pkg) => (
                        <div key={pkg.id} className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                                  #{pkg.order_number || '------'}
                                </span>
                              </div>
                              <p className="font-medium text-sm text-white">{pkg.customer_name}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                📅 {new Date(pkg.delivered_at || '').toLocaleDateString('tr-TR')} - {new Date(pkg.delivered_at || '').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-400">{pkg.amount}₺</p>
                              <p className="text-xs text-slate-500">
                                {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* HESAP ÖZETİ MODAL - Mobil Responsive */}
      {showSummary && (
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
      )}

      {/* GÜNÜN EN HIZLILARI MODAL - Mobil Responsive */}
      {showLeaderboard && (
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
        // Sadece kurye oturumunu başlat, diğerlerine dokunma
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