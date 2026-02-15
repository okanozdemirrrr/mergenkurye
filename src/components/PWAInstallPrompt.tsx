/**
 * @file src/components/PWAInstallPrompt.tsx
 * @description PWA Kurulum İstemi ve Service Worker Kaydı
 */
'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Service Worker'ı kaydet
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope)
          
          // Güncelleme kontrolü
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New Service Worker available')
                  // Kullanıcıya güncelleme bildirimi göster
                  if (confirm('Yeni bir güncelleme mevcut. Sayfayı yenilemek ister misiniz?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error)
        })
    }

    // iOS kontrolü
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Standalone mode kontrolü (zaten kurulu mu?)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true
    setIsStandalone(isInStandaloneMode)

    // Android/Chrome için install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Kullanıcı daha önce reddetmediyse göster
      const hasDeclined = localStorage.getItem('pwa-install-declined')
      if (!hasDeclined && !isInStandaloneMode) {
        setTimeout(() => setShowInstallPrompt(true), 3000) // 3 saniye sonra göster
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // App kurulduğunda
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully')
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    console.log(`User response: ${outcome}`)
    
    if (outcome === 'dismissed') {
      localStorage.setItem('pwa-install-declined', 'true')
    }
    
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-declined', 'true')
  }

  // Zaten kuruluysa hiçbir şey gösterme
  if (isStandalone) {
    return null
  }

  // iOS için özel talimat
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 rounded-xl shadow-2xl border border-orange-500 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Ana Ekrana Ekle</h3>
            <p className="text-sm text-orange-100 mb-2">
              Daha iyi deneyim için uygulamayı ana ekranınıza ekleyin:
            </p>
            <ol className="text-xs text-orange-100 space-y-1 mb-3">
              <li>1. Aşağıdaki <strong>Paylaş</strong> butonuna dokunun</li>
              <li>2. <strong>"Ana Ekrana Ekle"</strong> seçeneğini bulun</li>
              <li>3. <strong>"Ekle"</strong> butonuna dokunun</li>
            </ol>
            <button
              onClick={handleDismiss}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
            >
              Anladım
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  // Android/Chrome için install butonu
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 rounded-xl shadow-2xl border border-orange-500 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Uygulamayı Yükle</h3>
            <p className="text-sm text-orange-100 mb-3">
              Daha hızlı erişim için Mergen Kurye'yi cihazınıza yükleyin. İnternet olmadan da çalışır!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-orange-600 font-semibold px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors text-sm"
              >
                Yükle
              </button>
              <button
                onClick={handleDismiss}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Daha Sonra
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  return null
}
