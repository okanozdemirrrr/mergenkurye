import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { requireRestaurantSession } from '@/lib/panelSession'

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

    const trendyolProductId = String(body.trendyol_product_id || '').trim()
    const localProductId = String(body.local_product_id || '').trim()

    if (!trendyolProductId || !localProductId) {
      return NextResponse.json(
        { error: 'trendyol_product_id ve local_product_id zorunlu' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', localProductId)
      .eq('restaurant_id', auth.restaurantId)
      .maybeSingle()

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bu restorana ait değil veya bulunamadı' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('trendyol_go_product_mappings')
      .upsert(
        {
          restaurant_id: auth.restaurantId,
          trendyol_product_id: trendyolProductId,
          local_product_id: localProductId,
          eslesmedi_mi: false,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id,trendyol_product_id' }
      )
      .select('id, trendyol_product_id, local_product_id, eslesmedi_mi')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mapping: data })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eşleme başarısız' },
      { status: 500 }
    )
  }
}
