/**
 * Panel oturumu: restoran veya admin kimlik doğrulaması → HttpOnly imzalı çerez.
 * Trendyol Go API'leri restaurantId'yi bu çerezden türetir.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import {
  applySessionCookie,
  buildAdminSession,
  buildRestaurantSession,
} from '@/lib/panelSession'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const role = body?.role as 'restaurant' | 'admin' | undefined
    const username = String(body?.username || '').trim()
    const password = String(body?.password || '')

    if (!role || !username || !password) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    if (role === 'admin') {
      if (username === 'admin' && password === 'admin12344') {
        const res = NextResponse.json({ ok: true, role: 'admin' })
        return applySessionCookie(res, buildAdminSession())
      }
      return NextResponse.json({ error: 'Admin kullanıcı adı veya şifre hatalı' }, { status: 401 })
    }

    if (role === 'restaurant') {
      const supabase = getSupabaseAdmin()
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('name', username)
        .eq('password', password)
        .maybeSingle()

      if (error || !restaurant) {
        return NextResponse.json(
          { error: 'Restoran adı veya şifre hatalı' },
          { status: 401 }
        )
      }

      const res = NextResponse.json({
        ok: true,
        role: 'restaurant',
        restaurantId: restaurant.id,
      })
      return applySessionCookie(res, buildRestaurantSession(restaurant.id))
    }

    return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 })
  } catch (err) {
    console.error('panel-session error:', err)
    return NextResponse.json({ error: 'Oturum oluşturulamadı' }, { status: 500 })
  }
}
