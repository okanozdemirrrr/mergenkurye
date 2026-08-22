/**
 * @file src/app/admin/page.tsx
 * @description Admin Ana Sayfa
 */
'use client'

import { LiveTrackingTab } from './components/LiveTrackingTab'
import { useAdminData } from './AdminDataProvider'
import { useState } from 'react'
import { assignCourier, cancelOrder } from '@/services/orderService'
import { useAdminRealtimeNotifications } from '@/hooks/useAdminRealtimeNotifications'
import { useReadyPackageNotification } from '@/hooks/useReadyPackageNotification'
import ChangelogModal from '@/components/ChangelogModal'

export default function AdminPage() {
  const { packages, couriers, restaurants, isLoading, setSuccessMessage, setErrorMessage, fetchPackages, todayDeliveredCount, setCouriers } = useAdminData()
  const [selectedCouriers, setSelectedCouriers] = useState<{ [key: number]: string }>({})
  const [longDistancePackages, setLongDistancePackages] = useState<{ [key: number]: boolean }>({})
  const [assigningIds, setAssigningIds] = useState<Set<number>>(new Set())
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

  // Realtime bildirimler
  useAdminRealtimeNotifications(true)
  useReadyPackageNotification()

  const handleCourierChange = (packageId: number, courierId: string) => {
    setSelectedCouriers(prev => ({ ...prev, [packageId]: courierId }))
  }

  const handleLongDistanceChange = (packageId: number, isLongDistance: boolean) => {
    setLongDistancePackages(prev => ({ ...prev, [packageId]: isLongDistance }))
  }

  const handleAssignCourier = async (packageId: number) => {
    const courierId = selectedCouriers[packageId]
    if (!courierId) {
      setErrorMessage('Lütfen kurye seçin!')
      setTimeout(() => setErrorMessage(''), 3000)
      return
    }

    setAssigningIds(prev => new Set(prev).add(packageId))

    try {
      await assignCourier(packageId, courierId, {
        isLongDistance: longDistancePackages[packageId] ?? false,
      })
      setSuccessMessage('Kurye atandı!')
      setTimeout(() => setSuccessMessage(''), 2000)
      setLongDistancePackages(prev => {
        const next = { ...prev }
        delete next[packageId]
        return next
      })
      await fetchPackages()
    } catch (error: any) {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(''), 3000)
    } finally {
      setAssigningIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(packageId)
        return newSet
      })
    }
  }

  const handleCancelOrder = async (packageId: number, details: string = '') => {
    try {
      const result = await cancelOrder(packageId, details)
      if (result.cancelled) return
      if (result.success) {
        setSuccessMessage('Sipariş iptal edildi!')
        setTimeout(() => setSuccessMessage(''), 2000)
        await fetchPackages()
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Sipariş iptal edilemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  return (
    <LiveTrackingTab
      packages={packages}
      couriers={couriers}
      restaurants={restaurants}
      isLoading={isLoading}
      selectedCouriers={selectedCouriers}
      longDistancePackages={longDistancePackages}
      assigningIds={assigningIds}
      openDropdownId={openDropdownId}
      setOpenDropdownId={setOpenDropdownId}
      handleCourierChange={handleCourierChange}
      handleLongDistanceChange={handleLongDistanceChange}
      handleAssignCourier={handleAssignCourier}
      handleCancelOrder={handleCancelOrder}
      todayDeliveredCount={todayDeliveredCount}
      onCouriersOrderChange={setCouriers}
    />
  )
}
