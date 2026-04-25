/**
 * @file src/contexts/NotificationContext.tsx
 * @description Panel-bazlı Bildirim Sistemi Context
 * 
 * ÖZELLİKLER:
 * - Audio yönetimi (loop ve tek seferlik)
 * - Browser autoplay policy bypass
 * - Memory leak önleme
 * - Native push notification desteği
 */
'use client'

import React, { createContext, useContext, useRef, useEffect, useState } from 'react'

interface NotificationContextType {
  // Audio kontrolü
  playLoopingAudio: () => void
  stopLoopingAudio: () => void
  playShortAudio: () => void
  
  // Audio hazır mı?
  isAudioReady: boolean
  
  // Native notification
  requestNotificationPermission: () => Promise<NotificationPermission>
  showNativeNotification: (title: string, body: string) => void
  notificationPermission: NotificationPermission
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const loopingAudioRef = useRef<HTMLAudioElement | null>(null)
  const shortAudioRef = useRef<HTMLAudioElement | null>(null)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Audio dosyalarını initialize et
  useEffect(() => {
    // Cache busting için timestamp ekle
    const timestamp = Date.now()
    console.log('🔊 Audio dosyaları yükleniyor...', `/notification.mp3?v=${timestamp}`)
    
    // Looping audio (Restoran ve Admin için)
    loopingAudioRef.current = new Audio(`/notification.mp3?v=${timestamp}`)
    loopingAudioRef.current.loop = true
    loopingAudioRef.current.volume = 0.8
    
    loopingAudioRef.current.addEventListener('loadstart', () => console.log('🔊 Looping audio yüklenmeye başladı'))
    loopingAudioRef.current.addEventListener('canplay', () => console.log('✅ Looping audio hazır'))
    loopingAudioRef.current.addEventListener('error', (e) => console.error('❌ Looping audio hatası:', e))

    // Short audio (Kurye için)
    shortAudioRef.current = new Audio(`/notification.mp3?v=${timestamp}`)
    shortAudioRef.current.loop = false
    shortAudioRef.current.volume = 0.8
    
    shortAudioRef.current.addEventListener('loadstart', () => console.log('🔊 Short audio yüklenmeye başladı'))
    shortAudioRef.current.addEventListener('canplay', () => console.log('✅ Short audio hazır'))
    shortAudioRef.current.addEventListener('error', (e) => console.error('❌ Short audio hatası:', e))

    // Audio'nun yüklendiğini işaretle
    const handleCanPlay = () => setIsAudioReady(true)
    loopingAudioRef.current.addEventListener('canplaythrough', handleCanPlay)

    // Notification permission durumunu kontrol et
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

    // Audio unlock için click listener ekle
    const unlockAudio = () => {
      if (!isAudioUnlocked && loopingAudioRef.current && shortAudioRef.current) {
        console.log('🔓 Audio unlock deneniyor...')
        
        // Sessiz bir ses çal (unlock için)
        const unlockPromise1 = loopingAudioRef.current.play().then(() => {
          loopingAudioRef.current!.pause()
          loopingAudioRef.current!.currentTime = 0
          console.log('✅ Looping audio unlocked')
        }).catch(() => {})

        const unlockPromise2 = shortAudioRef.current.play().then(() => {
          shortAudioRef.current!.pause()
          shortAudioRef.current!.currentTime = 0
          console.log('✅ Short audio unlocked')
        }).catch(() => {})

        Promise.all([unlockPromise1, unlockPromise2]).then(() => {
          setIsAudioUnlocked(true)
          console.log('🎉 Audio tamamen unlocked!')
          // Event listener'ı kaldır
          document.removeEventListener('click', unlockAudio)
          document.removeEventListener('touchstart', unlockAudio)
        })
      }
    }

    // İlk tıklamada audio'yu unlock et
    document.addEventListener('click', unlockAudio)
    document.addEventListener('touchstart', unlockAudio)

    // Cleanup
    return () => {
      if (loopingAudioRef.current) {
        loopingAudioRef.current.pause()
        loopingAudioRef.current.removeEventListener('canplaythrough', handleCanPlay)
        loopingAudioRef.current = null
      }
      if (shortAudioRef.current) {
        shortAudioRef.current.pause()
        shortAudioRef.current = null
      }
      // Event listener'ları temizle
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // Looping audio başlat (Restoran/Admin)
  const playLoopingAudio = () => {
    console.log('🔊 playLoopingAudio çağrıldı, unlocked:', isAudioUnlocked)
    if (loopingAudioRef.current && isAudioUnlocked) {
      console.log('✅ loopingAudioRef mevcut ve unlocked')
      loopingAudioRef.current.currentTime = 0
      loopingAudioRef.current.play()
        .then(() => console.log('✅ Looping audio başarıyla çalıyor'))
        .catch(err => {
          console.error('❌ Looping audio oynatılamadı:', err)
        })
    } else {
      console.warn('⚠️ Audio henüz unlock edilmemiş veya ref null')
    }
  }

  // Looping audio durdur
  const stopLoopingAudio = () => {
    if (loopingAudioRef.current) {
      loopingAudioRef.current.pause()
      loopingAudioRef.current.currentTime = 0
    }
  }

  // Kısa audio çal (Kurye - 3-4 saniye)
  const playShortAudio = () => {
    console.log('🔊 playShortAudio çağrıldı, unlocked:', isAudioUnlocked)
    if (shortAudioRef.current && isAudioUnlocked) {
      console.log('✅ shortAudioRef mevcut ve unlocked')
      shortAudioRef.current.currentTime = 0
      shortAudioRef.current.play()
        .then(() => console.log('✅ Audio başarıyla çalıyor'))
        .catch(err => {
          console.error('❌ Audio oynatılamadı:', err)
        })

      // 4 saniye sonra durdur
      setTimeout(() => {
        if (shortAudioRef.current) {
          shortAudioRef.current.pause()
          shortAudioRef.current.currentTime = 0
        }
      }, 4000)
    } else {
      console.warn('⚠️ Audio henüz unlock edilmemiş veya ref null')
    }
  }

  // Native notification izni iste
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission
    }

    return Notification.permission
  }

  // Native notification göster
  const showNativeNotification = (title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('⚠️ Bu tarayıcı native notification desteklemiyor')
      return
    }

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'mergen-kurye',
          requireInteraction: false,
          silent: false
        })

        // 10 saniye sonra otomatik kapat
        setTimeout(() => notification.close(), 10000)
      } catch (error) {
        console.error('❌ Native notification gösterilemedi:', error)
      }
    } else {
      console.warn('⚠️ Notification izni verilmemiş')
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        playLoopingAudio,
        stopLoopingAudio,
        playShortAudio,
        isAudioReady,
        requestNotificationPermission,
        showNativeNotification,
        notificationPermission
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// Hook
export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
