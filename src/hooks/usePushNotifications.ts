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
    console.log('🔍 usePushNotifications useEffect çalıştı')
    console.log('  - isLoggedIn:', isLoggedIn)
    console.log('  - courierId:', courierId)
    
    // Sadece giriş yapılmışsa ve courierId varsa çalış
    if (!isLoggedIn || !courierId) {
      console.log('ℹ️ Push Notifications: Kurye giriş yapmamış, atlanıyor')
      return
    }

    // Platform kontrolü - sadece mobil cihazlarda çalışır
    if (typeof window === 'undefined') {
      console.log('⚠️ Push Notifications: window undefined')
      return
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isMobile = /android|iphone|ipad|ipod/i.test(userAgent)
    
    console.log('📱 Platform kontrolü:')
    console.log('  - userAgent:', userAgent)
    console.log('  - isMobile:', isMobile)

    if (!isMobile) {
      console.log('ℹ️ Push Notifications: Web platformu, native bildirimler desteklenmiyor')
      setIsSupported(false)
      return
    }

    console.log('✅ Push Notifications başlatılacak!')
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

      // 6. Ön planda bildirim geldiğinde - EKRANA GÖSTER VE SES ÇAL
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('🔔 ÖN PLANDA BİLDİRİM ALINDI:', notification)
          console.log('  - Title:', notification.title)
          console.log('  - Body:', notification.body)
          console.log('  - Data:', notification.data)
          
          // 1. SES ÇAL
          try {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.8
            audio.play().catch(err => console.error('Ses çalma hatası:', err))
          } catch (error) {
            console.error('Audio oluşturma hatası:', error)
          }

          // 2. EKRANA TOAST/ALERT GÖSTER
          const title = notification.title || 'Yeni Bildirim'
          const body = notification.body || 'Yeni bir bildiriminiz var'
          
          // Native alert (basit ama garantili)
          if (confirm(`${title}\n\n${body}\n\nDetayları görmek ister misiniz?`)) {
            // Kullanıcı "OK" derse sayfayı yenile veya yönlendir
            window.location.reload()
          }
          
          // VEYA custom toast göster (daha şık)
          showCustomToast(title, body)
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

  // Custom toast gösterme fonksiyonu
  const showCustomToast = (title: string, body: string) => {
    // Toast container oluştur
    const toastContainer = document.createElement('div')
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 999999;
      max-width: 90%;
      animation: slideDown 0.3s ease-out;
      font-family: system-ui, -apple-system, sans-serif;
    `

    toastContainer.innerHTML = `
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
        🔔 ${title}
      </div>
      <div style="font-size: 14px; opacity: 0.95;">
        ${body}
      </div>
    `

    // Animasyon ekle
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)

    document.body.appendChild(toastContainer)

    // 5 saniye sonra kaldır
    setTimeout(() => {
      toastContainer.style.animation = 'slideDown 0.3s ease-out reverse'
      setTimeout(() => {
        document.body.removeChild(toastContainer)
        document.head.removeChild(style)
      }, 300)
    }, 5000)
  }

  return {
    isSupported,
    permissionStatus,
    fcmToken
  }
}
