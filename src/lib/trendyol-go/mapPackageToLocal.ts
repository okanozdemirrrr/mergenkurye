import { mapAddress } from './mapAddress'
import { mapLines, type ProductMappingLookup } from './mapLines'
import { mapPayment } from './mapPayment'
import { parseCustomerNote } from './parseCustomerNote'
import type { MappedLocalPackage, MappingReportAccumulator, TrendyolPackage } from './types'

export function epochMsToIso(ms: number | undefined | null): string | null {
  if (ms == null || !Number.isFinite(Number(ms))) return null
  return new Date(Number(ms)).toISOString()
}

function customerNameFrom(pkg: TrendyolPackage): string {
  const a = pkg.address
  const first = a?.firstName || pkg.customer?.firstName || ''
  const last = a?.lastName || pkg.customer?.lastName || ''
  const combined = `${first} ${last}`.trim()
  if (combined && !/^tgo yemek$/i.test(combined) && !/^trendyol yemek$/i.test(combined)) {
    return combined
  }
  if (pkg.orderCode) return `TY #${pkg.orderCode}`
  return 'Trendyol Müşteri'
}

function buildContent(mapped: {
  mutfak_notu: string | null
  kurye_notu: string | null
  genel_not: string | null
  address_description: string | null
}): string | null {
  const parts: string[] = []
  if (mapped.mutfak_notu) parts.push(`Mutfak: ${mapped.mutfak_notu}`)
  if (mapped.kurye_notu) parts.push(`Kurye: ${mapped.kurye_notu}`)
  if (mapped.genel_not) parts.push(mapped.genel_not)
  if (mapped.address_description) parts.push(`Tarif: ${mapped.address_description}`)
  return parts.length ? parts.join('\n') : null
}

function resolveLocalStatus(
  packageStatus: string,
  gecmisVeri: boolean
): MappedLocalPackage['local_status'] {
  const s = packageStatus
  if (s === 'Cancelled' || s === 'UnSupplied') return 'cancelled'
  if (gecmisVeri && s === 'Delivered') return 'delivered'
  if (gecmisVeri && (s === 'Cancelled' || s === 'UnSupplied')) return 'cancelled'
  return 'new_order'
}

export function createEmptyMappingReport(): MappingReportAccumulator {
  return {
    packagesRead: 0,
    maskedAddressCount: 0,
    courierNoteCount: 0,
    phoneFromDescriptionCount: 0,
    unmatchedProductCount: 0,
    paymentTypesSeen: {},
    unexpectedFields: [],
    cancelledCount: 0,
    testPackageCount: 0,
  }
}

const KNOWN_TOP_LEVEL = new Set([
  'id', 'supplierId', 'storeId', 'orderCode', 'orderId', 'orderNumber',
  'deliveryType', 'storePickupSelected', 'packageStatus', 'packageCreationDate',
  'packageModificationDate', 'preparationTime', 'eta', 'totalPrice',
  'totalDeliveryPrice', 'callCenterPhone', 'customerNote', 'testPackage',
  'coupon', 'promotions', 'userInformation', 'pickupEtaState',
  'estimatedPickupTimeMin', 'estimatedPickupTimeMax', 'cancelInfo',
  'isCourierNearby', 'address', 'payment', 'lines', 'customer',
])

