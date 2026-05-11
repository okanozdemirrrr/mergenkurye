/**
 * @file src/app/admin/hooks/useAdminRestaurantModal.ts
 * @description Restoran Modal Yönetimi Custom Hook
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık AdminModals.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Package, RestaurantDebt } from '@/types'
import { handleRestaurantPayment as handleRestaurantPaymentService, handleRestaurantDebtPayment as handleRestaurantDebtPaymentService } from '@/services/restaurantService'

interface UseAdminRestaurantModalProps {
  restaurantId: string | null
  modalType: string | null
  setSuccessMessage: (msg: string) => void
  setErrorMessage: (msg: string) => void
  fetchRestaurants: () => void
  parentStartDate: string | null  // 🎯 Ana sayfadan gelen başlangıç tarihi
  parentEndDate: string | null    // 🎯 Ana sayfadan gelen bitiş tarihi
}

export function useAdminRestaurantModal({
  restaurantId,
  modalType,
  setSuccessMessage,
  setErrorMessage,
  fetchRestaurants,
  parentStartDate,
  parentEndDate
}: UseAdminRestaurantModalProps) {
  // State Management - 🎯 INITIAL STATE PARENT'TAN GELSİN
  const [selectedRestaurantOrders, setSelectedRestaurantOrders] = useState<Package[]>([])
  const [restaurantDebts, setRestaurantDebts] = useState<RestaurantDebt[]>([])
  const [loadingRestaurantDebts, setLoadingRestaurantDebts] = useState(false)
  
  // 🔥 TARİH STATE'LERİ: Parent'tan gelen değerlerle başlasın, yoksa boş
  const [restaurantStartDate, setRestaurantStartDate] = useState(parentStartDate || '')
  const [restaurantEndDate, setRestaurantEndDate] = useState(parentEndDate || '')
  
  const [showRestaurantPaymentModal, setShowRestaurantPaymentModal] = useState(false)
  const [restaurantPaymentAmount, setRestaurantPaymentAmount] = useState('')
  const [restaurantPaymentProcessing, setRestaurantPaymentProcessing] = useState(false)
  const [showRestaurantDebtPayModal, setShowRestaurantDebtPayModal] = useState(false)
  const [restaurantDebtPayAmount, setRestaurantDebtPayAmount] = useState('')
  const [restaurantDebtPayProcessing, setRestaurantDebtPayProcessing] = useState(false)
  
  // 💰 NET TUTAR STATE - Detaylı Rapor'dan gelecek
  const [netAmountToPay, setNetAmountToPay] = useState<number>(0)
  
  // 🔥 REFETCH TRIGGER - Ödeme sonrası modal'ı yenilemek için
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0)

  // 🎯 PARENT TARİHLER DEĞİŞTİĞİNDE STATE'İ GÜNCELLE
  useEffect(() => {
    if (parentStartDate && parentEndDate) {
      setRestaurantStartDate(parentStartDate)
      setRestaurantEndDate(parentEndDate)
    } else if (modalType === 'restaurant' && restaurantId && !restaurantStartDate && !restaurantEndDate) {
      // Parent tarih yoksa ve state boşsa Business Day mantığı
      const now = new Date()
      const currentHour = now.getHours()
      
      const todayStart = new Date(now)
      if (currentHour < 5) {
        todayStart.setDate(todayStart.getDate() - 1)
      }
      todayStart.setHours(5, 0, 0, 0)
      
      const todayStartStr = todayStart.toISOString().split('T')[0]
      const todayEndStr = new Date().toISOString().split('T')[0]
      
      setRestaurantStartDate(todayStartStr)
      setRestaurantEndDate(todayEndStr)
    }
  }, [parentStartDate, parentEndDate, modalType, restaurantId])

  // 🔥 SADECE MODAL İLK AÇILDIĞINDA VERİ ÇEK (Tarih değişikliğinde değil!)
  useEffect(() => {
    if (modalType === 'restaurant' && restaurantId && restaurantStartDate && restaurantEndDate) {
      fetchRestaurantOrders(restaurantId)
      fetchRestaurantDebts(restaurantId)
    }
  }, [modalType, restaurantId]) // 🔥 Tarih dependency'lerini KALDIRDIK

  // Fetch Restaurant Orders - 🎯 ÜCRETLİ İPTALLER DAHİL
  const fetchRestaurantOrders = async (id: string) => {
    try {
      let query = supabase
        .from('packages')
        .select('*, couriers!delivered_by_courier_id(full_name)')
        .eq('restaurant_id', id)
        .or('status.eq.delivered,and(status.eq.cancelled,is_chargeable_cancellation.eq.true)')
        .order('delivered_at', { ascending: false })

      if (restaurantStartDate && restaurantEndDate) {
        const start = new Date(restaurantStartDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(restaurantEndDate)
        end.setHours(23, 59, 59, 999)
        query = query.gte('delivered_at', start.toISOString()).lte('delivered_at', end.toISOString())
      }

      const { data, error } = await query
      if (error) throw error

      const transformedData = (data || []).map((pkg: any) => ({
        ...pkg,
        courier_name: pkg.couriers?.full_name,
        couriers: undefined
      }))

      setSelectedRestaurantOrders(transformedData)
    } catch (error: any) {
      console.error('Restoran siparişleri yüklenirken hata:', error.message)
    }
  }

  // Fetch Restaurant Debts - ORİJİNAL MANTIK
  const fetchRestaurantDebts = async (id: string) => {
    setLoadingRestaurantDebts(true)
    try {
      const { data, error } = await supabase
        .from('restaurant_debts')
        .select('*')
        .eq('restaurant_id', id)
        .eq('status', 'pending')
        .order('debt_date', { ascending: true })

      if (error) throw error
      setRestaurantDebts(data || [])
    } catch (error: any) {
      console.error('Restoran borçları yüklenemedi:', error)
      setRestaurantDebts([])
    } finally {
      setLoadingRestaurantDebts(false)
    }
  }

  // Handle Restaurant Payment - YENİ MİMARİ + NÜKLEER HATA YAKALAMA
  const handleRestaurantPayment = async (amountOverride?: number) => {
    // 🔴 GUARD CLAUSE 1: Restaurant ID kontrolü
    if (!restaurantId) {
      const errorMsg = '❌ KRITIK HATA: Restoran ID bulunamadı!'
      console.error(errorMsg, { restaurantId })
      setErrorMessage(errorMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    // 🔴 GUARD CLAUSE 2: Ödeme tutarı kontrolü
    // Override varsa onu kullan, yoksa state'ten al
    const amountStr = amountOverride !== undefined ? String(amountOverride) : restaurantPaymentAmount
    const amount = parseFloat(amountStr)
    
    console.log('💰 ÖDEME TUTARI KONTROLÜ:', { 
      amountOverride, 
      restaurantPaymentAmount, 
      amountStr, 
      parsedAmount: amount,
      isNaN: isNaN(amount)
    })
    
    if (isNaN(amount) || amount <= 0) {
      const errorMsg = '❌ Geçerli bir tutar girin (0\'dan büyük olmalı)'
      console.error(errorMsg, { amountOverride, restaurantPaymentAmount, amountStr, parsedAmount: amount })
      setErrorMessage(errorMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    // 🔴 GUARD CLAUSE 3: Sipariş verisi kontrolü
    if (!selectedRestaurantOrders || selectedRestaurantOrders.length === 0) {
      const errorMsg = '❌ Önce tarih seçip "Filtrele" butonuna basın!'
      console.error('⚠️ Sipariş verisi yok:', { selectedRestaurantOrders, restaurantStartDate, restaurantEndDate })
      setErrorMessage(errorMsg)
      setTimeout(() => setErrorMessage(''), 5000)
      return
    }

    setRestaurantPaymentProcessing(true)
    
    try {
      // Finansal hesaplamalar - YENİ MANTIK
      const brutCiro = selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
      const toplamMasraf = selectedRestaurantOrders.reduce((sum, pkg) => {
        const price = (pkg as any).applied_price ?? 100
        return sum + price
      }, 0)
      const netHakedis = brutCiro - toplamMasraf
      
      // 🔥 NÜKLEER LOG: Gönderilecek veriyi logla
      console.log('💰 ÖDEME İŞLEMİ BAŞLIYOR:', {
        restaurantId,
        amount,
        brutCiro,
        toplamMasraf,
        netHakedis,
        orderCount: selectedRestaurantOrders.length,
        orderIds: selectedRestaurantOrders.map(o => o.id)
      })
      
      const result = await handleRestaurantPaymentService(restaurantId, {
        brutCiro,
        toplamMasraf,
        netHakedis,
        amountPaid: amount,
        orderIds: selectedRestaurantOrders.map(o => o.id),
        packageCount: selectedRestaurantOrders.length
      })

      // 🔥 NÜKLEER LOG: Sonucu logla
      console.log('💰 ÖDEME İŞLEMİ SONUCU:', result)

      if (result.success) {
        setSuccessMessage(result.message || '✅ Ödeme başarıyla kaydedildi')
        setTimeout(() => setSuccessMessage(''), 3000)
        
        setShowRestaurantPaymentModal(false)
        setRestaurantPaymentAmount('')
        
        // 🔥 REFETCH: Ana sayfayı ve modal verilerini yenile
        fetchRestaurants()
        fetchRestaurantDebts(restaurantId)
        if (restaurantStartDate && restaurantEndDate) {
          fetchRestaurantOrders(restaurantId)
        }
        
        // 🔥 TRIGGER: RestaurantDetailModal'ı yenile
        setRefetchTrigger(prev => prev + 1)
      } else {
        // 🔴 HATA DURUMU: Detaylı hata mesajı
        const errorMsg = result.error?.message || 'Ödeme kaydedilirken bilinmeyen hata oluştu'
        console.error('❌ ÖDEME BAŞARISIZ:', {
          error: result.error,
          errorMessage: errorMsg,
          restaurantId,
          amount
        })
        setErrorMessage(`❌ ÖDEME BAŞARISIZ: ${errorMsg}`)
        setTimeout(() => setErrorMessage(''), 8000)
        // MODAL AÇIK KALSIN - throw etme!
      }
    } catch (error: any) {
      // 🔴 CATCH BLOĞU: Beklenmeyen hatalar
      console.error('❌ BEKLENMEYEN ÖDEME HATASI:', {
        error,
        message: error.message,
        stack: error.stack,
        restaurantId,
        amount
      })
      setErrorMessage(`❌ BEKLENMEYEN HATA: ${error.message || 'Bilinmeyen hata'}`)
      setTimeout(() => setErrorMessage(''), 8000)
      // MODAL AÇIK KALSIN - throw etme!
    } finally {
      setRestaurantPaymentProcessing(false)
    }
  }

  // Handle Restaurant Debt Payment - YENİ MİMARİ (Masraf Ödemesi)
  const handleRestaurantDebtPayment = async () => {
    if (!restaurantId) return
    const amount = parseFloat(restaurantDebtPayAmount)
    if (isNaN(amount) || amount <= 0) return

    setRestaurantDebtPayProcessing(true)
    const result = await handleRestaurantDebtPaymentService(restaurantId, amount)

    if (result.success) {
      setSuccessMessage(result.message || '✅ Masraf ödemesi başarıyla kaydedildi')
      setShowRestaurantDebtPayModal(false)
      setRestaurantDebtPayAmount('')
      fetchRestaurants()
      fetchRestaurantDebts(restaurantId)
    } else {
      setErrorMessage('❌ Masraf ödenirken hata oluştu')
    }
    setRestaurantDebtPayProcessing(false)
  }

  return {
    // State
    selectedRestaurantOrders,
    restaurantDebts,
    loadingRestaurantDebts,
    restaurantStartDate,
    setRestaurantStartDate,
    restaurantEndDate,
    setRestaurantEndDate,
    showRestaurantPaymentModal,
    setShowRestaurantPaymentModal,
    restaurantPaymentAmount,
    setRestaurantPaymentAmount,
    restaurantPaymentProcessing,
    showRestaurantDebtPayModal,
    setShowRestaurantDebtPayModal,
    restaurantDebtPayAmount,
    setRestaurantDebtPayAmount,
    restaurantDebtPayProcessing,
    netAmountToPay,
    setNetAmountToPay,
    refetchTrigger,
    
    // Functions
    fetchRestaurantOrders,
    fetchRestaurantDebts,
    handleRestaurantPayment,
    handleRestaurantDebtPayment
  }
}
