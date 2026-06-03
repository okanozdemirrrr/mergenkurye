/**
 * Tek merkez: kurye tahsilat, hakediş ve dönem borcu hesapları.
 * Admin + Kurye paneli yalnızca bu modülü kullanmalı.
 */

export const APP_TIMEZONE_OFFSET_HOURS = 3 // Europe/Istanbul (GMT+3)

export type PackageLike = {
  id?: number | string
  amount?: number | null
  payment_method?: string | null
  status?: string | null
  is_chargeable_cancellation?: boolean | null
}

export type SettlementLike = {
  amount_paid?: number | null
  received_amount?: number | null
}

export type CollectionTotals = {
  cash: number
  card: number
  iban: number
  count: number
  total: number
}

export type PeriodAccountTotals = CollectionTotals & {
  settlementsPaid: number
  payableDebt: number
  earningsPackageCount: number
  earningsAmount: number
}

function assertFiniteNumber(value: unknown, field: string, context?: string): number {
  if (value === undefined || value === null) {
    throw new Error(
      `[calculations] ${field} eksik${context ? ` (${context})` : ''}`
    )
  }
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error(
      `[calculations] ${field} geçersiz sayı: ${String(value)}${context ? ` (${context})` : ''}`
    )
  }
  return n
}

/** Ücretsiz iptal — hiçbir toplama dahil edilmez */
export function isExcludedCancellation(pkg: PackageLike): boolean {
  return (
    pkg.status === 'cancelled' &&
    pkg.is_chargeable_cancellation !== true
  )
}

/** Hakediş: teslim + ücretli iptal */
export function isEarningsEligible(pkg: PackageLike): boolean {
  if (isExcludedCancellation(pkg)) return false
  if (pkg.status === 'delivered') return true
  return pkg.status === 'cancelled' && pkg.is_chargeable_cancellation === true
}

/** Tahsilat (mutabakat): sadece teslim, iptal hariç */
export function isCollectionEligible(pkg: PackageLike): boolean {
  if (isExcludedCancellation(pkg)) return false
  return pkg.status === 'delivered'
}

export function assertPackageAmount(pkg: PackageLike, context: string): number {
  if (!isCollectionEligible(pkg) && !isEarningsEligible(pkg)) {
    throw new Error(
      `[calculations] Paket hesaba dahil değil: status=${pkg.status} id=${pkg.id} (${context})`
    )
  }
  return assertFiniteNumber(pkg.amount, 'amount', context)
}

/** datetime-local veya YYYY-MM-DD → Supabase UTC ISO (duvar saati GMT+3) */
export function parseFilterInputToUtcIso(
  value: string,
  boundary: 'start' | 'end'
): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`[calculations] Tarih filtresi boş (${boundary})`)
  }

  const withTime = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (withTime) {
    const [, y, mo, d, h, mi] = withTime.map(Number)
    if (boundary === 'start') {
      return wallClockToUtcIso(y, mo, d, h, mi, 0, 0)
    }
    return wallClockToUtcIso(y, mo, d, h, mi, 59, 999)
  }

  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) {
    const [, y, mo, d] = dateOnly.map(Number)
    if (boundary === 'start') {
      return wallClockToUtcIso(y, mo, d, 0, 0, 0, 0)
    }
    return wallClockToUtcIso(y, mo, d, 23, 59, 59, 999)
  }

  throw new Error(`[calculations] Geçersiz tarih formatı: ${value}`)
}

export function wallClockToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number
): string {
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second, ms) -
    APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000
  return new Date(utcMs).toISOString()
}

