/**
 * @file src/app/api/send-push/route.ts
 * @description Push Notification Gönderme API Route
 * 
 * SENARYO:
 * - Admin kuryeye paket atadığında bu endpoint çağrılır
 * - FCM token ile kurye cihazına bildirim gönderilir
 * - Format: Trendyol tarzı (Restoran Adı - Teslimat Adresi)
 * 
 * KULLANIM:
 * POST /api/send-push
 * Body: { courierId, restaurantName, deliveryAddress, customerName }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { firebaseAdmin } from '@/lib/firebaseAdmin'
import { buildFcmMessage, looksLikeApnsDeviceToken } from '@/lib/fcmPushPayload'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { courierId, restaurantName, deliveryAddress, customerName } = body

    // Validasyon
    if (!courierId) {
      return NextResponse.json(
        { error: 'courierId gerekli' },
        { status: 400 }
      )
    }

    console.log('📤 Push notification gönderiliyor:', {
      courierId,
      restaurantName,
      deliveryAddress
    })

    // 1. Courier'in FCM token'ını al
    const { data: courier, error: courierError } = await supabase
      .from('couriers')
      .select('fcm_token, full_name')
      .eq('id', courierId)
      .single()

    if (courierError) {
      console.error('❌ Courier bulunamadı:', courierError)
      return NextResponse.json(
        { error: 'Courier bulunamadı' },
        { status: 404 }
      )
    }

    if (!courier?.fcm_token) {
      console.warn('⚠️ Courier FCM token yok:', courierId)
      return NextResponse.json(
        { error: 'Courier FCM token bulunamadı. Kurye uygulamaya giriş yapmamış olabilir.' },
        { status: 404 }
      )
    }

    if (looksLikeApnsDeviceToken(courier.fcm_token)) {
      console.error(
        '❌ iOS APNs device token kaydedilmiş; FCM token değil. AppDelegate Firebase Messaging düzeltmesi gerekli.',
        { courierId, tokenPreview: courier.fcm_token.substring(0, 12) }
      )
      return NextResponse.json(
        {
          error:
            'iOS cihaz APNs token kaydetmiş (FCM değil). App Store build Firebase Messaging + AppDelegate patch ile yeniden yayınlanmalı.',
        },
        { status: 422 }
      )
    }

    // 2. Trendyol tarzı bildirim formatı
    const title = 'YENİ SİPARİŞ 🚀'
    const messageBody = `${restaurantName || 'Restoran'} - ${deliveryAddress || customerName || 'Müşteri'}`

    // 3. FCM ile bildirim gönder — Android + iOS (APNs)
    const message = buildFcmMessage({
      token: courier.fcm_token,
      title,
      body: messageBody,
      data: {
        type: 'new_assignment',
        courierId: courierId || '',
        restaurantName: restaurantName || '',
        deliveryAddress: deliveryAddress || '',
        customerName: customerName || '',
      },
      androidTag: `order_${courierId}`,
    })

    console.log('🔥 DEBUG: Firebase admin instance:', !!firebaseAdmin.apps.length)
    console.log('🔥 DEBUG: Firebase messaging available:', !!firebaseAdmin.messaging)
    console.log('🔥 DEBUG: Message payload:', JSON.stringify(message, null, 2))

    if (!firebaseAdmin.apps.length) {
      throw new Error('Firebase Admin SDK başlatılmamış')
    }

    const response = await firebaseAdmin.messaging().send(message)

    console.log('✅ Push notification gönderildi:', {
      courierId,
      courierName: courier.full_name,
      messageId: response,
      title,
      body: messageBody
    })

    return NextResponse.json({
      success: true,
      messageId: response,
      courierName: courier.full_name,
      title,
      body: messageBody
    })

  } catch (error: any) {
    console.error('❌ Push notification hatası:', error)

    // FCM hata kodlarını kontrol et
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Geçersiz FCM token, veritabanından temizleniyor')
      
      try {
        const retryBody = await request.clone().json()
        if (retryBody?.courierId) {
          await supabase
            .from('couriers')
            .update({ fcm_token: null })
            .eq('id', retryBody.courierId)
        }
      } catch {
        // body tekrar okunamazsa sessiz geç
      }
    }

    return NextResponse.json(
      {
        error: 'Push notification gönderilemedi',
        details: error.message
      },
      { status: 500 }
    )
  }
}
