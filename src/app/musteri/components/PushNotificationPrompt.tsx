'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    // Tarayıcı bildirimleri destekliyor mu kontrol et
    if (!('Notification' in window)) {
      console.log('Bu tarayıcı bildirimleri desteklemiyor')
      return
    }

    const currentPermission = Notification.permission
    setPermission(currentPermission)

    // Eğer daha önce izin istenmemişse ve kullanıcı giriş yapmışsa göster
    const hasAsked = localStorage.getItem('notification_permission_asked')
    const customerId = localStorage.getItem('customer_id')

    if (currentPermission === 'default' && !hasAsked && customerId) {
      // 2 saniye bekle, sonra göster
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [])

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      localStorage.setItem('notification_permission_asked', 'true')
      
      if (result === 'granted') {
        console.log('✅ Bildirim izni verildi')
        
        // Test bildirimi gönder
        new Notification('🎉 Bildirimler Aktif!', {
          body: 'Artık kampanyalardan ve sipariş güncellemelerinden haberdar olacaksınız.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        })
      } else {
        console.log('❌ Bildirim izni reddedildi')
      }
      
      setShowPrompt(false)
    } catch (error) {
      console.error('Bildirim izni hatası:', error)
      setShowPrompt(false)
    }
  }

  const dismissPrompt = () => {
    localStorage.setItem('notification_permission_asked', 'true')
    setShowPrompt(false)
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={dismissPrompt}
          />

          {/* Prompt Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={dismissPrompt}
              className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <X size={20} className="text-[#6f6f6f]" />
            </button>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Bell size={32} className="text-white" />
              </div>

              {/* Title */}
              <h3 className="text-[20px] font-bold text-[#3c4043] mb-2">
                Bildirimleri Aç
              </h3>

              {/* Description */}
              <p className="text-[14px] text-[#6f6f6f] leading-relaxed mb-6">
                Kampanyalardan, sipariş güncellemelerinden ve restoran yanıtlarından anında haberdar olmak ister misiniz?
              </p>

              {/* Benefits */}
              <div className="bg-orange-50 rounded-xl p-4 mb-6 text-left">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[16px] mt-0.5">🎉</span>
                    <p className="text-[12px] text-[#3c4043]">
                      <span className="font-semibold">Özel kampanyalar</span> ve indirimlerden ilk siz haberdar olun
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[16px] mt-0.5">📦</span>
                    <p className="text-[12px] text-[#3c4043]">
                      <span className="font-semibold">Sipariş durumu</span> değişikliklerini anlık takip edin
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[16px] mt-0.5">💬</span>
                    <p className="text-[12px] text-[#3c4043]">
                      <span className="font-semibold">Restoran yanıtlarını</span> kaçırmayın
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  onClick={requestPermission}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-[14px] hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Bildirimleri Aç
                </button>
                <button
                  onClick={dismissPrompt}
                  className="w-full py-3 bg-gray-100 text-[#6f6f6f] rounded-xl font-semibold text-[14px] hover:bg-gray-200 transition-colors"
                >
                  Şimdi Değil
                </button>
              </div>

              {/* Note */}
              <p className="text-[11px] text-[#9f9f9f] mt-4">
                İstediğiniz zaman tarayıcı ayarlarından değiştirebilirsiniz
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
