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

/** Admin mutabakat ile aynı: teslim edilmiş, henüz kurye hesabı kapatılmamış paketler */
export async function fetchCourierUnsettledPackages(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = 'amount, payment_method'
) {
  const startIso = toFilterIso(startDate, 'start')
  const endIso = toFilterIso(endDate, 'end')

  return supabase
    .from('packages')
    .select(select)
    .eq('delivered_by_courier_id', courierId)
    .eq('status', 'delivered')
    .eq('is_paid_to_courier', false)
    .gte('delivered_at', startIso)
    .lte('delivered_at', endIso)
}

/** Geçmiş listesi: aynı dönemdeki tüm teslimler (okunabilirlik) */
export async function fetchCourierDeliveredPackages(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = '*, restaurants(name, phone, address)'
) {
  const startIso = toFilterIso(startDate, 'start')
  const endIso = toFilterIso(endDate, 'end')

  return supabase
    .from('packages')
    .select(select, { count: 'exact' })
    .eq('delivered_by_courier_id', courierId)
    .eq('status', 'delivered')
    .gte('delivered_at', startIso)
    .lte('delivered_at', endIso)
    .order('delivered_at', { ascending: false })
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

export function computePeriodPayableDebt(
  totals: PaymentTotals,
  settlementsPaid: number
): number {
  return Math.max(0, totals.total - Number(settlementsPaid || 0))
}

/** Tüm zamanlar cari borç (kurye ana ekranı vb.) */
export async function fetchCourierLifetimeDebt(
  supabase: SupabaseClient,
  courierId: string
): Promise<number> {
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('amount')
    .eq('delivered_by_courier_id', courierId)
    .eq('status', 'delivered')
    .eq('is_paid_to_courier', false)

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
