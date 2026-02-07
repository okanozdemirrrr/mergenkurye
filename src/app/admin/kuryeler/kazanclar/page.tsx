/**
 * @file src/app/admin/kuryeler/kazanclar/page.tsx
 * @description Kurye Kazançları Sayfası
 */
'use client'

import { useRouter } from 'next/navigation'
import { CouriersTab } from '../../components/CouriersTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function KuryeKazanclarPage() {
  const router = useRouter()
  const { couriers, deliveredPackages } = useAdminData()
  const [courierEarningsFilter, setCourierEarningsFilter] = useState<'today' | 'week' | 'month'>('today')

  const handleCourierClick = (courierId: string) => {
    router.push(`/admin/kuryeler/kazanclar?modal=courier&courierId=${courierId}`)
  }

  return (
    <CouriersTab
      couriers={couriers}
      courierSubTab="earnings"
      deliveredPackages={deliveredPackages}
      onCourierClick={handleCourierClick}
      courierEarningsFilter={courierEarningsFilter}
      setCourierEarningsFilter={setCourierEarningsFilter}
    />
  )
}
