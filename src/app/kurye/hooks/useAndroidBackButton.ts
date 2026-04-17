/**
 * @file src/app/kurye/hooks/useAndroidBackButton.ts
 * @description Android Back Button Handler Hook'u
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useEffect } from 'react'
import { App } from '@capacitor/app'

export function useAndroidBackButton(isMounted: boolean) {
  // Android Back Button Handler - ORİJİNAL MANTIK
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return

    let backButtonListener: any

    const setupBackButton = async () => {
      try {
        // Android back button'a basıldığında
        backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            // Eğer geri gidilecek sayfa yoksa uygulamayı minimize et
            App.minimizeApp()
          } else {
            // Geri gidilecek sayfa varsa tarayıcı history'sini kullan
            window.history.back()
          }
        })
      } catch (error) {
        console.log('Back button listener eklenemedi (web ortamı olabilir):', error)
      }
    }

    setupBackButton()

    return () => {
      // Cleanup
      if (backButtonListener) {
        backButtonListener.remove()
      }
    }
  }, [isMounted])
}
