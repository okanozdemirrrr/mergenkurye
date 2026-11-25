/** Varsayılan IVR arama şablonu — virgül ≈ 2 sn duraklama */
export const DEFAULT_CALL_DIAL_TEMPLATE = '{callCenterPhone},,,{pinCode}#'

/** "0212 365 34 03" → "02123653403" */
export function normalizeCallCenterPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/[\s\-().]/g, '')
}

/**
 * Şablondan tel: href üretir.
 * Şablon boş veya pin yoksa yalnızca normalize edilmiş numarayı döner (hata yok).
 */
export function buildCustomerCallHref(opts: {
  template?: string | null
  callCenterPhone?: string | null
  pinCode?: string | null
}): string | null {
  const phone = normalizeCallCenterPhone(opts.callCenterPhone)
  if (!phone) return null

  const pin = (opts.pinCode || '').trim()
  const template = (opts.template || '').trim()

  if (!template || !pin) {
    return `tel:${phone}`
  }

  const filled = template
    .replace(/\{callCenterPhone\}/g, phone)
    .replace(/\{pinCode\}/g, pin)

  return `tel:${filled}`
}
