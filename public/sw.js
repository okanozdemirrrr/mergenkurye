// Service Worker - Bildirim Sistemi v2
const CACHE_NAME = 'mergen-v1'

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker yüklendi')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker aktif')
  event.waitUntil(
    clients.claim().then(() => {
      console.log('✅ Service Worker tüm istemcileri kontrol ediyor')
    })
  )
})

// Bildirim tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Bildirime tıklandı:', event.notification.tag)
  
  event.notification.close()
  
  // İlgili paneli ön plana getir
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url || '/'
      
      // Zaten açık bir sekme varsa onu ön plana getir
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Yoksa yeni sekme aç
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Push bildirimi geldiğinde
self.addEventListener('push', (event) => {
  console.log('📨 Push bildirimi alındı')
  
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Bildirim'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'default',
    data: data,
    requireInteraction: true,
    vibrate: [200, 100, 200]
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Mesaj dinle (ses çalma komutu için)
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker mesaj aldı:', event.data)
  
  if (event.data && event.data.type === 'PLAY_SOUND') {
    // Client'a ses çalma komutu gönder
    event.ports[0].postMessage({ success: true })
  }
})
