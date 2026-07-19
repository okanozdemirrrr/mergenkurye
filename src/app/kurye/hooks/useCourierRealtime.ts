/**
 * @file src/app/kurye/hooks/useCourierRealtime.ts
 * @description Kurye Realtime Bağlantı Hook'u
 *
 * - packages: INSERT/UPDATE/DELETE (*)
 * - Bağlantı koptuğunda yeniden abone olur
 * - Ağ / visibility dönüşünde resync tetikler
 */

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface UseCourierRealtimeProps {
  courierId: string | null
  isLoggedIn: boolean
  fetchPackages: (isInitialLoad: boolean) => Promise<void>
  fetchDailyStats: () => Promise<void>
  fetchTodayDeliveredPackages: () => Promise<void>
  fetchUnsettledAmount: () => Promise<void>
  fetchCourierStatus: () => Promise<void>
  onConnectionChange?: (connected: boolean) => void
  onPackageRealtimeRow?: (row: Record<string, unknown> | null, eventType: string) => void
}

export function useCourierRealtime({
  courierId,
  isLoggedIn,
  fetchPackages,
  fetchDailyStats,
  fetchTodayDeliveredPackages,
  fetchUnsettledAmount,
  fetchCourierStatus,
  onConnectionChange,
  onPackageRealtimeRow,
}: UseCourierRealtimeProps) {
  useEffect(() => {
    if (!isLoggedIn || !courierId) return

    let packagesChannel: ReturnType<typeof supabase.channel> | null = null
    let courierChannel: ReturnType<typeof supabase.channel> | null = null
    let disposed = false
    const reconnectTimers: ReturnType<typeof setTimeout>[] = []
    const reconnectPending = { packages: false, courier: false }

    const sameCourier = (value: unknown) => String(value ?? '') === String(courierId)

    const scheduleReconnect = (key: keyof typeof reconnectPending, fn: () => void) => {
      if (disposed || reconnectPending[key]) return
      reconnectPending[key] = true
      const timer = setTimeout(() => {
        reconnectPending[key] = false
        fn()
      }, 3000)
      reconnectTimers.push(timer)
    }

    const handlePackageChange = async (payload: {
      eventType: string
      new?: Record<string, unknown>
      old?: Record<string, unknown>
    }) => {
      const newRow = payload.new
      const oldRow = payload.old

      if (newRow?.status === 'delivered' || newRow?.status === 'cancelled') {
        if (sameCourier(newRow?.courier_id) || sameCourier(oldRow?.courier_id)) {
          onPackageRealtimeRow?.(newRow, payload.eventType)
          await Promise.all([fetchDailyStats(), fetchTodayDeliveredPackages(), fetchUnsettledAmount()])
        }
        return
      }

      const isRelevant = sameCourier(newRow?.courier_id) || sameCourier(oldRow?.courier_id)
      if (!isRelevant) return

      onPackageRealtimeRow?.(newRow ?? null, payload.eventType)

      await Promise.all([
        fetchPackages(false),
        fetchDailyStats(),
        fetchTodayDeliveredPackages(),
        fetchUnsettledAmount(),
      ])
    }

    const handleCourierStatusChange = async (payload: {
      old?: { status?: string; is_active?: boolean }
      new?: { status?: string; is_active?: boolean }
    }) => {
      const oldRecord = payload.old
      const newRecord = payload.new

      if (oldRecord && newRecord) {
        const statusChanged = oldRecord.status !== newRecord.status
        const activeChanged = oldRecord.is_active !== newRecord.is_active
        if (!statusChanged && !activeChanged) return
      }

      await fetchCourierStatus()
    }

    const setupPackagesRealtime = async () => {
      if (disposed) return
      try {
        if (packagesChannel) {
          await supabase.removeChannel(packagesChannel)
          packagesChannel = null
        }

        packagesChannel = supabase
          .channel(`courier-packages-${courierId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'packages' },
            handlePackageChange
          )

        packagesChannel.subscribe((status: string) => {
          if (disposed) return
          if (status === 'SUBSCRIBED') {
            onConnectionChange?.(true)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            onConnectionChange?.(false)
            scheduleReconnect('packages', () => {
              void setupPackagesRealtime()
            })
          }
        })
      } catch {
        onConnectionChange?.(false)
        scheduleReconnect('packages', () => {
          void setupPackagesRealtime()
        })
      }
    }

    const setupCourierRealtime = async () => {
      if (disposed) return
      try {
        if (courierChannel) {
          await supabase.removeChannel(courierChannel)
          courierChannel = null
        }

        courierChannel = supabase
          .channel(`courier-status-${courierId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'couriers',
              filter: `id=eq.${courierId}`,
            },
            handleCourierStatusChange
          )

        courierChannel.subscribe((status: string) => {
          if (disposed) return
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            scheduleReconnect('courier', () => {
              void setupCourierRealtime()
            })
          }
        })
      } catch {
        scheduleReconnect('courier', () => {
          void setupCourierRealtime()
        })
      }
    }

    const resync = () => {
      if (disposed) return
      void setupPackagesRealtime()
      void setupCourierRealtime()
      void fetchPackages(false)
    }

    const handleOnline = () => resync()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resync()
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    void setupPackagesRealtime()
    void setupCourierRealtime()

    return () => {
      disposed = true
      reconnectTimers.forEach(clearTimeout)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (packagesChannel) supabase.removeChannel(packagesChannel)
      if (courierChannel) supabase.removeChannel(courierChannel)
    }
  }, [isLoggedIn, courierId])
}
