import type { SupabaseClient } from '@supabase/supabase-js'
import { mapPackageToLocal } from './mapPackageToLocal'
import { DEFAULT_CALL_DIAL_TEMPLATE } from './dialTemplate'
import type {
  MappedLocalPackage,
  MappingReportAccumulator,
  TrendyolPackage,
} from './types'

export interface IngestResult {
  action: 'inserted' | 'updated' | 'skipped_idempotent' | 'cancelled' | 'error'
  localPackageId: number | null
  trendyolPackageId: string
  packageStatus: string
  mapped: MappedLocalPackage | null
  error?: string
}

type ExistingPackage = {
  id: number
  status: string | null
  courier_id: string | null
  gecmis_veri: boolean | null
  exclude_from_courier_queue: boolean | null
  delivered_at: string | null
  cancelled_at: string | null
  created_at: string | null
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

/** Ortak alanlar — gecmis_veri / created_at burada yok (insert/update ayrı) */
function toPackageRow(
  mapped: MappedLocalPackage,
  restaurantId: string,
  callDialTemplate?: string | null
) {
  const isCancel =
    mapped.local_status === 'cancelled' ||
    mapped.package_status === 'Cancelled' ||
    mapped.package_status === 'UnSupplied'

  const status = isCancel
    ? 'cancelled'
    : mapped.local_status === 'delivered'
      ? 'delivered'
      : 'new_order'

  return {
    restaurant_id: restaurantId,
    platform: mapped.platform,
    source: 'trendyol_go',
    trendyol_package_id: mapped.trendyol_package_id,
    trendyol_order_code: mapped.trendyol_order_code,
    trendyol_order_id: mapped.trendyol_order_id,
    trendyol_order_number: mapped.trendyol_order_number,
    trendyol_app_name: mapped.trendyol_app_name,
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
    exclude_from_courier_queue: mapped.exclude_from_courier_queue,
    delivery_type: mapped.delivery_type,
    cancel_info: mapped.cancel_info,
    ham_payload: mapped.ham_payload,
    call_dial_template: callDialTemplate || null,
    package_creation_at: mapped.package_creation_at,
    package_modification_at: mapped.package_modification_at,
    status,
    cancelled_by: isCancel ? 'trendyol' : null,
    cancellation_reason: isCancel
      ? mapped.cancel_info?.reasonText ||
        mapped.cancel_info?.reason ||
        mapped.package_status
      : null,
  }
}

function tyEventTimestamp(mapped: MappedLocalPackage): string | null {
  return mapped.package_modification_at || mapped.package_creation_at
}

/** İlk oluşturma: gecmis_veri + packageCreationDate → created_at */
function buildInsertRow(
  mapped: MappedLocalPackage,
  restaurantId: string,
  gecmisVeri: boolean,
  callDialTemplate?: string | null
) {
  const row = toPackageRow(mapped, restaurantId, callDialTemplate)
  const isCancel = row.status === 'cancelled'
  const eventAt = tyEventTimestamp(mapped)

  return {
    ...row,
    gecmis_veri: gecmisVeri,
    ...(mapped.package_creation_at
      ? { created_at: mapped.package_creation_at }
      : {}),
    delivered_at:
      row.status === 'delivered' ? eventAt || mapped.package_creation_at : null,
    cancelled_at: isCancel ? eventAt || new Date().toISOString() : null,
  }
}

/**
 * Güncelleme: gecmis_veri ASLA yazılmaz.
 * Canlı kayıtta (gecmis_veri=false) kuyruk/operasyon bayrakları korunur.
 */
function buildUpdateRow(
  mapped: MappedLocalPackage,
  restaurantId: string,
  existing: ExistingPackage,
  callDialTemplate?: string | null
) {
  const row = toPackageRow(mapped, restaurantId, callDialTemplate)
  const isLive = existing.gecmis_veri === false
  const eventAt = tyEventTimestamp(mapped)

  const update: Record<string, unknown> = { ...row }

  // Operasyonel bayraklar — canlı siparişte içe aktarma bozmasın
  if (isLive) {
    delete update.exclude_from_courier_queue
  }

  if (mapped.package_creation_at) {
    update.created_at = mapped.package_creation_at
  }

  if (row.status === 'delivered') {
    update.delivered_at =
      existing.delivered_at || eventAt || mapped.package_creation_at
  }

  if (row.status === 'cancelled') {
    update.cancelled_at =
      existing.cancelled_at || eventAt || new Date().toISOString()
  } else {
    // Teslim güncellemesinde iptal alanlarını silme — sadece cancel path set eder
    delete update.cancelled_by
    delete update.cancellation_reason
  }

  return update
}

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '23505') return true
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('duplicate key') ||
    msg.includes('unique_order_per_platform') ||
    msg.includes('uq_packages_trendyol_package_id')
  )
}

