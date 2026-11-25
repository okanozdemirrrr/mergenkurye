/**
 * Liste/kart: Trendyol (ve Galaxy via TGO) siparişlerinde kısa kod.
 * Detay: 11 haneli order_number.
 */

type OrderDisplayPkg = {
  order_number?: string | null
  trendyol_order_code?: string | null
  platform?: string | null
  source?: string | null
  trendyol_app_name?: string | null
}

export function isTrendyolGoOrder(pkg: OrderDisplayPkg): boolean {
  if (pkg.source === 'trendyol_go') return true
  if (pkg.trendyol_order_code) return true
  if (pkg.trendyol_app_name) return true
  return (pkg.platform || '').toLowerCase().includes('trendyol')
}

/** Kart / liste / kurye — kısa kod (örn. 003) */
export function getDisplayOrderCode(pkg: OrderDisplayPkg): string {
  if (pkg.trendyol_order_code) return String(pkg.trendyol_order_code)
  return pkg.order_number || '......'
}

/** Detay ekranı — tam numara (11 hane) varsa onu, yoksa kısa kod */
export function getDetailOrderNumber(pkg: OrderDisplayPkg): string {
  if (isTrendyolGoOrder(pkg) && pkg.order_number) return String(pkg.order_number)
  return getDisplayOrderCode(pkg)
}
