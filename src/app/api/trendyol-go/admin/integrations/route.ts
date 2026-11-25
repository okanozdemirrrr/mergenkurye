/** Admin: entegrasyonu olan restoran listesi (secret yok) */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminSession } from '@/lib/panelSession'
import { maskSecret } from '@/lib/trendyol-go/crypto'

export async function GET(request: NextRequest) {
  const auth = requireAdminSession(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('trendyol_go_integrations')
    .select(
      'id, restaurant_id, supplier_id, store_id, ortam, aktif_mi, durum, son_basarili_baglanti, son_hata, api_key, restaurants(id, name)'
    )
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    restaurant_id: row.restaurant_id,
    restaurant_name: (row.restaurants as { name?: string } | null)?.name || '—',
    supplier_id: row.supplier_id,
    store_id: row.store_id,
    ortam: row.ortam,
    aktif_mi: row.aktif_mi,
    durum: row.durum,
    son_basarili_baglanti: row.son_basarili_baglanti,
    son_hata: row.son_hata,
    api_key_masked: maskSecret(String(row.api_key || '')),
  }))

  return NextResponse.json({ items })
}
