/**
 * @file src/hooks/usePushNotifications.ts
 * @description Native Push Notifications Hook (FCM)
 * 
 * Bu hook kurye cihazından bildirim izni alır, FCM token'ı alır ve
 * Supabase'deki couriers tablosuna kaydeder.
 * 
 * KULLANIM:
 * const { isSupported, permissionStatus } = usePushNotifications(courierId)
 */

import { useEffect, useState } from 'react'
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications'
import { supabase } from '@/app/lib/supabase'

interface UsePushNotificationsProps {
  courierId: string | null
  isLoggedIn: boolean
}

export function usePushNotifications({ courierId, isLoggedIn }: UsePushNotificationsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [fcmToken, setFcmToken] = useState<string | null>(null)

  useEffect(() => {
    // Sadece giriş yapılmışsa ve courierId varsa çalış
    if (!isLoggedIn || !courierId) {
      console.log('ℹ️ Push Notifications: Kurye giriş yapmamış, atlanıyor')
      return
    }

    // Platform kontrolü - sadece mobil cihazlarda çalışır
    if (typeof window === 'undefined') return

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isMobile = /android|iphone|ipad|ipod/i.test(userAgent)

    if (!isMobile) {
      console.log('ℹ️ Push Notifications: Web platformu, native bildirimler desteklenmiyor')
      setIsSupported(false)
      return
    }

    setIsSupported(true)
    initializePushNotifications()

    // Cleanup
    return () => {
      // Listener'ları temizle
      PushNotifications.removeAllListeners()
    }
  }, [courierId, isLoggedIn])

  const initializePushNotifications = async () => {
    try {
      console.log('🔔 Push Notifications başlatılıyor...')

      // 1. İzin durumunu kontrol et
      const permStatus = await PushNotifications.checkPermissions()
      console.log('📋 Mevcut izin durumu:', permStatus.receive)
      setPermissionStatus(permStatus.receive)

      // 2. İzin iste (eğer henüz verilmemişse)
      if (permStatus.receive === 'prompt') {
        console.log('🙏 Bildirim izni isteniyor...')
        const requestResult = await PushNotifications.requestPermissions()
        console.log('✅ İzin sonucu:', requestResult.receive)
        setPermissionStatus(requestResult.receive)

        if (requestResult.receive === 'denied') {
          console.warn('❌ Bildirim izni reddedildi')
          return
        }
      }

      // 3. Cihazı FCM'e kaydet
      console.log('📱 Cihaz FCM\'e kaydediliyor...')
      await PushNotifications.register()

      // 4. Registration event listener - FCM Token alındığında
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('🎉 FCM Token alındı:', token.value)
        setFcmToken(token.value)

        // Token'ı Supabase'e kaydet
        await saveFcmTokenToDatabase(token.value)
      })

      // 5. Registration hatası listener
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ FCM kayıt hatası:', error)
      })

      // 6. Ön planda bildirim geldiğinde (opsiyonel)
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('🔔 Ön planda bildirim alındı:', notification)
          
          // Burada custom UI gösterebilirsiniz (toast, modal vs.)
          // Örnek: showNotificationToast(notification.title, notification.body)
        }
      )

      // 7. Bildirime tıklandığında (arka plan/kapalı uygulama)
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: any) => {
          console.log('👆 Bildirime tıklandı:', notification)
          
          // Burada yönlendirme yapabilirsiniz
          // Örnek: router.push('/kurye/packages')
        }
      )

      console.log('✅ Push Notifications başarıyla başlatıldı')
    } catch (error) {
      console.error('❌ Push Notifications başlatma hatası:', error)
    }
  }

  const saveFcmTokenToDatabase = async (token: string) => {
    if (!courierId) {
      console.warn('⚠️ Courier ID yok, token kaydedilemedi')
      return
    }

    try {
      console.log('💾 FCM Token veritabanına kaydediliyor...')

      const { error } = await supabase
        .from('couriers')
        .update({ fcm_token: token })
        .eq('id', courierId)

      if (error) throw error

      console.log('✅ FCM Token başarıyla kaydedildi:', {
        courierId,
        token: token.substring(0, 20) + '...' // Güvenlik için sadece başını göster
      })
    } catch (error: any) {
      console.error('❌ FCM Token kaydetme hatası:', error.message)
    }
  }

  return {
    isSupported,
    permissionStatus,
    fcmToken
  }
}
