/**
 * @file src/app/api/restaurant-cancel-order/route.ts
 * @description Restoran sipariş iptal API'si - Katı kurallarla
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// API route'lar için service role key kullan (RLS bypass)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY

// Environment variables kontrolü
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL eksik!')
  throw new Error('Supabase URL yapılandırması eksik')
}

if (!supabaseServiceKey) {
  console.error('❌ SERVICE_ROLE_KEY eksik! Anon key kullanılacak (RLS aktif olacak)')
  console.warn('⚠️ Production ortamında SERVICE_ROLE_KEY mutlaka tanımlanmalı!')
}

// Service Role Key yoksa Anon Key kullan (fallback)
const apiKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, apiKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔑 Supabase Client Yapılandırması:', {
  url: supabaseUrl,
  keyType: supabaseServiceKey ? 'SERVICE_ROLE_KEY' : 'ANON_KEY',
  keyLength: apiKey?.length || 0,
  keyPrefix: apiKey?.substring(0, 10) + '...'
})

export async function POST(request: NextRequest) {
  try {
    const { packageId, restaurantId, cancellationReason } = await request.json()

    console.log('🔍 İptal isteği alındı:', { 
      packageId, 
      packageIdType: typeof packageId,
      restaurantId, 
      restaurantIdType: typeof restaurantId,
      cancellationReason 
    })

    // 1. Parametre validasyonu
    if (!packageId || !restaurantId || !cancellationReason) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      )
    }

    // restaurantId'yi string olarak kullan (UUID olabilir)
    const restaurantIdStr = String(restaurantId)

    // 2. ADIM 1: Paketi bul (RLS bypass ile service role kullanıyoruz)
    const { data: pkg, error: fetchError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single()

    console.log('📦 Paket sorgu sonucu:', { 
      found: !!pkg,
      packageId,
      pkg: pkg ? { 
        id: pkg.id, 
        order_number: pkg.order_number, 
        restaurant_id: pkg.restaurant_id,
        status: pkg.status 
      } : null,
      fetchError: fetchError ? {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint
      } : null
    })

    // Eğer paket bulunduysa, courier ve restaurant bilgilerini ayrı sorgularla al
    let courierData: any = null
    let restaurantData: any = null

    if (pkg) {
      // Courier bilgisi
      if (pkg.courier_id) {
        const { data: courier } = await supabase
          .from('couriers')
          .select('full_name, fcm_token')
          .eq('id', pkg.courier_id)
          .single()
        courierData = courier
      }

      // Restaurant bilgisi
      if (pkg.restaurant_id) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', pkg.restaurant_id)
          .single()
        restaurantData = restaurant
      }
    }

    // ADIM 2: Paket bulunamadı hatası (gerçek 404)
    if (fetchError || !pkg) {
      console.error('❌ Paket veritabanında bulunamadı:', { packageId, fetchError })
      
      // API Key hatası özel olarak yakala
      if (fetchError?.message?.includes('Invalid API key') || fetchError?.message?.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'Sistem Yapılandırma Hatası',
            message: 'Sunucu API anahtarı geçersiz veya eksik. Lütfen sistem yöneticisine bildirin.',
            technicalDetails: 'Supabase SERVICE_ROLE_KEY environment variable eksik veya hatalı',
            debug: {
              errorMessage: fetchError?.message,
              errorCode: fetchError?.code,
              hint: 'Vercel Dashboard → Settings → Environment Variables → SERVICE_ROLE_KEY kontrol edin'
            }
          },
          { status: 500 }
        )
      }

      // Yetkilendirme hatası
      if (fetchError?.code === 'PGRST301' || fetchError?.message?.includes('permission')) {
        return NextResponse.json(
          { 
            error: 'Yetkilendirme Hatası',
            message: 'Bu işlem için yeterli yetkiniz yok. RLS policy kontrolü gerekli.',
            technicalDetails: 'Supabase Row Level Security (RLS) bu işlemi engelliyor',
            debug: {
              errorMessage: fetchError?.message,
              errorCode: fetchError?.code,
              hint: 'SERVICE_ROLE_KEY kullanılıyor mu kontrol edin'
            }
          },
          { status: 403 }
        )
      }

      // Genel paket bulunamadı hatası
      return NextResponse.json(
        { 
          error: 'Paket bulunamadı',
          message: 'Bu sipariş veritabanında mevcut değil veya silinmiş olabilir.',
          debug: {
            packageId,
            packageIdType: typeof packageId,
            errorMessage: fetchError?.message,
            errorCode: fetchError?.code,
            errorDetails: fetchError?.details,
            errorHint: fetchError?.hint
          }
        },
        { status: 404 }
      )
    }

    // ADIM 3: Restoran yetkisi kontrolü
    // restaurant_id hem UUID hem integer olabilir, string karşılaştırması yap
    const pkgRestaurantIdStr = String(pkg.restaurant_id)
    if (pkgRestaurantIdStr !== restaurantIdStr) {
      console.error('❌ Yetki hatası:', { 
        pkgRestaurantId: pkg.restaurant_id, 
        requestRestaurantId: restaurantIdStr,
        pkgRestaurantIdType: typeof pkg.restaurant_id,
        requestRestaurantIdType: typeof restaurantIdStr
      })
      return NextResponse.json(
        { 
          error: 'Yetki hatası',
          message: 'Bu siparişi iptal etme yetkiniz yok. Bu sipariş başka bir restorana ait.'
        },
        { status: 403 }
      )
    }

    // ADIM 4: Durum kontrolü - İptal edilebilir mi?
    const allowedStatuses = ['new_order', 'getting_ready', 'ready', 'assigned', 'picking_up']
    
    if (!allowedStatuses.includes(pkg.status)) {
      console.warn('⚠️ İptal edilemez durum:', { 
        currentStatus: pkg.status, 
        allowedStatuses 
      })
      
      // Duruma göre özel mesajlar
      let statusMessage = ''
      if (pkg.status === 'on_the_way') {
        statusMessage = 'Kurye yola çıktığı için sipariş iptal edilemez.'
      } else if (pkg.status === 'delivered') {
        statusMessage = 'Teslim edilmiş sipariş iptal edilemez.'
      } else if (pkg.status === 'cancelled') {
        statusMessage = 'Bu sipariş zaten iptal edilmiş.'
      } else {
        statusMessage = `Sipariş "${pkg.status}" durumunda olduğu için iptal edilemez.`
      }
      
      return NextResponse.json(
        { 
          error: 'İptal edilemez',
          message: statusMessage,
          hint: 'Lütfen merkezle (admin) iletişime geçin.',
          currentStatus: pkg.status,
          allowedStatuses
        },
        { status: 403 }
      )
    }

    // ADIM 5: Ücretli mi Ücretsiz mi İptal? (Tek kural)
    // Kurye atandıysa (courier_id veya assigned_at) ücretli iptal.
    const isChargeableCancellation = Boolean(pkg.courier_id || pkg.assigned_at)

    console.log('🔍 İptal Analizi (API Route):', {
      packageId: pkg.id,
      currentStatus: pkg.status,
      isChargeableCancellation,
      reason: isChargeableCancellation
        ? '💰 Ücretli İptal (Kurye atanmış)'
        : '🆓 Ücretsiz İptal (Kurye atanmamış)'
    })

    // ADIM 6: Paketi iptal et
    const { error: updateError } = await supabase
      .from('packages')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'restaurant',
        cancellation_reason: cancellationReason,
        is_chargeable_cancellation: isChargeableCancellation
      })
      .eq('id', pkg.id) // pkg.id kullan, packageId değil (güvenlik)

    if (updateError) {
      console.error('❌ Paket güncelleme hatası:', updateError)
      return NextResponse.json(
        { 
          error: 'Güncelleme hatası',
          message: 'Sipariş iptal edilemedi. Veritabanı hatası.',
          debug: {
            errorMessage: updateError.message,
            errorCode: updateError.code
          }
        },
        { status: 500 }
      )
    }

    console.log('✅ Paket başarıyla iptal edildi:', { 
      packageId: pkg.id, 
      orderNumber: pkg.order_number,
      isChargeableCancellation 
    })

    // ADIM 6: Kuryeye bildirim gönder (eğer atanmışsa)
    if (pkg.courier_id && courierData?.fcm_token) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: courierData.fcm_token,
            title: '⚠️ Sipariş İptal Edildi',
            body: `${restaurantData?.name || 'Restoran'} #${pkg.order_number} numaralı siparişi iptal etti. O adrese gitmeyin!`,
            data: {
              type: 'order_cancelled',
              packageId: pkg.id.toString(),
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

    // ADIM 7: Admin log'u oluştur
    try {
      await supabase.from('order_logs').insert({
        package_id: pkg.id,
        action: 'cancelled_by_restaurant',
        details: {
          restaurant_id: restaurantIdStr,
          restaurant_name: restaurantData?.name,
          reason: cancellationReason,
          previous_status: pkg.status,
          courier_id: pkg.courier_id,
          courier_name: courierData?.full_name
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
      notifiedCourier: !!pkg.courier_id,
      packageId: pkg.id,
      orderNumber: pkg.order_number
    })

  } catch (error) {
    console.error('❌ Restoran iptal API hatası:', error)
    
    // Environment variable hatası
    if (error instanceof Error && error.message.includes('yapılandırması eksik')) {
      return NextResponse.json(
        { 
          error: 'Sistem Yapılandırma Hatası',
          message: 'Sunucu yapılandırması eksik. Lütfen sistem yöneticisine bildirin.',
          technicalDetails: error.message,
          debug: {
            errorType: 'EnvironmentVariableError',
            errorMessage: error.message,
            hint: 'Vercel Dashboard → Settings → Environment Variables kontrol edin'
          }
        },
        { status: 500 }
      )
    }

    // Genel hata
    return NextResponse.json(
      { 
        error: 'Sunucu hatası',
        message: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
        technicalDetails: error instanceof Error ? error.message : 'Bilinmeyen hata',
        debug: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
        }
      },
      { status: 500 }
    )
  }
}