export function toDateTimeLocalValue(d: Date): string {
  const shifted = new Date(d.getTime() + APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  const h = String(shifted.getUTCHours()).padStart(2, '0')
  const min = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

/** İş günü 05:00 — ertesi gün 04:59 (GMT+3 duvar saati) */
export function getBusinessDayDateTimeLocal(now = new Date()) {
  const trNow = new Date(now.getTime() + APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000)
  const hour = trNow.getUTCHours()

  const start = new Date(trNow)
  if (hour < 5) {
    start.setUTCDate(start.getUTCDate() - 1)
  }
  start.setUTCHours(5, 0, 0, 0)

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCHours(4, 59, 0, 0)

  return {
    start: toDateTimeLocalValue(new Date(start.getTime() - APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000)),
    end: toDateTimeLocalValue(new Date(end.getTime() - APP_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000)),
  }
}

export function resolveFilterUtcRange(startInput: string, endInput: string) {
  return {
    startIso: parseFilterInputToUtcIso(startInput, 'start'),
    endIso: parseFilterInputToUtcIso(endInput, 'end'),
  }
}

export function toDateOnly(value: string): string {
  if (!value) throw new Error('[calculations] toDateOnly: boş değer')
  return value.includes('T') ? value.split('T')[0] : value
}

/** Mutabakat tahsilatı: nakit + kart + IBAN */
export function calculateCourierCollectionTotals(
  packages: PackageLike[]
): CollectionTotals {
  if (!Array.isArray(packages)) {
    throw new Error('[calculations] packages dizisi değil')
  }

  let cash = 0
  let card = 0
  let iban = 0
  let count = 0

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i]
    if (!isCollectionEligible(pkg)) continue

    const amount = assertFiniteNumber(
      pkg.amount,
      `packages[${i}].amount`,
      'collection'
    )
    count += 1

    if (pkg.payment_method === 'cash') cash += amount
    else if (pkg.payment_method === 'card') card += amount
    else if (pkg.payment_method === 'iban') iban += amount
    else {
      throw new Error(
        `[calculations] Bilinmeyen payment_method: ${String(pkg.payment_method)} id=${pkg.id}`
      )
    }
  }

  return { cash, card, iban, count, total: cash + card + iban }
}

/** Hakediş: teslim + ücretli iptal × paket ücreti */
export function calculateCourierEarnings(
  packages: PackageLike[],
  packageRate: number
): { count: number; amount: number } {
  const rate = assertFiniteNumber(packageRate, 'packageRate', 'earnings')
  if (!Array.isArray(packages)) {
    throw new Error('[calculations] packages dizisi değil (earnings)')
  }

  let count = 0
  for (let i = 0; i < packages.length; i++) {
    if (isEarningsEligible(packages[i])) count += 1
  }

  return { count, amount: count * rate }
}

export function calculateSettlementsPaid(settlements: SettlementLike[]): number {
  if (!Array.isArray(settlements)) {
    throw new Error('[calculations] settlements dizisi değil')
  }

  let sum = 0
  for (let i = 0; i < settlements.length; i++) {
    const row = settlements[i]
    const paid =
      row.received_amount !== undefined && row.received_amount !== null
        ? assertFiniteNumber(row.received_amount, `settlements[${i}].received_amount`)
        : assertFiniteNumber(row.amount_paid, `settlements[${i}].amount_paid`)
    sum += paid
  }
  return sum
}

export function calculatePeriodAccount(
  collectionPackages: PackageLike[],
  settlements: SettlementLike[],
  packageRate = 0
): PeriodAccountTotals {
  const collection = calculateCourierCollectionTotals(collectionPackages)
  const settlementsPaid = calculateSettlementsPaid(settlements)
  const earnings = calculateCourierEarnings(collectionPackages, packageRate)

  const payableDebt = Math.max(0, collection.total - settlementsPaid)

  return {
    ...collection,
    settlementsPaid,
    payableDebt,
    earningsPackageCount: earnings.count,
    earningsAmount: earnings.amount,
  }
}

export function settlementPaidAmount(row: SettlementLike): number {
  if (row.received_amount !== undefined && row.received_amount !== null) {
    return assertFiniteNumber(row.received_amount, 'received_amount')
  }
  return assertFiniteNumber(row.amount_paid, 'amount_paid')
}
