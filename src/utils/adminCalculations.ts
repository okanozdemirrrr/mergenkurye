/**
 * @file src/utils/adminCalculations.ts
 * @description Admin Panel Hesaplama Fonksiyonları
 * 
 * ÖNEMLİ: Bu dosyadaki tüm hesaplama mantıkları AdminModals.tsx'ten
 * birebir taşınmıştır. HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { Package } from '@/types'

/**
 * Nakit/Kart/Toplam hesaplama
 * ORİJİNAL MANTIK: AdminModals.tsx calculateCashSummary()
 */
export function calculateCashSummary(orders: Package[]) {
  const cashTotal = orders
    .filter(order => order.payment_method === 'cash')
    .reduce((sum, order) => sum + (order.amount || 0), 0)

  const cardTotal = orders
    .filter(order => order.payment_method === 'card')
    .reduce((sum, order) => sum + (order.amount || 0), 0)

  const ibanTotal = orders
    .filter(order => order.payment_method === 'iban')
    .reduce((sum, order) => sum + (order.amount || 0), 0)

  const grandTotal = orders
    .filter(order => !order.settled_at)
    .reduce((sum, order) => sum + (order.amount || 0), 0)

  return { cashTotal, cardTotal, ibanTotal, grandTotal }
}

/**
 * Restoran bazlı sipariş sayısı hesaplama
 * ORİJİNAL MANTIK: AdminModals.tsx calculateRestaurantSummary()
 */
export function calculateRestaurantSummary(orders: Package[]) {
  const restaurantCounts: { [key: string]: number } = {}
  
  orders.forEach(order => {
    const restaurantName = order.restaurant?.name || 'Bilinmeyen Restoran'
    restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1
  })
  
  return Object.entries(restaurantCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }))
}
