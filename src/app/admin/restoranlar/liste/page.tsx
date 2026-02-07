/**
 * @file src/app/admin/restoranlar/liste/page.tsx
 * @description Restoranlar Listesi Sayfası
 */
'use client'

import { useRouter } from 'next/navigation'
import { RestaurantsTab } from '../../components/RestaurantsTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function RestoranlarListePage() {
  const router = useRouter()
  const { restaurants, deliveredPackages } = useAdminData()
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')

  const handleRestaurantClick = (id: number | string) => {
    router.push(`/admin/restoranlar/liste?modal=restaurant&restaurantId=${id}`)
  }

  return (
    <RestaurantsTab
      restaurants={restaurants}
      restaurantSubTab="list"
      deliveredPackages={deliveredPackages}
      onRestaurantClick={handleRestaurantClick}
      restaurantChartFilter={restaurantChartFilter}
      setRestaurantChartFilter={setRestaurantChartFilter}
    />
  )
}
