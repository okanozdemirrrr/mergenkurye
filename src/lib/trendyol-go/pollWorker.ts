/**
 * Canlı polling: Created,Picking,Invoiced,Shipped,Cancelled,UnSupplied
 * İmleç: son başarılı okuma − 2 dk; tüm sayfalar bitmeden ilerletilmez.
 * Restoran kilidi: aynı anda tek worker.
 */

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from './crypto'
import { TrendyolGoHttpError, TrendyolGoReadClient } from './client'
import { ingestTrendyolPackage } from './ingest'
import { LIVE_POLL_STATUSES } from './types'

const LOOKBACK_MS = 2 * 60 * 1000
const LOCK_TTL_MS = 55_000
/** Edge/Vercel süre limitine yaklaşınca turu erken bitir */
const DEFAULT_BUDGET_MS = 50_000

export interface PollTickResult {
  integrationId: string
  restaurantId: string
  fetched: number
  inserted: number
  updated: number
  skipped: number
  cancelled: number
  error?: string
  markedSorunlu?: boolean
}

async function tryAcquireLock(
  supabase: SupabaseClient,
  integrationId: string,
  workerId: string
): Promise<boolean> {
  const now = Date.now()
  const lockUntil = new Date(now + LOCK_TTL_MS).toISOString()
  const nowIso = new Date(now).toISOString()

  const { data } = await supabase
    .from('trendyol_go_integrations')
    .update({
      kilitleyen_worker_id: workerId,
      kilit_bitis: lockUntil,
    })
    .eq('id', integrationId)
    .or(
      `kilitleyen_worker_id.is.null,kilit_bitis.lt.${nowIso},kilitleyen_worker_id.eq.${workerId}`
    )
    .select('id')
    .maybeSingle()

  return Boolean(data)
}

async function releaseLock(
  supabase: SupabaseClient,
  integrationId: string,
  workerId: string
) {
  await supabase
    .from('trendyol_go_integrations')
    .update({ kilitleyen_worker_id: null, kilit_bitis: null })
    .eq('id', integrationId)
    .eq('kilitleyen_worker_id', workerId)
}

