// Service Worker - Bildirim Sistemi
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker yüklendi')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker aktif')
  event.waitUntil(clients.claim())
})

// Bildirim tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Bildirime tıklandı:', event.notification.tag)
  
  event.notification.close()
  
  // İlgili paneli ön plana getir
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir sekme varsa onu ön plana getir
      for (const client of clientList) {
        if (client.url.includes(event.notification.data?.url || '/') && 'focus' in client) {
          return client.focus()
        }
      }
      // Yoksa yeni sekme aç
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/')
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
