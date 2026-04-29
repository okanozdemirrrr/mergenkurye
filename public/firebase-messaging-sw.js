/**
 * @file public/firebase-messaging-sw.js
 * @description Firebase Cloud Messaging Service Worker
 * 
 * Bu dosya arka planda (background) gelen push notification'ları yakalar.
 * Web/PWA platformunda çalışır.
 */

// Firebase SDK'yı import et (CDN)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase config - Service Worker'da environment variable kullanılamaz, hardcode gerekli
const firebaseConfig = {
  apiKey: "AIzaSyBmOsnmV_WbYY-OziaOzbsuKxxuSSwSIuc",
  authDomain: "alda-gel-kurye-d0537.firebaseapp.com",
  projectId: "alda-gel-kurye-d0537",
  storageBucket: "alda-gel-kurye-d0537.firebasestorage.app",
  messagingSenderId: "1009357218748",
  appId: "1:1009357218748:android:b010d01ec02fcc26fb01b9"
}

// Firebase'i başlat
firebase.initializeApp(firebaseConfig)

// Messaging instance
const messaging = firebase.messaging()

// Arka planda (background) bildirim geldiğinde
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background notification alındı:', payload)

  const notificationTitle = payload.notification?.title || 'Yeni Bildirim'
  const notificationOptions = {
    body: payload.notification?.body || 'Yeni bir bildiriminiz var',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'mergen-kurye',
    requireInteraction: false,
    data: payload.data
  }

  // Notification göster
  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification tıklandı:', event)
  
  event.notification.close()

  // Uygulamayı aç veya focus et
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir pencere varsa focus et
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Açık pencere yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
