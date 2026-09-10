/**
 * @file src/app/admin/restoranlar/odemeler/page.tsx
 * @description Restoranların Ödemesi Sayfası
 *
 * handleRestaurantClick opsiyonel startDate/endDate alır ve bunları URL'ye ekler.
 * Sayfa yeniden mount olduğunda URL'deki tarihler okunarak RestaurantsTab
 * initialStartDate/initialEndDate prop'larıyla aynı filtreden başlar →
 * "Gün Sonu Al" basınca ciro/bakiye değerleri değişmez.
 */
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { RestaurantsTab } from '../../components/RestaurantsTab'
import { useAdminData } from '../../AdminDataProvider'
import { useState } from 'react'

export default function RestoranOdemelerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { restaurants, deliveredPackages } = useAdminData()
  const [restaurantChartFilter, setRestaurantChartFilter] = useState<'today' | 'week' | 'month'>('today')

  // 🎯 URL'den gelen tarihleri oku — modal açıldığında sayfa yeniden mount olsa
  // bile aynı tarih filtresiyle başlasın, değerler değişmesin
  const initialStartDate = searchParams.get('parentStartDate') || ''
  const initialEndDate = searchParams.get('parentEndDate') || ''

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
      initialStartDate={initialStartDate}
      initialEndDate={initialEndDate}
    />
  )
}
