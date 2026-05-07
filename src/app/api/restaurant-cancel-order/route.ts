/**
 * @file src/app/api/restaurant-cancel-order/route.ts
 * @description Restoran sipariş iptal API'si - Katı kurallarla
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API route'lar için service role key kullan (RLS bypass)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { packageId, restaurantId, cancellationReason } = await request.json()

    console.log('🔍 İptal isteği alındı:', { packageId, restaurantId, cancellationReason, packageIdType: typeof packageId })

    if (!packageId || !restaurantId || !cancellationReason) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      )
    }

    // restaurantId'yi integer'a çevir (string olarak gelebilir)
    const restaurantIdInt = typeof restaurantId === 'string' ? parseInt(restaurantId) : restaurantId

    // 1. Paketi getir - packageId hem id hem order_number olabilir
    let query = supabase
      .from('packages')
      .select('*, courier:couriers(full_name, fcm_token), restaurant:restaurants(name)')

    // Eğer packageId sayısal değilse veya string ise order_number ile ara
    if (typeof packageId === 'string' && packageId.includes('0')) {
      // order_number formatında (örn: "006944")
      query = query.eq('order_number', packageId)
    } else {
      // Normal ID
      query = query.eq('id', packageId)
    }

    const { data: pkg, error: fetchError } = await query.single()

    console.log('📦 Paket sorgu sonucu:', { 
      pkg: pkg ? { id: pkg.id, order_number: pkg.order_number, restaurant_id: pkg.restaurant_id } : null, 
      fetchError 
    })

    if (fetchError || !pkg) {
      console.error('❌ Paket bulunamadı:', { packageId, fetchError })
      return NextResponse.json(
        { 
          error: 'Paket bulunamadı',
          debug: {
            packageId,
            packageIdType: typeof packageId,
            errorMessage: fetchError?.message,
            errorCode: fetchError?.code,
            hint: 'packageId olarak id veya order_number gönderilebilir'
          }
        },
        { status: 404 }
      )
    }

    // 2. Restoran yetkisi kontrolü
    if (pkg.restaurant_id !== restaurantIdInt) {
      console.error('❌ Yetki hatası:', { 
        pkgRestaurantId: pkg.restaurant_id, 
        requestRestaurantId: restaurantIdInt,
        type: typeof pkg.restaurant_id
      })
      return NextResponse.json(
        { error: 'Bu siparişi iptal etme yetkiniz yok' },
        { status: 403 }
      )
    }

    // 3. KRİTİK KURAL: Sadece belirli durumlarda iptal edilebilir
    const allowedStatuses = ['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up']
    
    if (!allowedStatuses.includes(pkg.status)) {
      return NextResponse.json(
        { 
          error: 'Kurye yola çıktığı için sipariş iptal edilemez',
          message: 'Lütfen merkezle (admin) iletişime geçin.',
          currentStatus: pkg.status
        },
        { status: 403 }
      )
    }

    // 4. Paketi iptal et
    const { error: updateError } = await supabase
      .from('packages')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'restaurant',
        cancellation_reason: cancellationReason
      })
      .eq('id', packageId)

    if (updateError) {
      console.error('❌ Paket iptal hatası:', updateError)
      return NextResponse.json(
        { error: 'Paket iptal edilemedi' },
        { status: 500 }
      )
    }

    // 5. Kuryeye bildirim gönder (eğer atanmışsa)
    if (pkg.courier_id && pkg.courier?.fcm_token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: pkg.courier.fcm_token,
            title: '⚠️ Sipariş İptal Edildi',
            body: `${pkg.restaurant?.name || 'Restoran'} #${pkg.order_number} numaralı siparişi iptal etti. O adrese gitmeyin!`,
            data: {
              type: 'order_cancelled',
              packageId: packageId.toString(),
              orderNumber: pkg.order_number
            }
          })
        })
        console.log('✅ Kuryeye iptal bildirimi gönderildi')
      } catch (pushError) {
        console.error('⚠️ Push bildirimi gönderilemedi:', pushError)
        // Bildirim hatası ana işlemi engellemez
      }
    }

    // 6. Admin log'u oluştur (order_logs tablosu varsa)
    try {
      await supabase.from('order_logs').insert({
        package_id: packageId,
        action: 'cancelled_by_restaurant',
        details: {
          restaurant_id: restaurantId,
          restaurant_name: pkg.restaurant?.name,
          reason: cancellationReason,
          previous_status: pkg.status,
          courier_id: pkg.courier_id,
          courier_name: pkg.courier?.full_name
        },
        created_at: new Date().toISOString()
      })
      console.log('✅ Admin log kaydedildi')
    } catch (logError) {
      console.error('⚠️ Log kaydedilemedi:', logError)
      // Log hatası ana işlemi engellemez
    }

    return NextResponse.json({
      success: true,
      message: 'Sipariş başarıyla iptal edildi',
      notifiedCourier: !!pkg.courier_id
    })

  } catch (error) {
    console.error('❌ Restoran iptal API hatası:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