async function findExistingByConflict(
  supabase: SupabaseClient,
  row: { trendyol_package_id?: string | null; order_number?: string | null; platform?: string | null }
): Promise<ExistingPackage | null> {
  const selectCols =
    'id, status, courier_id, gecmis_veri, exclude_from_courier_queue, delivered_at, cancelled_at, created_at'

  if (row.trendyol_package_id) {
    const { data } = await supabase
      .from('packages')
      .select(selectCols)
      .eq('trendyol_package_id', row.trendyol_package_id)
      .maybeSingle()
    if (data) return data as ExistingPackage
  }
  if (row.order_number && row.platform) {
    const { data } = await supabase
      .from('packages')
      .select(selectCols)
      .eq('order_number', row.order_number)
      .eq('platform', row.platform)
      .maybeSingle()
    if (data) return data as ExistingPackage
  }
  return null
}

async function recordEvent(
  supabase: SupabaseClient,
  opts: {
    restaurantId: string
    trendyolPackageId: string
    packageStatus: string
    localPackageId: number
    isTest: boolean
    gecmisVeri: boolean
  }
) {
  await supabase.from('trendyol_go_package_events').upsert(
    {
      restaurant_id: opts.restaurantId,
      trendyol_package_id: opts.trendyolPackageId,
      package_status: opts.packageStatus,
      local_package_id: opts.localPackageId,
      is_test: opts.isTest,
      gecmis_veri: opts.gecmisVeri,
      processed_at: new Date().toISOString(),
    },
    { onConflict: 'trendyol_package_id,package_status', ignoreDuplicates: true }
  )
}

/**
 * packageId + packageStatus idempotent.
 * Aynı packageId farklı status → mevcut yerel kaydı GÜNCELLE.
 * UNIQUE çakışmalarında hata fırlatmaz; günceller veya atlar.
 * gecmis_veri yalnızca INSERT'te set edilir.
 */
