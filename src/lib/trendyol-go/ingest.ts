import type { SupabaseClient } from '@supabase/supabase-js'
import { mapPackageToLocal } from './mapPackageToLocal'
import type {
  MappedLocalPackage,
  MappingReportAccumulator,
  TrendyolPackage,
} from './types'

export interface IngestResult {
  action: 'inserted' | 'updated' | 'skipped_idempotent' | 'cancelled'
  localPackageId: number | null
  trendyolPackageId: string
  packageStatus: string
  mapped: MappedLocalPackage
}

async function loadProductLookup(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('trendyol_go_product_mappings')
    .select('trendyol_product_id, local_product_id, eslesmedi_mi')
    .eq('restaurant_id', restaurantId)

  const map = new Map<string, string>()
  for (const row of data || []) {
    if (row.local_product_id && !row.eslesmedi_mi) {
      map.set(row.trendyol_product_id, row.local_product_id)
    }
  }
  return map
}

async function upsertUnmatchedProducts(
  supabase: SupabaseClient,
  restaurantId: string,
  mapped: MappedLocalPackage
) {
  for (const item of mapped.items) {
    if (!item.trendyol_product_id) continue
    const matched = Boolean(item.product_id) && !item.unmatched
    await supabase.from('trendyol_go_product_mappings').upsert(
      {
        restaurant_id: restaurantId,
        trendyol_product_id: item.trendyol_product_id,
        trendyol_name: item.product_name,
        local_product_id: item.product_id || null,
        eslesmedi_mi: !matched,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id,trendyol_product_id' }
    )
  }
}

function toPackageRow(
  mapped: MappedLocalPackage,
  restaurantId: string,
  gecmisVeri: boolean
) {
  const isCancel =
    mapped.local_status === 'cancelled' ||
    mapped.package_status === 'Cancelled' ||
    mapped.package_status === 'UnSupplied'

  return {
    restaurant_id: restaurantId,
    platform: 'trendyol',
    source: 'trendyol_go',
    trendyol_package_id: mapped.trendyol_package_id,
    trendyol_order_code: mapped.trendyol_order_code,
    trendyol_order_id: mapped.trendyol_order_id,
    trendyol_order_number: mapped.trendyol_order_number,
    external_order_number: mapped.external_order_number,
    order_number: mapped.order_number,
    customer_name: mapped.customer_name,
    customer_phone: null,
    delivery_address: mapped.delivery_address,
    delivery_neighborhood: mapped.delivery_neighborhood,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    address_description: mapped.address_description,
    is_address_masked: mapped.is_address_masked,
    call_center_phone: mapped.call_center_phone,
    pin_code: mapped.pin_code,
    adres_tarifinden_bulunan_telefon: mapped.adres_tarifinden_bulunan_telefon,
    mutfak_notu: mapped.mutfak_notu,
    kurye_notu: mapped.kurye_notu,
    genel_not: mapped.genel_not,
    customer_note_ham: mapped.customer_note_ham,
    servis_istiyor_mu: mapped.servis_istiyor_mu,
    content: mapped.content,
    amount: mapped.amount,
    subtotal: mapped.subtotal,
    total: mapped.total,
    delivery_fee: mapped.delivery_fee,
    payment_method: mapped.payment_method,
    payment_type_raw: mapped.payment_type_raw,
    meal_card_source: mapped.meal_card_source,
    on_delivery_type: mapped.on_delivery_type,
    courier_collects_payment: mapped.courier_collects_payment,
    coupon_seller_amount: mapped.coupon_seller_amount,
    items: mapped.items,
    is_test_order: mapped.is_test_order,
    gecmis_veri: gecmisVeri,
    exclude_from_courier_queue: mapped.exclude_from_courier_queue,
    delivery_type: mapped.delivery_type,
    cancel_info: mapped.cancel_info,
    ham_payload: mapped.ham_payload,
    package_creation_at: mapped.package_creation_at,
    package_modification_at: mapped.package_modification_at,
    status: isCancel
      ? 'cancelled'
      : mapped.local_status === 'delivered'
        ? 'delivered'
        : 'new_order',
    cancelled_at: isCancel ? new Date().toISOString() : null,
    cancelled_by: isCancel ? 'trendyol' : null,
    cancellation_reason: isCancel
      ? mapped.cancel_info?.reasonText ||
        mapped.cancel_info?.reason ||
        mapped.package_status
      : null,
  }
}

/**
 * packageId + packageStatus idempotent.
 * Aynı packageId farklı status → mevcut yerel kaydı GÜNCELLE (yeni satır açma).
 */
export async function ingestTrendyolPackage(
  supabase: SupabaseClient,
  opts: {
    restaurantId: string
    pkg: TrendyolPackage
    gecmisVeri?: boolean
    report?: MappingReportAccumulator
    /** İptal bildirimi için callback (canlı, kuryeye atanmış) */
    onCancelledAssigned?: (info: {
      localPackageId: number
      courierId: string
      mapped: MappedLocalPackage
    }) => Promise<void>
  }
): Promise<IngestResult> {
  const gecmisVeri = Boolean(opts.gecmisVeri)
  const productMap = await loadProductLookup(supabase, opts.restaurantId)
  const mapped = mapPackageToLocal(opts.pkg, {
    gecmisVeri,
    productLookup: {
      getLocalProductId: (id) => productMap.get(id),
    },
    report: opts.report,
  })

  const packageStatus = mapped.package_status
  const trendyolPackageId = mapped.trendyol_package_id

  // Idempotency: aynı packageId+status → no-op
  const { data: existingEvent } = await supabase
    .from('trendyol_go_package_events')
    .select('id, local_package_id')
    .eq('trendyol_package_id', trendyolPackageId)
    .eq('package_status', packageStatus)
    .maybeSingle()

  if (existingEvent) {
    return {
      action: 'skipped_idempotent',
      localPackageId: existingEvent.local_package_id,
      trendyolPackageId,
      packageStatus,
      mapped,
    }
  }

  await upsertUnmatchedProducts(supabase, opts.restaurantId, mapped)

  const row = toPackageRow(mapped, opts.restaurantId, gecmisVeri)

  const { data: existingPkg } = await supabase
    .from('packages')
    .select('id, status, courier_id, exclude_from_courier_queue')
    .eq('trendyol_package_id', trendyolPackageId)
    .maybeSingle()

  let localPackageId: number
  let action: IngestResult['action']

  if (existingPkg?.id) {
    const prevCourierId = existingPkg.courier_id as string | null
    const updatePayload: Record<string, unknown> = { ...row }
    // Geçmiş import canlı kaydı bozmasın diye status'u delivered/cancelled dışına zorlama
    // ama iptal her zaman uygulanır
    if (gecmisVeri && existingPkg.status !== 'cancelled') {
      // geçmiş: sadece metadata güncelle, operasyonel status'u ezme (zaten yeni kayıt olmalı)
    }

    const { data: updated, error } = await supabase
      .from('packages')
      .update(updatePayload)
      .eq('id', existingPkg.id)
      .select('id, courier_id, status')
      .single()

    if (error) throw new Error(`Paket güncellenemedi: ${error.message}`)
    localPackageId = updated.id
    action =
      row.status === 'cancelled' ? 'cancelled' : 'updated'

    if (
      action === 'cancelled' &&
      prevCourierId &&
      !gecmisVeri &&
      opts.onCancelledAssigned
    ) {
      await opts.onCancelledAssigned({
        localPackageId,
        courierId: prevCourierId,
        mapped,
      })
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('packages')
      .insert([row])
      .select('id')
      .single()

    if (error) throw new Error(`Paket eklenemedi: ${error.message}`)
    localPackageId = inserted.id
    action = row.status === 'cancelled' ? 'cancelled' : 'inserted'
  }

  await supabase.from('trendyol_go_package_events').insert({
    restaurant_id: opts.restaurantId,
    trendyol_package_id: trendyolPackageId,
    package_status: packageStatus,
    local_package_id: localPackageId,
    is_test: mapped.is_test_order,
    gecmis_veri: gecmisVeri,
  })

  return {
    action,
    localPackageId,
    trendyolPackageId,
    packageStatus,
    mapped,
  }
}
