import type { SupabaseClient } from '@supabase/supabase-js'
import {
  calculateCourierCollectionTotals,
  calculateCourierEarnings,
  resolveFilterUtcRange,
  type PackageLike,
} from '@/utils/calculations'

export type LedgerAccount = {
  cash: number
  card: number
  iban: number
  count: number
  total: number
  earningsPackageCount: number
  earningsAmount: number
  payableDebt: number
}

export type SettlementInsertPayload = {
  courier_id: string
  amount_paid: number
  total_cash: number
  total_card: number
  total_iban: number
  total_earned: number
  received_amount: number
  remaining_debt: number
  notes?: string | null
  created_by?: string
  start_date?: string | null
  end_date?: string | null
}

/** Güncel açık cari: tarih filtresi YOK */
export function fetchCourierOpenLedgerPackages(
  supabase: SupabaseClient,
  courierId: string,
  select = 'id, amount, payment_method, status, is_chargeable_cancellation, delivered_at, order_number'
) {
  if (!courierId) {
    throw new Error('[courierLedger] courierId eksik')
  }

  return supabase
    .from('packages')
    .select(select)
    .eq('status', 'delivered')
    .eq('delivered_by_courier_id', courierId)
    .or('is_courier_settled.is.null,is_courier_settled.eq.false')
    .order('delivered_at', { ascending: false })
}

/** Seçili tarih aralığındaki açık cari (mutabakat bekleyen) paketler */
export function fetchCourierOpenLedgerPackagesInRange(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  select = 'id, amount, payment_method, status, is_chargeable_cancellation, delivered_at, order_number'
) {
  if (!courierId) {
    throw new Error('[courierLedger] courierId eksik')
  }
  return supabase
    .from('packages')
    .select(select)
    .eq('status', 'delivered')
    .eq('delivered_by_courier_id', courierId)
    .or('is_courier_settled.is.null,is_courier_settled.eq.false')
    .order('delivered_at', { ascending: false })
}

export function fetchCourierUnpaidEarningsPackages(
  supabase: SupabaseClient,
  courierId: string,
  select = 'id, amount, payment_method, status, is_chargeable_cancellation, delivered_at, order_number'
) {
  if (!courierId) {
    throw new Error('[courierLedger] courierId eksik')
  }

  return supabase
    .from('packages')
    .select(select)
    .eq('status', 'delivered')
    .eq('delivered_by_courier_id', courierId)
    .or('is_courier_earned_paid.is.null,is_courier_earned_paid.eq.false')
    .order('delivered_at', { ascending: false })
}

export async function fetchCourierLedgerAccount(
  supabase: SupabaseClient,
  courierId: string,
  packageRate: number
): Promise<LedgerAccount> {
  const { data: packages, error } = await fetchCourierOpenLedgerPackages(
    supabase,
    courierId,
    'amount, payment_method, status, is_chargeable_cancellation'
  )

  if (error) {
    throw new Error(`[courierLedger] Açık paketler okunamadı: ${error.message}`)
  }

  if (!Array.isArray(packages)) {
    throw new Error('[courierLedger] packages yanıtı dizi değil')
  }

  const collection = calculateCourierCollectionTotals(packages as PackageLike[])
  const earnings = calculateCourierEarnings(packages as PackageLike[], packageRate)

  return {
    ...collection,
    earningsPackageCount: earnings.count,
    earningsAmount: earnings.amount,
    payableDebt: collection.total,
  }
}

export async function fetchCourierLedgerPeriodAccount(
  supabase: SupabaseClient,
  courierId: string,
  startDate: string,
  endDate: string,
  packageRate: number
): Promise<LedgerAccount> {
  void startDate
  void endDate

  const { data: packages, error } = await fetchCourierOpenLedgerPackages(
    supabase,
    courierId,
    'amount, payment_method, status, is_chargeable_cancellation'
  )

  if (error) {
    throw new Error(
      `[courierLedger] Dönem açık paketleri okunamadı: ${error.message}`
    )
  }

  if (!Array.isArray(packages)) {
    throw new Error('[courierLedger] packages yanıtı dizi değil')
  }

  const { data: earningsPackages, error: earningsError } =
    await fetchCourierUnpaidEarningsPackages(
      supabase,
      courierId,
      'amount, payment_method, status, is_chargeable_cancellation'
    )
  if (earningsError) {
    throw new Error(
      `[courierLedger] Hakediş paketleri okunamadı: ${earningsError.message}`
    )
  }
  if (!Array.isArray(earningsPackages)) {
    throw new Error('[courierLedger] earningsPackages yanıtı dizi değil')
  }

  const collection = calculateCourierCollectionTotals(packages as PackageLike[])
  const earnings = calculateCourierEarnings(
    earningsPackages as PackageLike[],
    packageRate
  )

  return {
    ...collection,
    earningsPackageCount: earnings.count,
    earningsAmount: earnings.amount,
    payableDebt: collection.total,
  }
}

export type SettlementSaveScope = {
  /** Verilirse yalnızca bu dönemdeki açık paketler işaretlenir */
  startDate?: string
  endDate?: string
}

/**
 * Aşama 1: courier_settlements insert → id
 * Aşama 2: açık delivered paketlere courier_settlement_id yaz (isteğe bağlı dönem filtresi)
 */
export async function saveCourierSettlementLedger(
  supabase: SupabaseClient,
  courierId: string,
  payload: SettlementInsertPayload,
  scope?: SettlementSaveScope
): Promise<{ settlementId: string; packagesMarked: number }> {
  if (!courierId) {
    throw new Error('[courierLedger] courierId eksik')
  }

  const received = Number(payload.received_amount)
  if (!Number.isFinite(received) || received <= 0) {
    throw new Error('[courierLedger] received_amount geçersiz')
  }

  const usePeriod =
    Boolean(scope?.startDate?.trim()) && Boolean(scope?.endDate?.trim())

  const periodRange = usePeriod
    ? resolveFilterUtcRange(scope!.startDate!, scope!.endDate!)
    : null

  const { data, error } = await supabase.rpc(
    'save_courier_settlement_transactional',
    {
      p_courier_id: courierId,
      p_received_amount: received,
      p_total_cash: payload.total_cash,
      p_total_card: payload.total_card,
      p_total_iban: payload.total_iban,
      p_total_earned: payload.total_earned,
      p_remaining_debt: payload.remaining_debt,
      p_notes: payload.notes ?? null,
      p_created_by: payload.created_by ?? 'admin',
      p_start_date:
        payload.start_date ?? new Date().toISOString().split('T')[0],
      p_end_date: payload.end_date ?? new Date().toISOString().split('T')[0],
      p_scope_start: periodRange?.startIso ?? null,
      p_scope_end: periodRange?.endIso ?? null,
    }
  )

  if (error) {
    throw new Error(
      `[courierLedger] Mutabakat transaction RPC başarısız: ${error.message}`
    )
  }

  const row = Array.isArray(data) ? data[0] : data
  const settlementId = row?.settlement_id as string | undefined
  const packagesMarked = Number(row?.packages_marked ?? 0)

  if (!settlementId) {
    throw new Error('[courierLedger] RPC settlement_id dönmedi')
  }
  if (!Number.isFinite(packagesMarked) || packagesMarked <= 0) {
    throw new Error('[courierLedger] RPC paket işaretleme sonucu geçersiz')
  }

  return { settlementId, packagesMarked }
}
