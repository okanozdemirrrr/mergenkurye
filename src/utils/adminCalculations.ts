/**
 * Admin panel yardımcıları — tahsilat hesabı calculations.ts üzerinden.
 */
import { Package } from '@/types'
import { calculateCourierCollectionTotals } from '@/utils/calculations'

export function calculateCashSummary(orders: Package[]) {
  const totals = calculateCourierCollectionTotals(orders)
  return {
    cashTotal: totals.cash,
    cardTotal: totals.card,
    ibanTotal: totals.iban,
    grandTotal: totals.total,
    orderCount: totals.count,
  }
}

export function calculateRestaurantSummary(orders: Package[]) {
  const restaurantCounts: { [key: string]: number } = {}

  orders.forEach((order) => {
    const restaurantName = order.restaurant?.name || 'Bilinmeyen Restoran'
    restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1
  })

  return Object.entries(restaurantCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }))
}
