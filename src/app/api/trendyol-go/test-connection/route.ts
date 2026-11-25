/**
 * Bağlantı testi: GET packages (salt okuma). 200 değilse kaydetme.
 * Secret'lar yanıta dönmez.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { requireRestaurantSession } from '@/lib/panelSession'
import { decryptSecret } from '@/lib/trendyol-go/crypto'
import {
  TrendyolGoHttpError,
  TrendyolGoReadClient,
  turkishErrorMessage,
} from '@/lib/trendyol-go/client'
import type { TrendyolGoEnvironment } from '@/lib/trendyol-go/types'

export async function POST(request: NextRequest) {
  const auth = requireRestaurantSession(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    if (body.restaurantId || body.restaurant_id) {
      return NextResponse.json(
        { error: 'restaurantId istek gövdesinden kabul edilmez' },
        { status: 403 }
      )
    }

    const supplierId = Number(body.supplier_id)
    const storeId = String(body.store_id || '').trim()
    let apiKey = String(body.api_key || '').trim()
    let secret = typeof body.api_secret === 'string' ? body.api_secret.trim() : ''
    let token = typeof body.basic_token === 'string' ? body.basic_token.trim() : ''
    const agentName = String(body.agent_name || 'Regon').trim()
    const executorEmail = String(body.executor_email || '').trim()
    const ortam = (body.ortam === 'stage' ? 'stage' : 'prod') as TrendyolGoEnvironment

    if (!supplierId || !storeId || !executorEmail) {
      return NextResponse.json(
        { error: 'supplier_id, store_id ve executor_email zorunlu' },
        { status: 400 }
      )
    }

    const supabaseLookup = getSupabaseAdmin()
    const { data: existing } = await supabaseLookup
      .from('trendyol_go_integrations')
      .select('api_key, api_secret_encrypted, basic_token_encrypted')
      .eq('restaurant_id', auth.restaurantId)
      .maybeSingle()

    if (!apiKey && existing?.api_key) apiKey = String(existing.api_key)
    if (!secret && existing?.api_secret_encrypted) {
      secret = await decryptSecret(existing.api_secret_encrypted)
    }
    if (!token && existing?.basic_token_encrypted) {
      token = await decryptSecret(existing.basic_token_encrypted)
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'api_key zorunlu' }, { status: 400 })
    }
    if (!secret && !token) {
      return NextResponse.json(
        { error: 'api_secret veya basic_token gerekli' },
        { status: 400 }
      )
    }

    const supabase = supabaseLookup
    const { data: integ } = await supabase
      .from('trendyol_go_integrations')
      .select('id')
      .eq('restaurant_id', auth.restaurantId)
      .maybeSingle()

    const client = new TrendyolGoReadClient({
      environment: ortam,
      auth: {
        apiKey,
        apiSecret: secret || undefined,
        basicToken: token || undefined,
        agentName,
        executorEmail,
      },
      maxRetries: 1,
      onLog: async (entry) => {
        await supabase.from('trendyol_go_api_logs').insert({
          integration_id: integ?.id || null,
          restaurant_id: auth.restaurantId,
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

    const end = Date.now()
    const start = end - 7 * 24 * 60 * 60 * 1000

    const res = await client.listPackages({
      supplierId,
      storeId,
      packageStatuses: ['Created', 'Picking', 'Invoiced', 'Shipped', 'Cancelled', 'UnSupplied'],
      packageModificationStartDate: start,
      packageModificationEndDate: end,
      page: 0,
      size: 1,
    })

    return NextResponse.json({
      ok: true,
      message: 'Bağlantı başarılı',
      sampleTotalCount: res.totalCount ?? 0,
    })
  } catch (err) {
    if (err instanceof TrendyolGoHttpError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.statusCode === 401 || err.statusCode === 403 ? err.statusCode : 400 }
      )
    }
    console.error('test-connection:', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : turkishErrorMessage(0, ''),
      },
      { status: 400 }
    )
  }
}
