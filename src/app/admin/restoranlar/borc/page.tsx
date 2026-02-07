/**
 * @file src/app/admin/restoranlar/borc/page.tsx
 * @description Restoranların Borcu Sayfası
 */
'use client'

import { useRouter } from 'next/navigation'
import { RestaurantsTab } from '../../components/RestaurantsTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function RestoranBorcPage() {
  const router = useRouter()
  const { restaurants, deliveredPackages } = useAdminData()
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')

  const handleRestaurantClick = (id: number | string) => {
    router.push(`/admin/restoranlar/borc?modal=restaurant&restaurantId=${id}`)
  }

  return (
    <RestaurantsTab
      restaurants={restaurants}
      restaurantSubTab="debt"
      deliveredPackages={deliveredPackages}
      onRestaurantClick={handleRestaurantClick}
      restaurantChartFilter={restaurantChartFilter}
      setRestaurantChartFilter={setRestaurantChartFilter}
    />
  )
}
