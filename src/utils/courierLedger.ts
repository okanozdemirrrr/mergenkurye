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
    .is('courier_settlement_id', null)
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
  const { startIso, endIso } = resolveFilterUtcRange(startDate, endDate)

  return supabase
    .from('packages')
    .select(select)
    .eq('status', 'delivered')
    .eq('delivered_by_courier_id', courierId)
    .is('courier_settlement_id', null)
    .gte('delivered_at', startIso)
    .lte('delivered_at', endIso)
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
  const { data: packages, error } = await fetchCourierOpenLedgerPackagesInRange(
    supabase,
    courierId,
    startDate,
    endDate,
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

  const collection = calculateCourierCollectionTotals(packages as PackageLike[])
  const earnings = calculateCourierEarnings(packages as PackageLike[], packageRate)

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

  const openQuery = usePeriod
    ? await fetchCourierOpenLedgerPackagesInRange(
        supabase,
        courierId,
        scope!.startDate!,
        scope!.endDate!,
        'id'
      )
    : await fetchCourierOpenLedgerPackages(supabase, courierId, 'id')

  if (openQuery.error) {
    throw new Error(
      `[courierLedger] Açık paket sayısı alınamadı: ${openQuery.error.message}`
    )
  }
  const openCount = openQuery.data?.length ?? 0
  if (openCount === 0) {
    throw new Error(
      usePeriod
        ? '[courierLedger] Seçili dönemde mutabakat için açık paket yok'
        : '[courierLedger] Mutabakat için açık paket yok'
    )
  }

  const insertBody = {
    courier_id: courierId,
    amount_paid: received,
    received_amount: received,
    total_cash: payload.total_cash,
    total_card: payload.total_card,
    total_iban: payload.total_iban,
    total_earned: payload.total_earned,
    remaining_debt: payload.remaining_debt,
    notes: payload.notes ?? null,
    created_by: payload.created_by ?? 'admin',
    start_date: payload.start_date ?? new Date().toISOString().split('T')[0],
    end_date: payload.end_date ?? new Date().toISOString().split('T')[0],
  }

  let settlementId: string | null = null

  const fullInsert = await supabase
    .from('courier_settlements')
    .insert([insertBody])
    .select('id')
    .single()

  if (fullInsert.error) {
    const minimal = await supabase
      .from('courier_settlements')
      .insert([
        {
          courier_id: courierId,
          amount_paid: received,
          start_date: insertBody.start_date,
          end_date: insertBody.end_date,
          notes: insertBody.notes,
          created_by: insertBody.created_by,
        },
      ])
      .select('id')
      .single()

    if (minimal.error) {
      throw new Error(
        `[courierLedger] Mutabakat kaydı oluşturulamadı: ${minimal.error.message}`
      )
    }
    if (!minimal.data?.id) {
      throw new Error('[courierLedger] Mutabakat id dönmedi (minimal insert)')
    }
    settlementId = minimal.data.id
  } else {
    if (!fullInsert.data?.id) {
      throw new Error('[courierLedger] Mutabakat id dönmedi')
    }
    settlementId = fullInsert.data.id
  }

  let updateQuery = supabase
    .from('packages')
    .update({ courier_settlement_id: settlementId })
    .eq('status', 'delivered')
    .eq('delivered_by_courier_id', courierId)
    .is('courier_settlement_id', null)

  if (usePeriod) {
    const { startIso, endIso } = resolveFilterUtcRange(
      scope!.startDate!,
      scope!.endDate!
    )
    updateQuery = updateQuery
      .gte('delivered_at', startIso)
      .lte('delivered_at', endIso)
  }

  const { data: marked, error: updateError } = await updateQuery.select('id')

  if (updateError) {
    throw new Error(
      `Makbuz oluşturuldu (id: ${settlementId}) ama paketler işaretlenemedi! ${updateError.message}`
    )
  }

  const packagesMarked = marked?.length ?? 0
  if (packagesMarked === 0) {
    throw new Error(
      `Makbuz oluşturuldu (id: ${settlementId}) ama hiçbir paket işaretlenemedi! Açık paket vardı: ${openCount}`
    )
  }

  return { settlementId, packagesMarked }
}
