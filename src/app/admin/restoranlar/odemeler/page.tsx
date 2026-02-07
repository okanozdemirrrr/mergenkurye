/**
 * @file src/app/admin/restoranlar/odemeler/page.tsx
 * @description Restoranların Ödemesi Sayfası
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

  const handleRestaurantClick = (id: number | string) => {
    router.push(`/admin/restoranlar/odemeler?modal=restaurant&restaurantId=${id}`)
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
