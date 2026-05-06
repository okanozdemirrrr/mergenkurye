/**
 * @file src/app/kurye/hooks/useCourierOrders.ts
 * @description Kurye Sipariş Yönetimi Hook'u
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'

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

interface UseCourierOrdersProps {
  courierId: string | null
  isLoggedIn: boolean
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
}

export function useCourierOrders({
  courierId,
  isLoggedIn,
  setSuccessMessage,
  setErrorMessage
}: UseCourierOrdersProps) {
  // State Management
  const [packages, setPackages] = useState<Package[]>([])
  const [todayDeliveredPackages, setTodayDeliveredPackages] = useState<Package[]>([])
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState<Set<number>>(new Set())
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<{ [key: number]: 'cash' | 'card' | 'iban' }>({})
  const [showIbanModal, setShowIbanModal] = useState(false)
  const [ibanPackageId, setIbanPackageId] = useState<number | null>(null)
  const [ibanPackageAmount, setIbanPackageAmount] = useState<number>(0)
  const [packageSlots, setPackageSlots] = useState<{ [key: number]: number }>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 30

  // Packages REF - Sesli komutlar için güncel state - ORİJİNAL MANTIK
  const packagesRef = useRef<Package[]>([])

  // Packages değiştiğinde ref'i güncelle - ORİJİNAL MANTIK
  useEffect(() => {
    packagesRef.current = packages
  }, [packages])

  // Paketlere SABİT slot numarası ata - ORİJİNAL MANTIK
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

  // Heartbeat fonksiyonu - Kurye aktiflik sinyali - ORİJİNAL MANTIK
  const sendHeartbeat = async () => {
    if (typeof window === 'undefined') return

    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      await supabase
        .from('couriers')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', courierIdFromStorage)
    } catch (error: any) {
      console.error('Heartbeat hatası:', error)
    }
  }

  // Fetch Packages - ORİJİNAL MANTIK
  const fetchPackages = async (isInitialLoad = false) => {
    if (typeof window === 'undefined') return

    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      if (isInitialLoad) setIsLoading(true)

      await sendHeartbeat()

      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name, phone, address)')
        .eq('courier_id', courierIdFromStorage)
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

  // Fetch Today Delivered Packages - ORİJİNAL MANTIK
  const fetchTodayDeliveredPackages = async () => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name, phone, address)')
        .eq('courier_id', courierIdFromStorage)
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

  // Filter Packages By Date Range - ORİJİNAL MANTIK
  const filterPackagesByDateRange = async (start: string, end: string) => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      const startDateTime = new Date(start + 'T00:00:00')
      const endDateTime = new Date(end + 'T23:59:59')

      // Tarih aralığındaki TÜM teslim edilmiş paketleri çek
      const { data, error, count } = await supabase
        .from('packages')
        .select('*, restaurants(name, phone, address)', { count: 'exact' })
        .eq('courier_id', courierIdFromStorage)
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

  // Handle Accept Package - ORİJİNAL MANTIK
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

  // Handle Deliver - ORİJİNAL MANTIK
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
          payment_method: paymentMethod,
          delivered_by_courier_id: courierId  // Teslimatı yapan kurye
        })
        .eq('id', packageId)

      if (error) throw error

      // Yerel state'i anında güncelle - paketi listeden çıkar
      setPackages(prev => prev.filter(pkg => pkg.id !== packageId))

      setSuccessMessage('✅ Paket teslim edildi!')
      setTimeout(() => setSuccessMessage(''), 2000)

      // Arka planda yenile
      fetchTodayDeliveredPackages()

    } catch (error: any) {
      console.error('Teslim hatası:', error)
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

  // Handle IBAN Payment Sent - ORİJİNAL MANTIK
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
          payment_method: 'iban',
          delivered_by_courier_id: courierId  // Teslimatı yapan kurye
        })
        .eq('id', ibanPackageId)

      if (error) throw error

      // Yerel state'i anında güncelle - paketi listeden çıkar
      setPackages(prev => prev.filter(pkg => pkg.id !== ibanPackageId))

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

  // Handle Update Status - ORİJİNAL MANTIK
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
        fetchTodayDeliveredPackages()
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

  // Copy IBAN to Clipboard - ORİJİNAL MANTIK
  const copyIbanToClipboard = () => {
    const iban = 'TR79 0001 0090 1065 9157 6050 01'
    navigator.clipboard.writeText(iban.replace(/\s/g, ''))
    setSuccessMessage('✅ IBAN kopyalandı!')
    setTimeout(() => setSuccessMessage(''), 2000)
  }

  // Get Current Page Packages - ORİJİNAL MANTIK
  const getCurrentPagePackages = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredPackages.slice(startIndex, endIndex)
  }

  return {
    // State
    packages,
    todayDeliveredPackages,
    filteredPackages,
    isLoading,
    isUpdating,
    selectedPaymentMethods,
    setSelectedPaymentMethods,
    showIbanModal,
    setShowIbanModal,
    ibanPackageId,
    ibanPackageAmount,
    packageSlots,
    packagesRef,
    currentPage,
    setCurrentPage,
    totalPages,
    ITEMS_PER_PAGE,
    
    // Functions
    fetchPackages,
    fetchTodayDeliveredPackages,
    filterPackagesByDateRange,
    handleAcceptPackage,
    handleDeliver,
    handleIbanPaymentSent,
    handleUpdateStatus,
    copyIbanToClipboard,
    getCurrentPagePackages
  }
}
