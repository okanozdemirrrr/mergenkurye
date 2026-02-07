/**
 * @file src/app/admin/restoranlar/detaylar/page.tsx
 * @description Restoran Sipariş Detayları Sayfası
 */
'use client'

import { useRouter } from 'next/navigation'
import { RestaurantsTab } from '../../components/RestaurantsTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function RestoranDetaylarPage() {
  const router = useRouter()
  const { restaurants, deliveredPackages } = useAdminData()
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')

  const handleRestaurantClick = (id: number | string) => {
    router.push(`/admin/restoranlar/detaylar?modal=restaurant&restaurantId=${id}`)
  }

  return (
    <RestaurantsTab
      restaurants={restaurants}
      restaurantSubTab="details"
      deliveredPackages={deliveredPackages}
      onRestaurantClick={handleRestaurantClick}
      restaurantChartFilter={restaurantChartFilter}
      setRestaurantChartFilter={setRestaurantChartFilter}
    />
  )
}
