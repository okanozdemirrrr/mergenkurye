/**
 * @file src/utils/courierPushNotificationService.ts
 * @description Kurye FCM Token Kayıt Servisi
 * 
 * AMAÇ:
 * - Kurye cihazından FCM token al
 * - Token'ı Supabase'e kaydet
 * - Uygulama kapalıyken bile bildirim alabilsin
 */

import { Capacitor } from '@capacitor/core'
import { PushNotifications, Token } from '@capacitor/push-notifications'
import { supabase } from '@/app/lib/supabase'

class CourierPushNotificationService {
  private isInitialized = false
  private courierId: string | null = null

  async initialize(courierId: string) {
    if (this.isInitialized) {
      console.log('⚠️ Kurye push notification zaten başlatılmış')
      return
    }

    this.courierId = courierId
    console.log('🚀 Kurye push notification başlatılıyor, courier_id:', courierId)

    // Sadece native platformda çalış
    if (!Capacitor.isNativePlatform()) {
      console.log('ℹ️ Web platformu, native push notifications atlanıyor')
      return
    }

    try {
      // 1. İzin durumunu kontrol et
      const permStatus = await PushNotifications.checkPermissions()
      console.log('📋 Mevcut izin durumu:', permStatus.receive)

      // 2. İzin iste (eğer henüz verilmemişse)
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        console.log('🙏 Bildirim izni isteniyor...')
        const requestResult = await PushNotifications.requestPermissions()
        console.log('✅ İzin sonucu:', requestResult.receive)

        if (requestResult.receive === 'denied') {
          console.warn('❌ Bildirim izni reddedildi')
          return
        }
      }

      // 3. Android 8.0+ için Bildirim Kanalı oluştur (ŞART — kanal yoksa bildirim düşmez!)
      // Bu işlem idempotent'tir: kanal zaten varsa üzerine yazar, hata vermez.
      if (Capacitor.getPlatform() === 'android') {
        try {
          await PushNotifications.createChannel({
            id: 'mergen_high_priority',
            name: 'Acil Siparişler',
            description: 'Yeni sipariş bildirimleri — ses ve titreşim ile',
            importance: 5,     // IMPORTANCE_HIGH (heads-up + ses + titreşim)
            visibility: 1,     // VISIBILITY_PUBLIC (kilit ekranında tam içerik)
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#FF6B00' // Turuncu ışık (Alda Gel brand rengi)
          })
          console.log('✅ mergen_high_priority kanalı oluşturuldu/güncellendi')
        } catch (channelError) {
          console.warn('⚠️ Kanal oluşturma hatası (önemsiz):', channelError)
        }
      }

      // 4. Cihazı FCM'e kaydet
      console.log('📱 Cihaz FCM\'e kaydediliyor...')
      await PushNotifications.register()

      // 5. Registration event listener - FCM Token alındığında
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('🎉 FCM Token alındı:', token.value)
        await this.saveFcmTokenToDatabase(token.value)
      })

      // 6. Registration hatası listener
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ FCM kayıt hatası:', error)
      })

      // 7. Foreground bildirim listener — uygulama açıkken gelen push'lar
      await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('🔔 Foreground push notification alındı:', notification)
        // Realtime hook zaten ses çalıyor, burada sadece log
      })

      // 8. Background bildirim tıklama listener
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('👆 Bildirime tıklandı:', notification)
        // Burada yönlendirme yapılabilir
      })

      this.isInitialized = true
      console.log('✅ Kurye push notification başarıyla başlatıldı')
    } catch (error) {
      console.error('❌ Kurye push notification başlatma hatası:', error)
    }
  }

  private async saveFcmTokenToDatabase(token: string) {
    if (!this.courierId) {
      console.warn('⚠️ Courier ID yok, token kaydedilemedi')
      return
    }

    try {
      console.log('💾 FCM Token veritabanına kaydediliyor...')

      const { error } = await supabase
        .from('couriers')
        .update({ fcm_token: token })
        .eq('id', this.courierId)

      if (error) throw error

      console.log('✅ FCM Token başarıyla kaydedildi:', {
        courierId: this.courierId,
        token: token.substring(0, 20) + '...'
      })
    } catch (error: any) {
      console.error('❌ FCM Token kaydetme hatası:', error.message)
    }
  }

  cleanup() {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.removeAllListeners()
    }
    this.isInitialized = false
    this.courierId = null
    console.log('🧹 Kurye push notification temizlendi')
  }
}

export const notificationService = new CourierPushNotificationService()
