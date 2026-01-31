import { Package } from '@/types'

/**
 * Siparişlerden kasa özetini hesaplar
 */
export function calculateCashSummary(orders: Package[]) {
    const totalCash = orders
        .filter(o => o.payment_method === 'cash')
        .reduce((sum, o) => sum + (o.amount || 0), 0)

    const totalCard = orders
        .filter(o => o.payment_method === 'card')
        .reduce((sum, o) => sum + (o.amount || 0), 0)

    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0)

    return {
        totalCash,
        totalCard,
        totalAmount,
        orderCount: orders.length
    }
}
