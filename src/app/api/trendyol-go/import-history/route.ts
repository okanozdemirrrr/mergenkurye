/**
 * Admin geliştirici aracı: geçmiş sipariş içe aktarma.
 * Delivered,Cancelled — gecmis_veri=true.
 * son_polling_imleci DEĞİŞTİRİLMEZ. Kendi import kilidi var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminSession } from '@/lib/panelSession'
import { decryptSecret } from '@/lib/trendyol-go/crypto'
import {
  TrendyolGoHttpError,
  TrendyolGoReadClient,
} from '@/lib/trendyol-go/client'
import {
  createEmptyMappingReport,
  ingestTrendyolPackage,
} from '@/lib/trendyol-go'
import { HISTORY_IMPORT_STATUSES } from '@/lib/trendyol-go/types'

export async function POST(request: NextRequest) {
  const auth = requireAdminSession(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const workerId = `import-${randomUUID()}`
  const supabase = getSupabaseAdmin()
  let integrationId: string | null = null

  try {
    const body = await request.json()
    const restaurantId = String(body.restaurant_id || '').trim()
    const startMs = Number(body.start_ms)
    const endMs = Number(body.end_ms)

    if (!restaurantId || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return NextResponse.json(
        { error: 'restaurant_id, start_ms, end_ms zorunlu' },
        { status: 400 }
      )
    }
    if (endMs <= startMs) {
      return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan sonra olmalı' }, { status: 400 })
    }

    const { data: integ, error: integErr } = await supabase
      .from('trendyol_go_integrations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()

    if (integErr || !integ) {
      return NextResponse.json(
        { error: 'Bu restoran için Trendyol Go ayarı bulunamadı' },
        { status: 404 }
      )
    }

    integrationId = integ.id

    // Import kilidi
    const now = Date.now()
    if (
      integ.import_kilitleyen_worker_id &&
      integ.import_kilit_bitis &&
      new Date(integ.import_kilit_bitis).getTime() > now
    ) {
      return NextResponse.json(
        { error: 'Bu restoran için geçmiş içe aktarma zaten çalışıyor' },
        { status: 409 }
      )
    }

    const lockUntil = new Date(now + 15 * 60 * 1000).toISOString()
    const { data: locked } = await supabase
      .from('trendyol_go_integrations')
      .update({
        import_kilitleyen_worker_id: workerId,
        import_kilit_bitis: lockUntil,
      })
      .eq('id', integ.id)
      .or(
        `import_kilitleyen_worker_id.is.null,import_kilit_bitis.lt.${new Date(now).toISOString()},import_kilitleyen_worker_id.eq.${workerId}`
      )
      .select('id')
      .maybeSingle()

    if (!locked) {
      return NextResponse.json(
        { error: 'Import kilidi alınamadı' },
        { status: 409 }
      )
    }

    const apiSecret = integ.api_secret_encrypted
      ? await decryptSecret(integ.api_secret_encrypted)
      : undefined
    const basicToken = integ.basic_token_encrypted
      ? await decryptSecret(integ.basic_token_encrypted)
      : undefined

    const client = new TrendyolGoReadClient({
      environment: integ.ortam === 'stage' ? 'stage' : 'prod',
      auth: {
        apiKey: integ.api_key,
        apiSecret,
        basicToken,
        agentName: integ.agent_name,
        executorEmail: integ.executor_email,
      },
      onLog: async (entry) => {
        await supabase.from('trendyol_go_api_logs').insert({
          integration_id: integ.id,
          restaurant_id: restaurantId,
          method: entry.method,
          path: entry.path,
          query_masked: entry.queryMasked,
          status_code: entry.statusCode,
          request_summary: entry.requestSummary,
          response_summary: entry.responseSummary,
          hata: entry.hata,
          duration_ms: entry.durationMs,
        })
      },
    })

    const { packages, totalCount } = await client.listAllPackages({
      supplierId: integ.supplier_id,
      storeId: integ.store_id,
      packageStatuses: HISTORY_IMPORT_STATUSES,
      packageModificationStartDate: startMs,
      packageModificationEndDate: endMs,
      size: 50,
    })

    const report = createEmptyMappingReport()
    const results: Array<{ action: string; packageId: string; status: string }> = []

    for (const pkg of packages) {
      const r = await ingestTrendyolPackage(supabase, {
        restaurantId,
        pkg,
        gecmisVeri: true,
        report,
      })
      results.push({
        action: r.action,
        packageId: r.trendyolPackageId,
        status: r.packageStatus,
      })
    }

    // son_polling_imleci bilerek dokunulmaz

    return NextResponse.json({
      ok: true,
      totalCount,
      fetched: packages.length,
      report,
      resultsSummary: {
        inserted: results.filter((r) => r.action === 'inserted').length,
        updated: results.filter((r) => r.action === 'updated').length,
        skipped: results.filter((r) => r.action === 'skipped_idempotent').length,
        cancelled: results.filter((r) => r.action === 'cancelled').length,
      },
    })
  } catch (err) {
    console.error('import-history:', err)
    const message =
      err instanceof TrendyolGoHttpError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'İçe aktarma başarısız'
    return NextResponse.json({ error: message }, { status: 400 })
  } finally {
    if (integrationId) {
      await supabase
        .from('trendyol_go_integrations')
        .update({
          import_kilitleyen_worker_id: null,
          import_kilit_bitis: null,
        })
        .eq('id', integrationId)
        .eq('import_kilitleyen_worker_id', workerId)
    }
  }
}
