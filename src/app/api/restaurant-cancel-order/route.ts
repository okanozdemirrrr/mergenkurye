/**
 * @file src/app/api/restaurant-cancel-order/route.ts
 * @description Restoran sipariş iptal API'si - Katı kurallarla
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { packageId, restaurantId, cancellationReason } = await request.json()

    if (!packageId || !restaurantId || !cancellationReason) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      )
    }

    // 1. Paketi getir ve kontrol et
    const { data: pkg, error: fetchError } = await supabase
      .from('packages')
      .select('*, courier:couriers(full_name, fcm_token), restaurant:restaurants(name)')
      .eq('id', packageId)
      .single()

    if (fetchError || !pkg) {
      return NextResponse.json(
        { error: 'Paket bulunamadı' },
        { status: 404 }
      )
    }

    // 2. Restoran yetkisi kontrolü
    if (pkg.restaurant_id !== restaurantId) {
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
