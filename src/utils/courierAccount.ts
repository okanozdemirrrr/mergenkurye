import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateCourierCollectionTotals,
  calculatePeriodAccount,
  calculateSettlementsPaid,
  getBusinessDayDateTimeLocal,
  parseFilterInputToUtcIso,
  resolveFilterUtcRange,
  settlementPaidAmount,
  toDateOnly,
  toDateTimeLocalValue,
  type PackageLike,
  type PeriodAccountTotals,
  type SettlementLike,
} from '@/utils/calculations'

export {
  getBusinessDayDateTimeLocal,
  parseFilterInputToUtcIso,
  resolveFilterUtcRange,
  settlementPaidAmount,
  toDateOnly,
  toDateTimeLocalValue,
  wallClockToUtcIso,
} from '@/utils/calculations'

export type PaymentTotals = import('@/utils/calculations').CollectionTotals
export type PeriodAccount = PeriodAccountTotals

/** @deprecated calculations.parseFilterInputToUtcIso kullan */
export function toFilterIso(value: string, boundary: 'start' | 'end'): string {
  return parseFilterInputToUtcIso(value, boundary)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCourierDeliveryFilter(query: any, courierId: string) {
  return query.or(
    `delivered_by_courier_id.eq.${courierId},and(courier_id.eq.${courierId},delivered_by_courier_id.is.null)`
  )
}

export async function fetchCourierCollectionPackages(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = 'amount, payment_method, status, is_chargeable_cancellation'
) {
  const { startIso, endIso } = resolveFilterUtcRange(startDate, endDate)

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

export const fetchCourierUnsettledPackages = fetchCourierCollectionPackages

export async function fetchCourierDeliveredPackages(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = '*, restaurants(name, phone, address)'
) {
  const { startIso, endIso } = resolveFilterUtcRange(startDate, endDate)

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

export async function fetchCourierPeriodAccount(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  packageRate = 0
): Promise<PeriodAccountTotals> {
  const { data: packages, error: packagesError } = await fetchCourierCollectionPackages(
    supabase,
    courierId,
    startDate,
    endDate
  )
  if (packagesError) throw packagesError

  const { data: settlements, error: settlementsError } = await fetchCourierPeriodSettlements(
    supabase,
    courierId,
    startDate,
    endDate
  )
  if (settlementsError) throw settlementsError

  return calculatePeriodAccount(
    (packages || []) as PackageLike[],
    (settlements || []) as SettlementLike[],
    packageRate
  )
}

export async function markCourierCollectionSettled(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string
) {
  const { startIso, endIso } = resolveFilterUtcRange(startDate, endDate)
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

export async function fetchCourierLifetimeDebt(
  supabase: SupabaseClient,
  courierId: string
): Promise<number> {
  const { fetchCourierLedgerAccount } = await import('@/utils/courierLedger')
  const account = await fetchCourierLedgerAccount(supabase, courierId, 0)
  return account.payableDebt
}

/** @deprecated calculateCourierCollectionTotals kullan */
export function sumCollectionByPaymentMethod(packages: PackageLike[]) {
  return calculateCourierCollectionTotals(packages)
}

export function computePeriodPayableDebt(
  totals: { total: number },
  settlementsPaid: number
): number {
  return Math.max(0, totals.total - settlementsPaid)
}
