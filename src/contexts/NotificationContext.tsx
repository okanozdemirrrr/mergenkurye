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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Audio dosyalarını initialize et
  useEffect(() => {
    // Looping audio (Restoran ve Admin için)
    loopingAudioRef.current = new Audio('/notification.mp3')
    loopingAudioRef.current.loop = true
    loopingAudioRef.current.volume = 0.8

    // Short audio (Kurye için)
    shortAudioRef.current = new Audio('/notification.mp3')
    shortAudioRef.current.loop = false
    shortAudioRef.current.volume = 0.8

    // Audio'nun yüklendiğini işaretle
    const handleCanPlay = () => setIsAudioReady(true)
    loopingAudioRef.current.addEventListener('canplaythrough', handleCanPlay)

    // Notification permission durumunu kontrol et
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }

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
    }
  }, [])

  // Looping audio başlat (Restoran/Admin)
  const playLoopingAudio = () => {
    if (loopingAudioRef.current) {
      loopingAudioRef.current.currentTime = 0
      loopingAudioRef.current.play().catch(err => {
        console.warn('⚠️ Audio oynatılamadı (autoplay policy):', err)
      })
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
    if (shortAudioRef.current) {
      shortAudioRef.current.currentTime = 0
      shortAudioRef.current.play().catch(err => {
        console.warn('⚠️ Audio oynatılamadı (autoplay policy):', err)
      })

      // 4 saniye sonra durdur
      setTimeout(() => {
        if (shortAudioRef.current) {
          shortAudioRef.current.pause()
          shortAudioRef.current.currentTime = 0
        }
      }, 4000)
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
