/**
 * @file src/app/admin/gecmis/page.tsx
 * @description Geçmiş Siparişler Sayfası
 */
'use client'

import { HistoryTab } from '../components/HistoryTab'
import { useAdminData } from '../AdminDataProvider'
import { useState } from 'react'
import { cancelOrder } from '@/services/orderService'

export default function GecmisPage() {
  const { deliveredPackages, setSuccessMessage, setErrorMessage, fetchDeliveredPackages } = useAdminData()
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

  const handleCancelOrder = async (packageId: number, details: string = '') => {
    try {
      const result = await cancelOrder(packageId, details)
      if (result.cancelled) return
      if (result.success) {
        setSuccessMessage('Sipariş iptal edildi!')
        setTimeout(() => setSuccessMessage(''), 2000)
        await fetchDeliveredPackages()
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Sipariş iptal edilemedi')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  return (
    <HistoryTab
      deliveredPackages={deliveredPackages}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      openDropdownId={openDropdownId}
      setOpenDropdownId={setOpenDropdownId}
      handleCancelOrder={handleCancelOrder}
    />
  )
}
