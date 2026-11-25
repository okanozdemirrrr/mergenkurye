/**
 * GET  — maskeli ayarlar (secret yok)
 * PUT  — kaydet (önce bağlantı testi zorunlu değil; test ayrı uç)
 * restaurantId yalnızca oturum çerezinden.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { requireRestaurantSession } from '@/lib/panelSession'
import {
  encryptSecret,
  getCurrentKeyVersion,
  maskSecret,
} from '@/lib/trendyol-go/crypto'

function publicSettings(row: Record<string, unknown> | null) {
  if (!row) return null
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    store_id: row.store_id,
    api_key_masked: maskSecret(String(row.api_key || '')),
    has_api_secret: Boolean(row.api_secret_encrypted),
    has_basic_token: Boolean(row.basic_token_encrypted),
    api_secret_masked: row.api_secret_encrypted ? '••••••••' : '',
    basic_token_masked: row.basic_token_encrypted ? '••••••••' : '',
    agent_name: row.agent_name,
    executor_email: row.executor_email,
    ortam: row.ortam,
    aktif_mi: row.aktif_mi,
    polling_araligi_sn: row.polling_araligi_sn,
    son_polling_imleci: row.son_polling_imleci,
    son_basarili_baglanti: row.son_basarili_baglanti,
    son_hata: row.son_hata,
    durum: row.durum,
    key_version: row.key_version,
    updated_at: row.updated_at,
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRestaurantSession(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('trendyol_go_integrations')
    .select('*')
    .eq('restaurant_id', auth.restaurantId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: publicSettings(data) })
}

export async function PUT(request: NextRequest) {
  const auth = requireRestaurantSession(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    // restaurantId gövdeden kabul edilmez
    if (body.restaurantId || body.restaurant_id) {
      return NextResponse.json(
        { error: 'restaurantId istek gövdesinden kabul edilmez' },
        { status: 403 }
      )
    }

    const supplierId = Number(body.supplier_id)
    const storeId = String(body.store_id || '').trim()
    const apiKeyInput = String(body.api_key || '').trim()
    const agentName = String(body.agent_name || 'Regon').trim()
    const executorEmail = String(body.executor_email || '').trim()
    const ortam = body.ortam === 'stage' ? 'stage' : 'prod'
    const aktifMi = Boolean(body.aktif_mi)
    const polling = Math.min(120, Math.max(5, Number(body.polling_araligi_sn) || 15))

    if (!supplierId || !storeId || !executorEmail) {
      return NextResponse.json(
        { error: 'supplier_id, store_id ve executor_email zorunlu' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: existing } = await supabase
      .from('trendyol_go_integrations')
      .select('*')
      .eq('restaurant_id', auth.restaurantId)
      .maybeSingle()

    const apiKey = apiKeyInput || (existing?.api_key ? String(existing.api_key) : '')
    if (!apiKey) {
      return NextResponse.json({ error: 'api_key zorunlu' }, { status: 400 })
    }

    const apiSecretPlain =
      typeof body.api_secret === 'string' && body.api_secret.trim()
        ? body.api_secret.trim()
        : null
    const basicTokenPlain =
      typeof body.basic_token === 'string' && body.basic_token.trim()
        ? body.basic_token.trim()
        : null

    if (!existing && !apiSecretPlain && !basicTokenPlain) {
      return NextResponse.json(
        { error: 'api_secret veya basic_token gerekli' },
        { status: 400 }
      )
    }

    // Bağlantı testi zorunlu bayrak: connection_tested === true
    if (body.connection_tested !== true) {
      return NextResponse.json(
        {
          error:
            'Önce “Bağlantıyı Test Et” ile başarılı test yapın, sonra kaydedin.',
        },
        { status: 400 }
      )
    }

    const keyVersion = getCurrentKeyVersion()
    const patch: Record<string, unknown> = {
      restaurant_id: auth.restaurantId,
      supplier_id: supplierId,
      store_id: storeId,
      api_key: apiKey,
      agent_name: agentName,
      executor_email: executorEmail,
      ortam,
      aktif_mi: aktifMi,
      polling_araligi_sn: polling,
      key_version: keyVersion,
      updated_at: new Date().toISOString(),
      durum: 'ok',
      son_hata: null,
      son_basarili_baglanti: new Date().toISOString(),
    }

    try {
      if (apiSecretPlain) {
        patch.api_secret_encrypted = await encryptSecret(apiSecretPlain, keyVersion)
      }
      if (basicTokenPlain) {
        patch.basic_token_encrypted = await encryptSecret(basicTokenPlain, keyVersion)
      }
    } catch (encErr) {
      return NextResponse.json(
        {
          error:
            encErr instanceof Error
              ? encErr.message
              : 'Secret şifrelenemedi — INTEGRATION_SECRETS_KEY kontrol edin',
        },
        { status: 500 }
      )
    }

    const { data, error } = await supabase
      .from('trendyol_go_integrations')
      .upsert(patch, { onConflict: 'restaurant_id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: publicSettings(data) })
  } catch (err) {
    console.error('trendyol-go settings PUT:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kayıt başarısız' },
      { status: 500 }
    )
  }
}
