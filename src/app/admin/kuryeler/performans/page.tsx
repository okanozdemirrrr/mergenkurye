/**
 * @file src/app/admin/kuryeler/performans/page.tsx
 * @description Kurye Performansları Sayfası
 */
'use client'

import { useRouter } from 'next/navigation'
import { CouriersTab } from '../../components/CouriersTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function KuryePerformansPage() {
  const router = useRouter()
  const { couriers, deliveredPackages } = useAdminData()
  const [courierEarningsFilter, setCourierEarningsFilter] = useState<'today' | 'week' | 'month'>('today')

  const handleCourierClick = (courierId: string) => {
    router.push(`/admin/kuryeler/performans?modal=courier&courierId=${courierId}`)
  }

  return (
    <CouriersTab
      couriers={couriers}
      courierSubTab="performance"
      deliveredPackages={deliveredPackages}
      onCourierClick={handleCourierClick}
      courierEarningsFilter={courierEarningsFilter}
      setCourierEarningsFilter={setCourierEarningsFilter}
    />
  )
}
