/**
 * @file src/utils/courierPushNotificationService.ts
 * @description Kurye FCM Token Kayıt Servisi
 *
 * AMAÇ:
 * - Native cihazda Push kaydı + FCM token al
 * - Token'ı Supabase couriers.fcm_token'a yaz
 * - Background / killed push için FCM token şart (iOS APNs token yetmez)
 */

import { Capacitor } from '@capacitor/core'
import { FCM } from '@capacitor-community/fcm'
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

    if (!Capacitor.isNativePlatform()) {
      console.log('ℹ️ Web platformu, native push notifications atlanıyor')
      return
    }

    try {
      const platform = Capacitor.getPlatform()

      // 1. İzin
      let permStatus = await PushNotifications.checkPermissions()
      console.log('📋 Mevcut izin durumu:', permStatus.receive)

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        console.log('🙏 Bildirim izni isteniyor...')
        permStatus = await PushNotifications.requestPermissions()
        console.log('✅ İzin sonucu:', permStatus.receive)
      }

      if (permStatus.receive === 'denied') {
        console.warn('❌ Bildirim izni reddedildi')
        return
      }

      // 2. Android bildirim kanalı
      if (platform === 'android') {
        try {
          await PushNotifications.createChannel({
            id: 'mergen_high_priority',
            name: 'Acil Siparişler',
            description: 'Yeni sipariş bildirimleri — ses ve titreşim ile',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#FF6B00',
          })
          console.log('✅ mergen_high_priority kanalı oluşturuldu/güncellendi')
        } catch (channelError) {
          console.warn('⚠️ Kanal oluşturma hatası (önemsiz):', channelError)
        }
      }

      // 3. Listeners — register()'dan ÖNCE bağla (race condition önlemi)
      await PushNotifications.addListener('registration', async (_apnsOrFcm: Token) => {
        try {
          // iOS'ta Capacitor APNs token verir; FCM.getToken() gerçek FCM token'ı alır.
          // Android'de de FCM.getToken() güvenli ve tutarlı yol.
          const { token: fcmToken } = await FCM.getToken()
          if (!fcmToken) {
            console.error('❌ FCM.getToken() boş döndü')
            return
          }
          console.log(`🎉 FCM Token alındı (${platform}):`, fcmToken.substring(0, 24) + '...')
          await this.saveFcmTokenToDatabase(fcmToken)
        } catch (e) {
          console.error('❌ FCM token alınamadı', e)
        }
      })

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Push registration hatası', error)
      })

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('🔔 Foreground push notification alındı:', notification)
      })

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('👆 Bildirime tıklandı:', notification)
      })

      // 4. Cihazı APNs/FCM'e kaydet
      console.log(`📱 PushNotifications.register() (${platform})...`)
      await PushNotifications.register()

      this.isInitialized = true
      console.log('✅ Kurye push notification başarıyla başlatıldı')
    } catch (error) {
      console.error('❌ Kurye push notification başlatma hatası:', error)
    }
  }

  /** Mevcut backend: Supabase couriers.fcm_token (ayrı HTTP endpoint yok) */
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
        token: token.substring(0, 20) + '...',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('❌ FCM Token kaydetme hatası:', message)
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