export async function ingestTrendyolPackage(
  supabase: SupabaseClient,
  opts: {
    restaurantId: string
    pkg: TrendyolPackage
    gecmisVeri?: boolean
    report?: MappingReportAccumulator
    productLookupCache?: Map<string, string>
    onCancelledAssigned?: (info: {
      localPackageId: number
      courierId: string
      mapped: MappedLocalPackage
    }) => Promise<void>
  }
): Promise<IngestResult> {
  const gecmisVeri = Boolean(opts.gecmisVeri)
  let mapped: MappedLocalPackage | null = null
  const trendyolPackageId = String(opts.pkg.id || '')

  try {
    const productMap =
      opts.productLookupCache ||
      (await loadProductLookup(supabase, opts.restaurantId))
    mapped = mapPackageToLocal(opts.pkg, {
      gecmisVeri,
      productLookup: {
        getLocalProductId: (id) => productMap.get(id),
      },
      report: opts.report,
    })

    const packageStatus = mapped.package_status

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

    const { data: integRow } = await supabase
      .from('trendyol_go_integrations')
      .select('call_dial_template')
      .eq('restaurant_id', opts.restaurantId)
      .maybeSingle()

    const dialTemplate =
      (integRow?.call_dial_template as string | undefined)?.trim() ||
      DEFAULT_CALL_DIAL_TEMPLATE

    let existingPkg = await findExistingByConflict(supabase, {
      trendyol_package_id: mapped.trendyol_package_id,
      order_number: mapped.order_number,
      platform: mapped.platform,
    })

    let localPackageId: number
    let action: IngestResult['action']
    /** Event'e yazılacak bayrak: mevcut canlı kayıtta false korunur */
    let eventGecmisVeri = gecmisVeri

    if (existingPkg?.id) {
      const prevCourierId = existingPkg.courier_id as string | null
      eventGecmisVeri =
        existingPkg.gecmis_veri === false ? false : gecmisVeri

      const updatePayload = buildUpdateRow(
        mapped,
        opts.restaurantId,
        existingPkg,
        dialTemplate
      )

      const { data: updated, error } = await supabase
        .from('packages')
        .update(updatePayload)
        .eq('id', existingPkg.id)
        .select('id, courier_id, status')
        .single()

      if (error) {
        if (isUniqueViolation(error)) {
          const again = await findExistingByConflict(supabase, {
            trendyol_package_id: mapped.trendyol_package_id,
            order_number: mapped.order_number,
            platform: mapped.platform,
          })
          if (again?.id) {
            const retryPayload = buildUpdateRow(
              mapped,
              opts.restaurantId,
              again,
              dialTemplate
            )
            const { data: retryUpd, error: retryErr } = await supabase
              .from('packages')
              .update(retryPayload)
              .eq('id', again.id)
              .select('id')
              .single()
            if (retryErr) throw new Error(`Paket güncellenemedi: ${retryErr.message}`)
            localPackageId = retryUpd.id
            action = updatePayload.status === 'cancelled' ? 'cancelled' : 'updated'
            eventGecmisVeri =
              again.gecmis_veri === false ? false : gecmisVeri
          } else {
            throw new Error(`Paket güncellenemedi: ${error.message}`)
          }
        } else {
          throw new Error(`Paket güncellenemedi: ${error.message}`)
        }
      } else {
        localPackageId = updated.id
        action = updatePayload.status === 'cancelled' ? 'cancelled' : 'updated'
      }

      if (
        action === 'cancelled' &&
        prevCourierId &&
        !eventGecmisVeri &&
        opts.onCancelledAssigned &&
        mapped
      ) {
        await opts.onCancelledAssigned({
          localPackageId,
          courierId: prevCourierId,
          mapped,
        })
      }
    } else {
      const insertPayload = buildInsertRow(
        mapped,
        opts.restaurantId,
        gecmisVeri,
        dialTemplate
      )

      const { data: inserted, error } = await supabase
        .from('packages')
        .insert([insertPayload])
        .select('id')
        .single()

      if (error) {
        if (isUniqueViolation(error)) {
          existingPkg = await findExistingByConflict(supabase, {
            trendyol_package_id: mapped.trendyol_package_id,
            order_number: mapped.order_number,
            platform: mapped.platform,
          })
          if (existingPkg?.id) {
            const updPayload = buildUpdateRow(
              mapped,
              opts.restaurantId,
              existingPkg,
              dialTemplate
            )
            const { data: updated, error: updErr } = await supabase
              .from('packages')
              .update(updPayload)
              .eq('id', existingPkg.id)
              .select('id')
              .single()
            if (updErr) throw new Error(`Çakışma sonrası güncelleme: ${updErr.message}`)
            localPackageId = updated.id
            action = updPayload.status === 'cancelled' ? 'cancelled' : 'updated'
            eventGecmisVeri =
              existingPkg.gecmis_veri === false ? false : gecmisVeri
          } else {
            throw new Error(`Paket eklenemedi (unique): ${error.message}`)
          }
        } else {
          throw new Error(`Paket eklenemedi: ${error.message}`)
        }
      } else {
        localPackageId = inserted.id
        action = insertPayload.status === 'cancelled' ? 'cancelled' : 'inserted'
        eventGecmisVeri = gecmisVeri
      }
    }

    await recordEvent(supabase, {
      restaurantId: opts.restaurantId,
      trendyolPackageId,
      packageStatus,
      localPackageId,
      isTest: mapped.is_test_order,
      gecmisVeri: eventGecmisVeri,
    })

    return {
      action,
      localPackageId,
      trendyolPackageId,
      packageStatus,
      mapped,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      action: 'error',
      localPackageId: null,
      trendyolPackageId: trendyolPackageId || String(opts.pkg.id || ''),
      packageStatus: String(opts.pkg.packageStatus || ''),
      mapped,
      error: message,
    }
  }
}

/** Ingest hata logu — sessiz yutma yok */
export async function logIngestFailure(
  supabase: SupabaseClient,
  opts: {
    integrationId?: string | null
    restaurantId: string
    trendyolPackageId: string
    packageStatus?: string
    error: string
  }
) {
  await supabase.from('trendyol_go_api_logs').insert({
    integration_id: opts.integrationId || null,
    restaurant_id: opts.restaurantId,
    method: 'INGEST',
    path: `/local/packages/${opts.trendyolPackageId}`,
    query_masked: opts.packageStatus || null,
    status_code: 0,
    request_summary: null,
    response_summary: null,
    hata: opts.error,
    duration_ms: null,
  })
}