export function mapPackageToLocal(
  pkg: TrendyolPackage,
  opts: {
    gecmisVeri?: boolean
    productLookup?: ProductMappingLookup
    report?: MappingReportAccumulator
  } = {}
): MappedLocalPackage {
  const gecmisVeri = Boolean(opts.gecmisVeri)
  const packageStatus = String(pkg.packageStatus || 'Created')
  const address = mapAddress(pkg.address, pkg.deliveryType)
  const payment = mapPayment(pkg.payment)
  const notes = parseCustomerNote(pkg.customerNote)
  const { items, unmatchedProductIds } = mapLines(pkg.lines, opts.productLookup)

  const isTest = Boolean(pkg.testPackage)
  const isGoOrMasked = address.isAddressMasked || (pkg.deliveryType || '').toUpperCase() === 'GO'
  const excludeFromCourierQueue =
    gecmisVeri || isTest || isGoOrMasked

  const orderNumber = pkg.orderNumber != null ? String(pkg.orderNumber) : null
  const amount = typeof pkg.totalPrice === 'number' ? pkg.totalPrice : 0
  const deliveryFee =
    typeof pkg.totalDeliveryPrice === 'number' ? pkg.totalDeliveryPrice : null

  const mapped: MappedLocalPackage = {
    trendyol_package_id: String(pkg.id),
    trendyol_order_code: pkg.orderCode != null ? String(pkg.orderCode) : null,
    trendyol_order_id: pkg.orderId != null ? String(pkg.orderId) : null,
    trendyol_order_number: orderNumber,
    external_order_number: orderNumber,
    order_number: pkg.orderCode != null ? String(pkg.orderCode) : orderNumber,
    delivery_type: pkg.deliveryType != null ? String(pkg.deliveryType) : null,
    package_status: packageStatus,
    customer_name: customerNameFrom(pkg),
    customer_phone: null,
    delivery_address: address.deliveryAddress,
    delivery_neighborhood: address.neighborhood,
    latitude: address.latitude,
    longitude: address.longitude,
    address_description: address.addressDescription,
    is_address_masked: address.isAddressMasked,
    call_center_phone: pkg.callCenterPhone || null,
    pin_code: orderNumber,
    adres_tarifinden_bulunan_telefon: address.phoneFromDescription,
    mutfak_notu: notes.mutfakNotu,
    kurye_notu: notes.kuryeNotu,
    genel_not: notes.genelNot,
    customer_note_ham: notes.ham || null,
    servis_istiyor_mu: notes.servisIstiyorMu,
    content: null,
    amount,
    subtotal: amount - (deliveryFee || 0),
    total: amount,
    delivery_fee: deliveryFee,
    payment_method: payment.paymentMethod,
    payment_type_raw: payment.paymentTypeRaw,
    meal_card_source: payment.mealCardSource,
    on_delivery_type: payment.onDeliveryType,
    courier_collects_payment: payment.courierCollectsPayment,
    coupon_seller_amount:
      typeof pkg.coupon?.totalSellerAmount === 'number'
        ? pkg.coupon.totalSellerAmount
        : null,
    items,
    unmatched_product_ids: unmatchedProductIds,
    is_test_order: isTest,
    exclude_from_courier_queue: excludeFromCourierQueue,
    cancel_info: pkg.cancelInfo || null,
    package_creation_at: epochMsToIso(pkg.packageCreationDate),
    package_modification_at: epochMsToIso(pkg.packageModificationDate),
    local_status: resolveLocalStatus(packageStatus, gecmisVeri),
    ham_payload: pkg,
    unknown_payment_type: payment.unknownPaymentType,
  }

  mapped.content = buildContent(mapped)

  const report = opts.report
  if (report) {
    report.packagesRead += 1
    if (mapped.is_address_masked) report.maskedAddressCount += 1
    if (mapped.kurye_notu) report.courierNoteCount += 1
    if (mapped.adres_tarifinden_bulunan_telefon) report.phoneFromDescriptionCount += 1
    report.unmatchedProductCount += unmatchedProductIds.length
    report.paymentTypesSeen[mapped.payment_type_raw] =
      (report.paymentTypesSeen[mapped.payment_type_raw] || 0) + 1
    if (mapped.local_status === 'cancelled') report.cancelledCount += 1
    if (isTest) report.testPackageCount += 1
    for (const key of Object.keys(pkg)) {
      if (!KNOWN_TOP_LEVEL.has(key) && !report.unexpectedFields.includes(key)) {
        report.unexpectedFields.push(key)
      }
    }
  }

  return mapped
}
