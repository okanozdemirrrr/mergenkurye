/** Trendyol Go Meal API — salt okuma tipleri. Yazma endpoint'leri yok. */

export type TrendyolGoEnvironment = 'prod' | 'stage'

export type TrendyolPackageStatus =
  | 'Created'
  | 'Picking'
  | 'Invoiced'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'UnSupplied'

export const LIVE_POLL_STATUSES: TrendyolPackageStatus[] = [
  'Created',
  'Picking',
  'Invoiced',
  'Shipped',
  'Cancelled',
  'UnSupplied',
]

export const HISTORY_IMPORT_STATUSES: TrendyolPackageStatus[] = [
  'Delivered',
  'Cancelled',
]

export const PROD_BASE = 'https://api.tgoapis.com/integrator/order/meal'
export const STAGE_BASE = 'https://stageapi.tgoapis.com/integrator/order/meal'

export interface TrendyolGoAuth {
  apiKey?: string
  apiSecret?: string
  /** Panelde verilen hazır base64 Basic token (API Key:Secret) */
  basicToken?: string
  agentName: string
  executorEmail: string
}

export interface TrendyolCoupon {
  totalSellerAmount?: number
  [key: string]: unknown
}

export interface TrendyolPromotion {
  [key: string]: unknown
}

export interface TrendyolModifierProduct {
  name?: string
  price?: number
  productId?: number | string
  modifierGroupId?: number | string
  modifierProducts?: TrendyolModifierProduct[]
  [key: string]: unknown
}

export interface TrendyolLineItem {
  packageItemId?: string
  lineItemId?: string
  isCancelled?: boolean
  coupon?: TrendyolCoupon
  promotions?: TrendyolPromotion[]
  [key: string]: unknown
}

export interface TrendyolLine {
  price?: number
  unitSellingPrice?: number
  productId?: number | string
  name?: string
  description?: string
  items?: TrendyolLineItem[]
  modifierProducts?: TrendyolModifierProduct[]
  extraIngredients?: Array<{ name?: string; price?: number; [key: string]: unknown }>
  removedIngredients?: Array<{ name?: string; [key: string]: unknown }>
  [key: string]: unknown
}

export interface TrendyolAddress {
  address1?: string
  apartmentNumber?: string
  floor?: string
  doorNumber?: string
  city?: string
  district?: string
  neighborhood?: string
  postalCode?: string
  latitude?: string | number
  longitude?: string | number
  addressDescription?: string
  /** Call center ile aynı — müşteri telefonu DEĞİL */
  phone?: string
  firstName?: string
  lastName?: string
  company?: string
  [key: string]: unknown
}

export interface TrendyolPayment {
  paymentType?: string
  mealCard?: { cardSourceType?: string; [key: string]: unknown }
  onDelivery?: { paymentType?: string; type?: string; [key: string]: unknown } | string
  [key: string]: unknown
}

export interface TrendyolCancelInfo {
  reasonCode?: string | number
  reasonText?: string
  reason?: string
  cancelledBy?: string
  [key: string]: unknown
}

export interface TrendyolPackage {
  id: string
  supplierId?: number
  storeId?: string | number
  orderCode?: string
  orderId?: string | number
  orderNumber?: string | number
  deliveryType?: string
  storePickupSelected?: boolean
  packageStatus?: string
  packageCreationDate?: number
  packageModificationDate?: number
  preparationTime?: number
  eta?: number
  totalPrice?: number
  totalDeliveryPrice?: number
  callCenterPhone?: string
  customerNote?: string
  testPackage?: boolean
  coupon?: TrendyolCoupon
  promotions?: TrendyolPromotion[]
  userInformation?: { appName?: string; [key: string]: unknown }
  pickupEtaState?: string
  estimatedPickupTimeMin?: number
  estimatedPickupTimeMax?: number
  cancelInfo?: TrendyolCancelInfo | null
  isCourierNearby?: boolean
  address?: TrendyolAddress
  payment?: TrendyolPayment
  lines?: TrendyolLine[]
  customer?: { firstName?: string; lastName?: string; [key: string]: unknown }
  [key: string]: unknown
}

export interface TrendyolPackagesResponse {
  totalCount?: number
  totalPages?: number
  page?: number
  size?: number
  content?: TrendyolPackage[]
}

export interface ParsedCustomerNote {
  mutfakNotu: string | null
  kuryeNotu: string | null
  genelNot: string | null
  servisIstiyorMu: boolean | null
  ham: string
}

export interface MappedPayment {
  paymentTypeRaw: string
  paymentMethod: 'cash' | 'card' | 'iban' | 'online' | null
  mealCardSource: string | null
  onDeliveryType: string | null
  courierCollectsPayment: boolean
  unknownPaymentType: boolean
}

export interface MappedAddress {
  deliveryAddress: string
  neighborhood: string | null
  city: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  addressDescription: string | null
  isAddressMasked: boolean
  phoneFromDescription: string | null
}

export interface MappedLineItem {
  product_id?: string
  product_name: string
  quantity: number
  price: number
  base_price?: number
  selected_options: Array<{
    group_name?: string
    option_name: string
    price_diff?: number
  }>
  item_note?: string | null
  trendyol_product_id: string
  unmatched: boolean
  is_cancelled: boolean
  line_coupon_amount?: number | null
}

export interface MappingReportAccumulator {
  packagesRead: number
  maskedAddressCount: number
  courierNoteCount: number
  phoneFromDescriptionCount: number
  unmatchedProductCount: number
  paymentTypesSeen: Record<string, number>
  unexpectedFields: string[]
  cancelledCount: number
  testPackageCount: number
}

export interface MappedLocalPackage {
  trendyol_package_id: string
  trendyol_order_code: string | null
  trendyol_order_id: string | null
  trendyol_order_number: string | null
  external_order_number: string | null
  order_number: string | null
  delivery_type: string | null
  package_status: string
  customer_name: string
  customer_phone: null
  delivery_address: string
  delivery_neighborhood: string | null
  latitude: number | null
  longitude: number | null
  address_description: string | null
  is_address_masked: boolean
  call_center_phone: string | null
  pin_code: string | null
  adres_tarifinden_bulunan_telefon: string | null
  mutfak_notu: string | null
  kurye_notu: string | null
  genel_not: string | null
  customer_note_ham: string | null
  servis_istiyor_mu: boolean | null
  content: string | null
  amount: number
  subtotal: number
  total: number
  delivery_fee: number | null
  payment_method: 'cash' | 'card' | 'iban' | 'online' | null
  payment_type_raw: string
  meal_card_source: string | null
  on_delivery_type: string | null
  courier_collects_payment: boolean
  coupon_seller_amount: number | null
  items: MappedLineItem[]
  unmatched_product_ids: string[]
  is_test_order: boolean
  exclude_from_courier_queue: boolean
  cancel_info: TrendyolCancelInfo | null
  package_creation_at: string | null
  package_modification_at: string | null
  local_status: 'new_order' | 'cancelled' | 'delivered'
  ham_payload: TrendyolPackage
  unknown_payment_type: boolean
}
