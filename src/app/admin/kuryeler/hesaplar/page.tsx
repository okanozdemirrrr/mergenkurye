/**
 * @file src/app/admin/kuryeler/hesaplar/page.tsx
 * @description Kurye Hesapları Sayfası
 */
'use client'

import { useRouter } from 'next/navigation'
import { CouriersTab } from '../../components/CouriersTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function KuryeHesaplarPage() {
  const router = useRouter()
  const { couriers, deliveredPackages } = useAdminData()
  const [courierEarningsFilter, setCourierEarningsFilter] = useState<'today' | 'week' | 'month'>('today')

  const handleCourierClick = (courierId: string) => {
    router.push(`/admin/kuryeler/hesaplar?modal=courier&courierId=${courierId}`)
  }

  return (
    <CouriersTab
      couriers={couriers}
      courierSubTab="accounts"
      deliveredPackages={deliveredPackages}
      onCourierClick={handleCourierClick}
      courierEarningsFilter={courierEarningsFilter}
      setCourierEarningsFilter={setCourierEarningsFilter}
    />
  )
}
