/**
 * @file src/app/kurye/hooks/useCourierStats.ts
 * @description Kurye İstatistikleri ve Leaderboard Hook'u
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface CourierLeaderboard {
  id: string
  full_name: string
  todayDeliveryCount: number
}

interface UseCourierStatsProps {
  courierId: string | null
  setErrorMessage: (msg: string) => void
}

export function useCourierStats({ courierId, setErrorMessage }: UseCourierStatsProps) {
  // State Management
  const [deliveredCount, setDeliveredCount] = useState(0)
  const [cashTotal, setCashTotal] = useState(0)
  const [cardTotal, setCardTotal] = useState(0)
  const [unsettledAmount, setUnsettledAmount] = useState(0)
  const [courierStatus, setCourierStatus] = useState<'idle' | 'busy' | null>(null)
  const [is_active, setIs_active] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [leaderboard, setLeaderboard] = useState<CourierLeaderboard[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [courierName, setCourierName] = useState<string>('Kurye')

  // Fetch Daily Stats - ORİJİNAL MANTIK
  const fetchDailyStats = async () => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('packages')
        .select('amount, payment_method, status')
        .eq('courier_id', courierIdFromStorage)
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

  // Fetch Courier Status - ORİJİNAL MANTIK
  const fetchCourierStatus = async () => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      const { data, error } = await supabase
        .from('couriers')
        .select('status, is_active, full_name')
        .eq('id', courierIdFromStorage)
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

  // Fetch Leaderboard - ORİJİNAL MANTIK
  const fetchLeaderboard = async () => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

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
      const myIndex = leaderboardData.findIndex(c => c.id === courierIdFromStorage)
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

  // CARİ HESAP MANTIĞI - Kalan Borç Hesaplama (Admin Paneli ile Aynı)
  // ⚠️ KRİTİK: Bu hesaplama TARİH FİLTRESİNDEN TAMAMEN BAĞIMSIZDIR!
  const fetchUnsettledAmount = async () => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')
    if (!courierIdFromStorage) return

    try {
      // 1. TÜM ZAMANLARIN teslimat toplamı (tarih filtresi YOK!)
      const { data: allPackages, error: packagesError } = await supabase
        .from('packages')
        .select('amount')
        .eq('courier_id', courierIdFromStorage)
        .eq('status', 'delivered')
        // ⚠️ TARİH FİLTRESİ YOK - Tüm geçmiş dahil!

      if (packagesError) throw packagesError

      const totalOwed = (allPackages || []).reduce((sum, pkg) => sum + (pkg.amount || 0), 0)

      // 2. TÜM ZAMANLARIN ödeme toplamı (courier_settlements tablosundan)
      const { data: allSettlements, error: settlementsError } = await supabase
        .from('courier_settlements')
        .select('amount_paid')
        .eq('courier_id', courierIdFromStorage)
        // ⚠️ TARİH FİLTRESİ YOK - Tüm geçmiş dahil!

      if (settlementsError) throw settlementsError

      const totalPaid = (allSettlements || []).reduce((sum, s) => sum + (s.amount_paid || 0), 0)

      // 3. CARİ HESAP FORMÜLÜ: Kalan Borç = Toplam Teslimat - Toplam Ödeme
      // Negatif olamaz (fazla ödeme = bahşiş, borç 0 olur)
      const remainingDebt = Math.max(0, totalOwed - totalPaid)
      setUnsettledAmount(remainingDebt)

      console.log('💰 CARİ HESAP HESAPLAMASI (Kurye Paneli - Hook):', {
        totalOwed: totalOwed.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        remainingDebt: remainingDebt.toFixed(2)
      })
    } catch (error: any) {
      console.error('❌ Kalan borç hesaplanamadı:', error)
    }
  }

  // Update Courier Status - ORİJİNAL MANTIK
  const updateCourierStatus = async (newStatus: 'idle' | 'busy', newIsActive: boolean) => {
    const courierIdFromStorage = localStorage.getItem('kurye_logged_courier_id')

    if (!courierIdFromStorage) {
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
        .eq('id', courierIdFromStorage)

      if (error) throw error

      setCourierStatus(newStatus)
      setIs_active(newIsActive)

    } catch (error: any) {
      console.error('❌ Durum güncellenemedi:', error)
      setErrorMessage('Durum güncellenemedi: ' + error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setStatusUpdating(false)
    }
  }

  return {
    // State
    deliveredCount,
    setDeliveredCount,
    cashTotal,
    setCashTotal,
    cardTotal,
    setCardTotal,
    unsettledAmount,
    courierStatus,
    is_active,
    statusUpdating,
    leaderboard,
    myRank,
    showLeaderboard,
    setShowLeaderboard,
    courierName,
    
    // Functions
    fetchDailyStats,
    fetchCourierStatus,
    fetchLeaderboard,
    fetchUnsettledAmount,
    updateCourierStatus
  }
}
