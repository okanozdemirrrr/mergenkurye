/**
 * @file src/app/admin/restoranlar/odemeler/page.tsx
 * @description Restoranların Ödemesi Sayfası
 * 
 * handleRestaurantClick artık opsiyonel startDate/endDate alıyor
 * ve bunları URL parametresi olarak modal'a iletiyor.
 */
'use client'

import { useRouter } from 'next/navigation'
import { RestaurantsTab } from '../../components/RestaurantsTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function RestoranOdemelerPage() {
  const router = useRouter()
  const { restaurants, deliveredPackages } = useAdminData()
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')

  // 🔥 TEK NAVIGATION: Tarihleri URL'ye dahil et
  const handleRestaurantClick = (id: number | string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    params.set('modal', 'restaurant')
    params.set('restaurantId', id.toString())
    if (startDate) params.set('parentStartDate', startDate)
    if (endDate) params.set('parentEndDate', endDate)
    router.push(`/admin/restoranlar/odemeler?${params.toString()}`)
  }

  const handleDebtPayClick = (id: number | string) => {
    router.push(`/admin/restoranlar/odemeler?modal=restaurant&restaurantId=${id}`)
  }

  return (
    <RestaurantsTab
      restaurants={restaurants}
      restaurantSubTab="payments"
      deliveredPackages={deliveredPackages}
      onRestaurantClick={handleRestaurantClick}
      onDebtPayClick={handleDebtPayClick}
      restaurantChartFilter={restaurantChartFilter}
      setRestaurantChartFilter={setRestaurantChartFilter}
    />
  )
}
