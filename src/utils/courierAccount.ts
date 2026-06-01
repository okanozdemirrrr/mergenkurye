import type { SupabaseClient } from '@supabase/supabase-js'

/** datetime-local veya YYYY-MM-DD → ISO (sınır saatleri korunur) */
export function toFilterIso(value: string, boundary: 'start' | 'end'): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  if (!value.includes('T')) {
    if (boundary === 'start') d.setHours(0, 0, 0, 0)
    else d.setHours(23, 59, 59, 999)
  }
  return d.toISOString()
}

export function toDateTimeLocalValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

/** İş günü: 05:00 — ertesi gün 04:59 (kurye paneli ile aynı) */
export function getBusinessDayDateTimeLocal(now = new Date()) {
  const startDate = new Date(now)
  if (startDate.getHours() < 5) {
    startDate.setDate(startDate.getDate() - 1)
  }
  startDate.setHours(5, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(4, 59, 0, 0)

  return {
    start: toDateTimeLocalValue(startDate),
    end: toDateTimeLocalValue(endDate),
  }
}

export function toDateOnly(value: string): string {
  if (!value) return value
  return value.includes('T') ? value.split('T')[0] : value
}

export function settlementPaidAmount(row: {
  amount_paid?: number | null
  received_amount?: number | null
}): number {
  return Number(row.received_amount ?? row.amount_paid ?? 0)
}

export type PaymentTotals = {
  cash: number
  card: number
  iban: number
  count: number
  total: number
}

export type PeriodAccount = PaymentTotals & {
  settlementsPaid: number
  payableDebt: number
}

export function sumCollectionByPaymentMethod(
  packages: { amount?: number | null; payment_method?: string | null }[]
): PaymentTotals {
  const cash = packages
    .filter((p) => p.payment_method === 'cash')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const card = packages
    .filter((p) => p.payment_method === 'card')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const iban = packages
    .filter((p) => p.payment_method === 'iban')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  return { cash, card, iban, count: packages.length, total: cash + card + iban }
}

export function computePeriodPayableDebt(
  totals: PaymentTotals,
  settlementsPaid: number
): number {
  return Math.max(0, totals.total - Number(settlementsPaid || 0))
}

/** Teslimatı bu kuryeye ait say (delivered_by öncelikli, eski kayıtlar courier_id) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCourierDeliveryFilter(query: any, courierId: string) {
  return query.or(
    `delivered_by_courier_id.eq.${courierId},and(courier_id.eq.${courierId},delivered_by_courier_id.is.null)`
  )
}

/**
 * Mutabakat tahsilatı: teslim edilmiş + settled_at boş (admin calculateCashSummary ile aynı).
 * NOT: is_paid_to_courier = kurye HAKEDİŞ ödemesi, mutabakat değil!
 */
export async function fetchCourierCollectionPackages(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = 'amount, payment_method'
) {
  const startIso = toFilterIso(startDate, 'start')
  const endIso = toFilterIso(endDate, 'end')

  let query = supabase
    .from('packages')
    .select(select)
    .eq('status', 'delivered')
    .is('settled_at', null)
    .gte('delivered_at', startIso)
    .lte('delivered_at', endIso)

  query = applyCourierDeliveryFilter(query, courierId)
  return query
}

/** @deprecated fetchCourierCollectionPackages kullan */
export const fetchCourierUnsettledPackages = fetchCourierCollectionPackages

/** Geçmiş listesi: dönemdeki tüm teslimler */
export async function fetchCourierDeliveredPackages(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = '*, restaurants(name, phone, address)'
) {
  const startIso = toFilterIso(startDate, 'start')
  const endIso = toFilterIso(endDate, 'end')

  let query = supabase
    .from('packages')
    .select(select, { count: 'exact' })
    .eq('status', 'delivered')
    .gte('delivered_at', startIso)
    .lte('delivered_at', endIso)
    .order('delivered_at', { ascending: false })

  query = applyCourierDeliveryFilter(query, courierId)
  return query
}

export async function fetchCourierPeriodSettlements(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string
) {
  const rangeStart = toDateOnly(startDate)
  const rangeEnd = toDateOnly(endDate)

  const withReceived = await supabase
    .from('courier_settlements')
    .select('amount_paid, received_amount')
    .eq('courier_id', courierId)
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)

  if (!withReceived.error) return withReceived

  return supabase
    .from('courier_settlements')
    .select('amount_paid')
    .eq('courier_id', courierId)
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)
}

/** Admin + kurye: aynı dönem mutabakat özeti */
export async function fetchCourierPeriodAccount(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string
): Promise<PeriodAccount> {
  const { data: packages, error: packagesError } = await fetchCourierCollectionPackages(
    supabase,
    courierId,
    startDate,
    endDate,
    'amount, payment_method'
  )
  if (packagesError) throw packagesError

  const totals = sumCollectionByPaymentMethod(
    (packages || []) as { amount?: number | null; payment_method?: string | null }[]
  )

  const { data: settlements, error: settlementsError } = await fetchCourierPeriodSettlements(
    supabase,
    courierId,
    startDate,
    endDate
  )
  if (settlementsError) throw settlementsError

  const settlementsPaid = (settlements || []).reduce(
    (sum, s) => sum + settlementPaidAmount(s),
    0
  )

  return {
    ...totals,
    settlementsPaid,
    payableDebt: computePeriodPayableDebt(totals, settlementsPaid),
  }
}

/** Mutabakat sonrası: dönemdeki açık tahsilat paketlerini kapat */
export async function markCourierCollectionSettled(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string
) {
  const startIso = toFilterIso(startDate, 'start')
  const endIso = toFilterIso(endDate, 'end')
  const settledAt = new Date().toISOString()

  let query = supabase
    .from('packages')
    .update({ settled_at: settledAt })
    .eq('status', 'delivered')
    .is('settled_at', null)
    .gte('delivered_at', startIso)
    .lte('delivered_at', endIso)

  query = applyCourierDeliveryFilter(query, courierId)
  return query
}

/** Tüm zamanlar: kapatılmamış tahsilat − tüm mutabakat ödemeleri */
export async function fetchCourierLifetimeDebt(
  supabase: SupabaseClient,
  courierId: string
): Promise<number> {
  let pkgQuery = supabase
    .from('packages')
    .select('amount')
    .eq('status', 'delivered')
    .is('settled_at', null)

  pkgQuery = applyCourierDeliveryFilter(pkgQuery, courierId)
  const { data: packages, error: packagesError } = await pkgQuery
  if (packagesError) throw packagesError

  const totalOwed = (packages || []).reduce((sum, pkg) => sum + Number(pkg.amount || 0), 0)

  const settlementsQuery = await supabase
    .from('courier_settlements')
    .select('amount_paid, received_amount')
    .eq('courier_id', courierId)

  if (settlementsQuery.error) {
    const fallback = await supabase
      .from('courier_settlements')
      .select('amount_paid')
      .eq('courier_id', courierId)
    if (fallback.error) throw fallback.error
    const totalPaid = (fallback.data || []).reduce(
      (sum, s) => sum + settlementPaidAmount(s),
      0
    )
    return Math.max(0, totalOwed - totalPaid)
  }

  const totalPaid = (settlementsQuery.data || []).reduce(
    (sum, s) => sum + settlementPaidAmount(s),
    0
  )

  return Math.max(0, totalOwed - totalPaid)
}
