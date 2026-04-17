/**
 * @file src/app/kurye/hooks/useCourierRealtime.ts
 * @description Kurye Realtime Bağlantı Hook'u
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface UseCourierRealtimeProps {
  courierId: string | null
  isLoggedIn: boolean
  fetchPackages: (isInitialLoad: boolean) => Promise<void>
  fetchDailyStats: () => Promise<void>
  fetchTodayDeliveredPackages: () => Promise<void>
  fetchLeaderboard: () => Promise<void>
  fetchUnsettledAmount: () => Promise<void>
  fetchCourierStatus: () => Promise<void>
}

export function useCourierRealtime({
  courierId,
  isLoggedIn,
  fetchPackages,
  fetchDailyStats,
  fetchTodayDeliveredPackages,
  fetchLeaderboard,
  fetchUnsettledAmount,
  fetchCourierStatus
}: UseCourierRealtimeProps) {
  // Realtime Setup - ORİJİNAL MANTIK
  useEffect(() => {
    if (!isLoggedIn || !courierId) return

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

    setupPackagesRealtimeWithRetry()
    setupCourierRealtimeWithRetry()

    return () => {
      console.log('🔴 Realtime dinleme durduruldu')
      
      // Tüm reconnect timer'larını temizle
      reconnectTimers.forEach(timer => clearTimeout(timer))
      
      // Kanalları temizle
      if (packagesChannel) supabase.removeChannel(packagesChannel)
      if (courierChannel) supabase.removeChannel(courierChannel)
    }
  }, [isLoggedIn, courierId])
}