async function notifyCourierCancel(
  supabase: SupabaseClient,
  info: { localPackageId: number; courierId: string; orderCode: string | null }
) {
  const { data: courier } = await supabase
    .from('couriers')
    .select('fcm_token')
    .eq('id', info.courierId)
    .maybeSingle()

  if (!courier?.fcm_token) return

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    ''
  const origin = base
    ? base.startsWith('http')
      ? base
      : `https://${base}`
    : ''

  if (!origin) {
    console.warn('İptal bildirimi: APP URL yok')
    return
  }

  try {
    await fetch(`${origin}/api/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courierId: info.courierId,
        titleOverride: 'İPTAL EDİLDİ',
        bodyOverride: `Trendyol sipariş ${info.orderCode || info.localPackageId} iptal edildi. Teslimata gitmeyin.`,
      }),
    })
  } catch (e) {
    console.error('İptal push hatası:', e)
  }
}

export async function pollOneIntegration(
  supabase: SupabaseClient,
  integ: Record<string, unknown>,
  workerId: string
): Promise<PollTickResult> {
  const integrationId = String(integ.id)
  const restaurantId = String(integ.restaurant_id)
  const result: PollTickResult = {
    integrationId,
    restaurantId,
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    cancelled: 0,
  }

  const locked = await tryAcquireLock(supabase, integrationId, workerId)
  if (!locked) {
    result.error = 'Kilit alınamadı (başka worker)'
    return result
  }

  try {
    const apiSecret = integ.api_secret_encrypted
      ? await decryptSecret(String(integ.api_secret_encrypted))
      : undefined
    const basicToken = integ.basic_token_encrypted
      ? await decryptSecret(String(integ.basic_token_encrypted))
      : undefined

    const client = new TrendyolGoReadClient({
      environment: integ.ortam === 'stage' ? 'stage' : 'prod',
      auth: {
        apiKey: String(integ.api_key),
        apiSecret,
        basicToken,
        agentName: String(integ.agent_name || 'Regon'),
        executorEmail: String(integ.executor_email),
      },
      onLog: async (entry) => {
        await supabase.from('trendyol_go_api_logs').insert({
          integration_id: integrationId,
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

    const endMs = Date.now()
    const cursor = typeof integ.son_polling_imleci === 'number'
      ? integ.son_polling_imleci
      : endMs - 30 * 60 * 1000
    const startMs = Math.max(0, Number(cursor) - LOOKBACK_MS)

    const { packages } = await client.listAllPackages({
      supplierId: Number(integ.supplier_id),
      storeId: String(integ.store_id),
      packageStatuses: LIVE_POLL_STATUSES,
      packageModificationStartDate: startMs,
      packageModificationEndDate: endMs,
      size: 50,
    })

    result.fetched = packages.length

    for (const pkg of packages) {
      const r = await ingestTrendyolPackage(supabase, {
        restaurantId,
        pkg,
        gecmisVeri: false,
        onCancelledAssigned: async ({ localPackageId, courierId, mapped }) => {
          await notifyCourierCancel(supabase, {
            localPackageId,
            courierId,
            orderCode: mapped.trendyol_order_code,
          })
        },
      })
      if (r.action === 'inserted') result.inserted += 1
      else if (r.action === 'updated') result.updated += 1
      else if (r.action === 'skipped_idempotent') result.skipped += 1
      else if (r.action === 'cancelled') result.cancelled += 1
    }

    // Tüm sayfalar okundu → imleci ilerlet
    await supabase
      .from('trendyol_go_integrations')
      .update({
        son_polling_imleci: endMs,
        son_basarili_baglanti: new Date().toISOString(),
        son_hata: null,
        durum: 'ok',
      })
      .eq('id', integrationId)

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    result.error = message

    const sorunlu =
      err instanceof TrendyolGoHttpError &&
      (err.statusCode === 401 || err.statusCode === 403)

    await supabase
      .from('trendyol_go_integrations')
      .update({
        son_hata: message,
        ...(sorunlu ? { durum: 'sorunlu', aktif_mi: false } : {}),
      })
      .eq('id', integrationId)

    result.markedSorunlu = sorunlu
    return result
  } finally {
    await releaseLock(supabase, integrationId, workerId)
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * pg_cron dakikada 1 → bu fonksiyon polling_araligi_sn ile ~4 tur.
 * Her tick try/catch; biri patlarsa diğerleri devam.
 */
export async function runPollWithTicks(
  supabase: SupabaseClient,
  opts?: { budgetMs?: number; workerId?: string }
): Promise<{
  ticks: number
  durationMs: number
  results: PollTickResult[][]
  stoppedEarly: boolean
}> {
  const started = Date.now()
  const budgetMs = opts?.budgetMs ?? DEFAULT_BUDGET_MS
  const workerId = opts?.workerId || `poll-${randomUUID()}`
  const allResults: PollTickResult[][] = []
  let ticks = 0
  let stoppedEarly = false

  const { data: integrations } = await supabase
    .from('trendyol_go_integrations')
    .select('*')
    .eq('aktif_mi', true)
    .eq('durum', 'ok')

  const list = integrations || []
  if (!list.length) {
    return { ticks: 0, durationMs: Date.now() - started, results: [], stoppedEarly: false }
  }

  // En küçük aralığı kullan (varsayılan 15)
  const intervalSec = Math.min(
    ...list.map((i) => Number(i.polling_araligi_sn) || 15),
    15
  )
  const maxTicks = Math.max(1, Math.floor(55 / intervalSec))

  for (let t = 0; t < maxTicks; t++) {
    if (Date.now() - started > budgetMs) {
      stoppedEarly = true
      console.warn(
        `[trendyol-go-poll] süre bütçesi (${budgetMs}ms) — tur erken bitti, ticks=${ticks}`
      )
      break
    }

    const tickResults: PollTickResult[] = []
    for (const integ of list) {
      try {
        const r = await pollOneIntegration(supabase, integ, `${workerId}-t${t}`)
        tickResults.push(r)
      } catch (e) {
        tickResults.push({
          integrationId: String(integ.id),
          restaurantId: String(integ.restaurant_id),
          fetched: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          cancelled: 0,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }

    allResults.push(tickResults)
    ticks += 1

    if (t < maxTicks - 1) {
      const remaining = budgetMs - (Date.now() - started)
      const wait = Math.min(intervalSec * 1000, Math.max(0, remaining - 500))
      if (wait <= 0) {
        stoppedEarly = true
        break
      }
      await sleep(wait)
    }
  }

  const durationMs = Date.now() - started
  console.log(
    `[trendyol-go-poll] ticks=${ticks} durationMs=${durationMs} stoppedEarly=${stoppedEarly}`
  )

  return { ticks, durationMs, results: allResults, stoppedEarly }
}
