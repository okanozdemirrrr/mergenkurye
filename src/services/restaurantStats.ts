/**
 * Restoran ciro / paket sayısı — tek kaynak.
 *
 * Kurallar:
 * - Tarih kolonu: packages.created_at
 * - Aralık: Europe/Istanbul 00:00:00.000 → 23:59:59.999 (UTC ISO)
 * - Paket sayısı + kurye masrafı: teslim + ücretli iptal
 * - Ciro: yalnızca status = 'delivered' (iptal cirosu yok)
 */
import { supabase } from '@/app/lib/supabase'
import { COUNTED_PACKAGE_OR_FILTER, parseFilterInputToUtcIso } from '@/utils/calculations'

export const RESTAURANT_STATS_DATE_COLUMN = 'created_at' as const
export const RESTAURANT_STATS_COUNTED_FILTER = COUNTED_PACKAGE_OR_FILTER

const PAGE_SIZE = 1000
const ISTANBUL_TZ = 'Europe/Istanbul'
const STATS_SELECT =
  'id, restaurant_id, amount, created_at, applied_price, commission_amount, status, is_chargeable_cancellation'

export type RestaurantStatsPackage = {
  id: number
  restaurant_id: string | null
  amount: number | null
  created_at: string
  applied_price: number | null
  commission_amount: number | null
  status: string
  is_chargeable_cancellation: boolean | null
}

export type RestaurantStats = {
  restaurantId: string
  packageCount: number
  revenue: number
  courierCost: number
  commission: number
  netProfit: number
  packages: RestaurantStatsPackage[]
}

function unwrapFee(value: unknown): number {
  if (value == null) return 0
  if (Array.isArray(value)) return Number(value[0]?.package_fee ?? 0) || 0
  if (typeof value === 'object' && value && 'package_fee' in value) {
    return Number((value as { package_fee?: number | null }).package_fee ?? 0) || 0
  }
  return 0
}

/** Europe/Istanbul takvim günü YYYY-MM-DD */
export function istanbulTodayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Seçilen günün TR 00:00:00 anı → UTC ISO */
export function periodStartIso(dateYmd: string): string {
  return parseFilterInputToUtcIso(dateYmd, 'start')
}

/** Seçilen günün TR 23:59:59.999 anı → UTC ISO */
export function periodEndIso(dateYmd: string): string {
  return parseFilterInputToUtcIso(dateYmd, 'end')
}

export function deliveredPeriodBounds(startDate: string, endDate: string): {
  startIso: string
  endIso: string
} {
  return {
    startIso: periodStartIso(startDate),
    endIso: periodEndIso(endDate),
  }
}

export function istanbulChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: ISTANBUL_TZ,
  })
}

function toStatsPackage(row: Record<string, unknown>, restaurantId?: string): RestaurantStatsPackage {
  return {
    id: Number(row.id),
    restaurant_id: restaurantId ?? ((row.restaurant_id as string | null) ?? null),
    amount: (row.amount as number | null) ?? null,
    created_at: String(row.created_at),
    applied_price: (row.applied_price as number | null) ?? null,
    commission_amount: (row.commission_amount as number | null) ?? null,
    status: String(row.status || ''),
    is_chargeable_cancellation: Boolean(row.is_chargeable_cancellation),
  }
}

function summarizePackages(
  restaurantId: string,
  packages: RestaurantStatsPackage[],
  fallbackFee = 0,
): RestaurantStats {
  let revenue = 0
  let courierCost = 0
  let commission = 0

  for (const pkg of packages) {
    courierCost += Number(pkg.applied_price ?? fallbackFee)
    if (pkg.status === 'delivered') {
      revenue += Number(pkg.amount ?? 0)
      commission += Number(pkg.commission_amount ?? 0)
    }
  }

  return {
    restaurantId,
    packageCount: packages.length,
    revenue,
    courierCost,
    commission,
    netProfit: revenue - courierCost,
    packages,
  }
}

async function fetchCountedRows(params: {
  restaurantId?: string
  startIso: string
  endIso: string
  select: string
}): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from('packages')
      .select(params.select)
      .or(RESTAURANT_STATS_COUNTED_FILTER)
      .gte(RESTAURANT_STATS_DATE_COLUMN, params.startIso)
      .lte(RESTAURANT_STATS_DATE_COLUMN, params.endIso)

    if (params.restaurantId) {
      query = query.eq('restaurant_id', params.restaurantId)
    }

    const { data, error } = await query
      .order(RESTAURANT_STATS_DATE_COLUMN, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error

    const chunk = (data || []) as Record<string, unknown>[]
    rows.push(...chunk)
    if (chunk.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return rows
}

/**
 * Tek restoran — teslim + ücretli iptal (created_at aralığı). Ciro yalnızca teslim.
 */
export async function fetchRestaurantStats(
  restaurantId: string,
  startDate: string,
  endDate: string,
  fallbackFee = 0,
): Promise<RestaurantStats> {
  const { startIso, endIso } = deliveredPeriodBounds(startDate, endDate)

  const rows = await fetchCountedRows({
    restaurantId,
    startIso,
    endIso,
    select: STATS_SELECT,
  })

  return summarizePackages(
    restaurantId,
    rows.map((row) => toStatsPackage(row)),
    fallbackFee,
  )
}

/**
 * Tüm restoranlar — aynı tarih / statü kuralları.
 */
export async function fetchAllRestaurantsDeliveredStats(
  startDate: string,
  endDate: string,
): Promise<Map<string, RestaurantStats>> {
  const { startIso, endIso } = deliveredPeriodBounds(startDate, endDate)

  const rows = await fetchCountedRows({
    startIso,
    endIso,
    select: `${STATS_SELECT}, restaurants(package_fee)`,
  })

  const byRestaurant = new Map<string, RestaurantStatsPackage[]>()
  const feeByRestaurant = new Map<string, number>()

  for (const row of rows) {
    const restaurantId = row.restaurant_id ? String(row.restaurant_id) : ''
    if (!restaurantId) continue

    if (!feeByRestaurant.has(restaurantId)) {
      feeByRestaurant.set(restaurantId, unwrapFee(row.restaurants))
    }

    const list = byRestaurant.get(restaurantId) ?? []
    list.push(toStatsPackage(row, restaurantId))
    byRestaurant.set(restaurantId, list)
  }

  const result = new Map<string, RestaurantStats>()
  for (const [restaurantId, packages] of byRestaurant) {
    result.set(
      restaurantId,
      summarizePackages(restaurantId, packages, feeByRestaurant.get(restaurantId) ?? 0),
    )
  }

  return result
}
