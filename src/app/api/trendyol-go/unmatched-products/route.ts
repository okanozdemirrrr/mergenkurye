import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { requireRestaurantSession } from '@/lib/panelSession'

export async function GET(request: NextRequest) {
  const auth = requireRestaurantSession(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('trendyol_go_product_mappings')
    .select('id, trendyol_product_id, trendyol_name, local_product_id, eslesmedi_mi, last_seen_at')
    .eq('restaurant_id', auth.restaurantId)
    .eq('eslesmedi_mi', true)
    .order('last_seen_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}
