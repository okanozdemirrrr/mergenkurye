import { extractPhoneFromAddressDescription } from './extractPhoneFromAddressDescription'
import type { MappedAddress, TrendyolAddress } from './types'

const MASK_VALUES = new Set(['tgo yemek', 'trendyol yemek'])

function isMaskedValue(v: unknown): boolean {
  if (typeof v !== 'string') return false
  return MASK_VALUES.has(v.trim().toLowerCase())
}

function parseCoord(v: string | number | undefined | null): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * address1 TEK PARÇA kullanılır — parse/bölme yok.
 * apartmentNumber / floor / doorNumber kullanılmaz.
 */
export function mapAddress(
  address: TrendyolAddress | undefined,
  deliveryType: string | undefined
): MappedAddress {
  const dt = (deliveryType || '').toUpperCase()
  const a = address || {}

  const address1 = (a.address1 || '').trim()
  const fieldMasked =
    isMaskedValue(a.address1) ||
    isMaskedValue(a.city) ||
    isMaskedValue(a.district) ||
    isMaskedValue(a.neighborhood)

  // STORE + gerçek alanlar → maskeli değil; GO veya "TGO Yemek"/"Trendyol Yemek" → maskeli
  const masked = dt === 'GO' || fieldMasked

  const description =
    a.addressDescription && !isMaskedValue(a.addressDescription)
      ? a.addressDescription.trim()
      : a.addressDescription?.trim() || null

  return {
    deliveryAddress: address1 || (masked ? 'TGO Yemek (maskeli adres)' : 'Adres yok'),
    neighborhood: a.neighborhood && !isMaskedValue(a.neighborhood) ? a.neighborhood : null,
    city: a.city && !isMaskedValue(a.city) ? a.city : null,
    district: a.district && !isMaskedValue(a.district) ? a.district : null,
    latitude: masked ? null : parseCoord(a.latitude),
    longitude: masked ? null : parseCoord(a.longitude),
    addressDescription: description,
    isAddressMasked: masked,
    phoneFromDescription: extractPhoneFromAddressDescription(a.addressDescription),
  }
}
