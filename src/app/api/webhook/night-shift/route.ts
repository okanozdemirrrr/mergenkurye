/**
 * @file src/app/api/webhook/night-shift/route.ts
 * @description Gece vardiyası paket atama webhook'u
 *
 * Supabase Database Webhook (packages INSERT) bu endpoint'i tetikler.
 * Atanan kuryeye FCM push notification gönderir.
 *
 * KULLANIM:
 * POST /api/webhook/night-shift
 * Header: x-api-secret: <NIGHT_SHIFT_WEBHOOK_SECRET>
 * Body: Supabase webhook payload ({ record: { courier_id, ... } })
 *       veya doğrudan paket objesi ({ courier_id, ... })
 *
 * ENV:
 * NIGHT_SHIFT_WEBHOOK_SECRET — webhook isteklerini doğrulayan secret
 * SERVICE_ROLE_KEY — couriers.fcm_token okumak için (RLS bypass)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { firebaseAdmin } from '@/lib/firebaseAdmin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY
const webhookSecret = process.env.NIGHT_SHIFT_WEBHOOK_SECRET

function getSupabase() {
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL yapılandırması eksik')
  }

  const apiKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!apiKey) {
    throw new Error('Supabase API key yapılandırması eksik')
  }

  return createClient(supabaseUrl, apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Supabase webhook veya düz paket payload'ından paket kaydını çıkarır */
function extractPackageRecord(body: Record<string, unknown>): Record<string, unknown> | null {
  if (body.record && typeof body.record === 'object') {
    return body.record as Record<string, unknown>
  }
  if (body.courier_id || body.id) {
    return body
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    // 1. API secret kontrolü
    if (!webhookSecret) {
      console.error('❌ NIGHT_SHIFT_WEBHOOK_SECRET tanımlı değil')
      return NextResponse.json(
        { error: 'Webhook secret yapılandırması eksik' },
        { status: 500 }
      )
    }

    const providedSecret = request.headers.get('x-api-secret')
    if (!providedSecret || providedSecret !== webhookSecret) {
      console.warn('⚠️ Gece vardiyası webhook: geçersiz veya eksik secret')
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    // 2. Payload'ı parse et
    const body = await request.json()
    const pkg = extractPackageRecord(body)

    if (!pkg) {
      return NextResponse.json(
        { error: 'Geçersiz webhook payload' },
        { status: 400 }
      )
    }

    const courierId = pkg.courier_id as string | null | undefined

    // Trigger kurye atamadıysa (vardiya dışı / gece kuryesi yok) bildirim gönderme
    if (!courierId) {
      console.log('ℹ️ Gece vardiyası webhook: courier_id yok, bildirim atlanıyor')
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'courier_id yok',
      })
    }

    console.log('🌙 Gece vardiyası push bildirimi:', {
      packageId: pkg.id,
      orderNumber: pkg.order_number,
      courierId,
    })

    // 3. Kuryenin FCM token'ını al
    const supabase = getSupabase()
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('fcm_token, full_name')
      .eq('id', courierId)
      .single()

    if (courierError || !courier) {
      console.error('❌ Kurye bulunamadı:', courierError)
      return NextResponse.json({ error: 'Kurye bulunamadı' }, { status: 404 })
    }

    if (!courier.fcm_token) {
      console.warn('⚠️ Kurye FCM token yok:', courierId)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'FCM token yok',
        courierName: courier.full_name,
      })
    }

    // 4. Restoran adını çöz (webhook record'unda genelde sadece restaurant_id olur)
    let restaurantName = (pkg.restaurant_name as string) || ''
    if (!restaurantName && pkg.restaurant_id != null) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', pkg.restaurant_id)
        .single()
      restaurantName = restaurant?.name || ''
    }
    restaurantName = restaurantName || 'Restoran'

    // 5. Push notification gönder
    if (!firebaseAdmin.apps.length) {
      throw new Error('Firebase Admin SDK başlatılmamış')
    }

    const deliveryAddress =
      (pkg.delivery_address as string) ||
      (pkg.customer_name as string) ||
      'Yeni teslimat'
    const title = 'Yeni Gece Paketi Atandı'
    const messageBody = `${restaurantName} - ${deliveryAddress}`

    const message = {
      token: courier.fcm_token,
      notification: {
        title,
        body: messageBody,
      },
      data: {
        type: 'night_shift_assignment',
        courierId: String(courierId),
        packageId: pkg.id != null ? String(pkg.id) : '',
        orderNumber: pkg.order_number != null ? String(pkg.order_number) : '',
        restaurantName,
        deliveryAddress,
        customerName: (pkg.customer_name as string) || '',
      },
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'mergen_high_priority',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          priority: 'max' as const,
          visibility: 'public' as const,
          tag: `night_shift_${courierId}`,
        },
      },
    }

    const messageId = await firebaseAdmin.messaging().send(message)

    console.log('✅ Gece vardiyası push gönderildi:', {
      courierId,
      courierName: courier.full_name,
      messageId,
      title,
    })

    return NextResponse.json({
      success: true,
      messageId,
      courierName: courier.full_name,
      title,
      body: messageBody,
    })
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    console.error('❌ Gece vardiyası webhook hatası:', error)

    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      console.warn('⚠️ Geçersiz FCM token')
    }

    return NextResponse.json(
      {
        error: 'Push notification gönderilemedi',
        details: err.message || 'Bilinmeyen hata',
      },
      { status: 500 }
    )
  }
}
