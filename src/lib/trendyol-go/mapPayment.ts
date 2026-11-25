import type { MappedPayment, TrendyolPayment } from './types'

const ONLINE_NO_COLLECT = new Set(['PAY_WITH_CARD', 'PAY_WITH_MEAL_CARD'])
const ON_DELIVERY = 'PAY_WITH_ON_DELIVERY'

function resolveOnDeliveryType(payment: TrendyolPayment | undefined): string | null {
  if (!payment?.onDelivery) return null
  if (typeof payment.onDelivery === 'string') return payment.onDelivery
  return (
    payment.onDelivery.paymentType ||
    payment.onDelivery.type ||
    (payment.onDelivery as { onDeliveryPaymentType?: string }).onDeliveryPaymentType ||
    null
  )
}

export function mapPayment(payment: TrendyolPayment | undefined): MappedPayment {
  const raw = (payment?.paymentType || 'bilinmeyen').toString()
  const mealCardSource = payment?.mealCard?.cardSourceType ?? null
  const onDeliveryType = resolveOnDeliveryType(payment)

  if (raw === 'PAY_WITH_CARD') {
    return {
      paymentTypeRaw: raw,
      paymentMethod: 'online',
      mealCardSource,
      onDeliveryType,
      courierCollectsPayment: false,
      unknownPaymentType: false,
    }
  }

  if (raw === 'PAY_WITH_MEAL_CARD') {
    return {
      paymentTypeRaw: raw,
      paymentMethod: 'online',
      mealCardSource,
      onDeliveryType,
      courierCollectsPayment: false,
      unknownPaymentType: false,
    }
  }

  if (raw === ON_DELIVERY) {
    const od = (onDeliveryType || '').toUpperCase()
    let paymentMethod: MappedPayment['paymentMethod'] = 'cash'
    if (od === 'CARD' || od.includes('CARD') || od.includes('CODE') || od.includes('MOBILE')) {
      // Kapıda kart / yemek kartı — kurye tahsil eder; yerel payment_method card
      paymentMethod = od === 'CASH' ? 'cash' : od === 'CARD' ? 'card' : 'card'
    }
    if (od === 'CASH') paymentMethod = 'cash'

    return {
      paymentTypeRaw: raw,
      paymentMethod,
      mealCardSource,
      onDeliveryType,
      courierCollectsPayment: true,
      unknownPaymentType: false,
    }
  }

  // Bilinmeyen — siparişi düşürme
  return {
    paymentTypeRaw: raw === 'bilinmeyen' || !payment?.paymentType ? 'bilinmeyen' : raw,
    paymentMethod: ONLINE_NO_COLLECT.has(raw) ? 'online' : null,
    mealCardSource,
    onDeliveryType,
    courierCollectsPayment: false,
    unknownPaymentType: true,
  }
}
