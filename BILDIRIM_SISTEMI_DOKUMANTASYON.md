# 🔔 Panel-Bazlı Bildirim Sistemi Dokümantasyonu

## 📋 Genel Bakış

Mergen Kurye uygulaması için 3 farklı panel için özelleştirilmiş bildirim sistemi.

### Özellikler
- ✅ Supabase Realtime entegrasyonu
- ✅ Browser Notification API desteği
- ✅ Audio yönetimi (loop ve tek seferlik)
- ✅ Memory leak önleme
- ✅ Autoplay policy bypass
- ✅ Panel-bazlı özelleştirme

---

## 🏗️ Mimari

### 1. NotificationContext (src/contexts/NotificationContext.tsx)
Merkezi bildirim yönetimi context'i.

**Özellikler:**
- Audio instance yönetimi (looping ve short)
- Native notification izin yönetimi
- Memory leak önleme (cleanup)
- Autoplay policy bypass

**API:**
```typescript
const {
  playLoopingAudio,      // Looping audio başlat
  stopLoopingAudio,      // Looping audio durdur
  playShortAudio,        // 4 saniye audio çal
  isAudioReady,          // Audio hazır mı?
  requestNotificationPermission,  // İzin iste
  showNativeNotification,         // Native bildirim göster
  notificationPermission           // Mevcut izin durumu
} = useNotification()
```

### 2. Panel-Bazlı Hooks

#### useRestaurantNotifications (Restoran)
```typescript
const { newOrder, dismissNotification } = useRestaurantNotifications(restaurantId)
```
- Dinleme: `packages` tablosu, `restaurant_id` filtresi
- Trigger: `status === 'new_order'`
- Event: INSERT veya UPDATE

#### useAdminNotifications (Admin)
```typescript
const { newOrder, dismissNotification } = useAdminNotifications()
```
- Dinleme: `packages` tablosu, filtre YOK (tüm restoranlar)
- Trigger: `status === 'new_order'`
- Event: INSERT veya UPDATE

#### useCourierNotifications (Kurye)
```typescript
useCourierNotifications(courierId)
```
- Dinleme: `packages` tablosu, `courier_id` filtresi
- Trigger: `status === 'assigned'` VE yeni atama
- Event: UPDATE
- Popup YOK, sadece native notification + audio

### 3. UI Components

#### RestaurantOrderPopup
- Sticky bottom-right popup
- Kapatılamaz (sadece "Hazırlanıyor" butonu ile)
- Looping audio
- Veritabanı güncellemesi: `status = 'getting_ready'`

#### AdminOrderPopup
- Sticky bottom-right popup
- Kapatılamaz (sadece "Görüldü" butonu ile)
- Looping audio
- Veritabanı güncellemesi YOK (sadece UI acknowledgment)

#### Kurye (Popup YOK)
- Native notification
- Kısa audio (4 saniye)
- Veritabanı güncellemesi YOK

---

## 🚀 Kullanım

### 1. Root Layout (Zaten Eklendi)
```tsx
// src/app/layout.tsx
import { NotificationProvider } from "@/contexts/NotificationContext"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  )
}
```

### 2. Restoran Paneli Entegrasyonu
```tsx
// src/app/restoran/page.tsx veya page_NEW.tsx
import { RestaurantNotificationWrapper } from '@/components/notifications/RestaurantNotificationWrapper'

export default function RestoranPage() {
  const restaurantId = 123 // Giriş yapan restoranın ID'si
  const restaurantName = "Restoran Adı"

  return (
    <div>
      {/* Mevcut içerik */}
      
      {/* Bildirim wrapper'ı ekle */}
      <RestaurantNotificationWrapper 
        restaurantId={restaurantId}
        restaurantName={restaurantName}
      />
    </div>
  )
}
```

### 3. Admin Paneli Entegrasyonu
```tsx
// src/app/admin/page.tsx
import { AdminNotificationWrapper } from '@/components/notifications/AdminNotificationWrapper'

export default function AdminPage() {
  return (
    <div>
      {/* Mevcut içerik */}
      
      {/* Bildirim wrapper'ı ekle */}
      <AdminNotificationWrapper />
    </div>
  )
}
```

### 4. Kurye Paneli Entegrasyonu
```tsx
// src/app/kurye/page.tsx
import { CourierNotificationWrapper } from '@/components/notifications/CourierNotificationWrapper'

export default function KuryePage() {
  const courierId = "uuid-123" // Giriş yapan kuryenin ID'si

  return (
    <div>
      {/* Mevcut içerik */}
      
      {/* Bildirim wrapper'ı ekle */}
      <CourierNotificationWrapper courierId={courierId} />
    </div>
  )
}
```

---

## 🎨 Görsel Tasarım

### Restoran Popup
- Renk: Turuncu-Kırmızı gradient
- Emoji: 🔔
- Animasyon: Yavaş bounce
- Buton: "✅ Hazırlanıyor Olarak İşaretle"

### Admin Popup
- Renk: Mor-İndigo gradient
- Emoji: 🚨
- Animasyon: Yavaş bounce
- Buton: "✓ Görüldü"

### Kurye (Native Notification)
- Başlık: "🚀 Yeni Paketiniz Var!"
- İçerik: Müşteri ve restoran adresleri
- Süre: 10 saniye (otomatik kapanır)

---

## 🔊 Audio Yönetimi

### Audio Dosyası
Konum: `public/notification.mp3`

### Restoran ve Admin
- Loop: Evet
- Süre: Buton tıklanana kadar
- Volume: 0.8

### Kurye
- Loop: Hayır
- Süre: 4 saniye (otomatik durdurulur)
- Volume: 0.8

---

## 🔐 Notification İzinleri

### Kurye Paneli
Login olduğunda otomatik izin ister:
```typescript
useEffect(() => {
  if (courierId) {
    requestNotificationPermission()
  }
}, [courierId])
```

### Diğer Paneller
Native notification kullanmadıkları için izin gerekmez.

---

## 🐛 Debugging

### Console Logları
```typescript
// Realtime bağlantı durumu
📡 Restoran Realtime status: SUBSCRIBED

// Yeni sipariş geldiğinde
📦 Realtime event: { ... }
🔔 YENİ SİPARİŞ TETİKLENDİ: { ... }

// Audio oynatılamadığında
⚠️ Audio oynatılamadı (autoplay policy): ...
```

### Yaygın Sorunlar

#### 1. Audio Çalmıyor
**Sebep:** Browser autoplay policy
**Çözüm:** Kullanıcı bir butona tıkladıktan sonra audio çalışır. İlk tıklamadan sonra sorun çözülür.

#### 2. Realtime Çalışmıyor
**Sebep:** Supabase Realtime aktif değil
**Çözüm:** Supabase Dashboard → Database → Replication → Enable Realtime

#### 3. Native Notification Gösterilmiyor
**Sebep:** İzin verilmemiş
**Çözüm:** Browser ayarlarından notification izni ver

---

## 📊 Akış Diyagramları

### Restoran Paneli
```
Yeni Sipariş (status=new_order)
    ↓
Realtime Event Tetiklenir
    ↓
Popup Gösterilir + Audio Loop Başlar
    ↓
Restoran "Hazırlanıyor" Butonuna Tıklar
    ↓
Audio Durur + Popup Kapanır
    ↓
Veritabanı: status = 'getting_ready'
```

### Admin Paneli
```
Yeni Sipariş (status=new_order)
    ↓
Realtime Event Tetiklenir
    ↓
Popup Gösterilir + Audio Loop Başlar
    ↓
Admin "Görüldü" Butonuna Tıklar
    ↓
Audio Durur + Popup Kapanır
    ↓
Veritabanı Güncellemesi YOK
```

### Kurye Paneli
```
Paket Atandı (status=assigned, courier_id=X)
    ↓
Realtime Event Tetiklenir
    ↓
Kısa Audio Çalar (4 saniye)
    ↓
Native Notification Gösterilir
    ↓
10 Saniye Sonra Otomatik Kapanır
```

---

## 🧪 Test Senaryoları

### Test 1: Restoran Yeni Sipariş
1. Restoran paneline giriş yap
2. Supabase'de yeni sipariş ekle: `status = 'new_order'`, `restaurant_id = X`
3. Popup görünmeli + audio çalmalı
4. "Hazırlanıyor" butonuna tıkla
5. Audio durmalı + popup kapanmalı
6. Veritabanında `status = 'getting_ready'` olmalı

### Test 2: Admin Yeni Sipariş
1. Admin paneline giriş yap
2. Supabase'de yeni sipariş ekle: `status = 'new_order'`
3. Popup görünmeli + audio çalmalı
4. "Görüldü" butonuna tıkla
5. Audio durmalı + popup kapanmalı
6. Veritabanında değişiklik OLMAMALI

### Test 3: Kurye Paket Atama
1. Kurye paneline giriş yap
2. Notification izni ver
3. Supabase'de paket güncelle: `status = 'assigned'`, `courier_id = X`
4. Kısa audio çalmalı (4 saniye)
5. Native notification görünmeli
6. 10 saniye sonra otomatik kapanmalı

---

## 📁 Dosya Yapısı

```
src/
├── contexts/
│   └── NotificationContext.tsx          # Merkezi notification context
├── hooks/
│   ├── useRestaurantNotifications.ts    # Restoran hook
│   ├── useAdminNotifications.ts         # Admin hook
│   └── useCourierNotifications.ts       # Kurye hook
├── components/
│   └── notifications/
│       ├── RestaurantOrderPopup.tsx     # Restoran popup UI
│       ├── AdminOrderPopup.tsx          # Admin popup UI
│       ├── RestaurantNotificationWrapper.tsx  # Restoran wrapper
│       ├── AdminNotificationWrapper.tsx       # Admin wrapper
│       └── CourierNotificationWrapper.tsx     # Kurye wrapper
└── app/
    ├── layout.tsx                       # NotificationProvider eklendi
    ├── restoran/page.tsx                # Restoran entegrasyonu
    ├── admin/page.tsx                   # Admin entegrasyonu
    └── kurye/page.tsx                   # Kurye entegrasyonu
```

---

## ✅ Checklist

### Tamamlanan
- [x] NotificationContext oluşturuldu
- [x] Audio yönetimi (loop + short)
- [x] Native notification desteği
- [x] Restoran hook + popup
- [x] Admin hook + popup
- [x] Kurye hook (native only)
- [x] Root layout'a provider eklendi
- [x] Wrapper component'ler oluşturuldu
- [x] Dokümantasyon yazıldı

### Yapılacak (Entegrasyon)
- [ ] Restoran paneline wrapper ekle
- [ ] Admin paneline wrapper ekle
- [ ] Kurye paneline wrapper ekle
- [ ] Test et
- [ ] Production'a deploy et

---

## 🎯 Sonraki Adımlar

1. **Restoran Paneli:** `src/app/restoran/page_NEW.tsx` dosyasını aç, `RestaurantNotificationWrapper` ekle
2. **Admin Paneli:** `src/app/admin/page.tsx` dosyasını aç, `AdminNotificationWrapper` ekle
3. **Kurye Paneli:** `src/app/kurye/page.tsx` dosyasını aç, `CourierNotificationWrapper` ekle
4. **Test:** Her panelde yeni sipariş/atama simüle et
5. **Deploy:** Production'a gönder

---

## 📞 Destek

Sorun yaşarsan console loglarını kontrol et:
- `📡 Realtime status` - Bağlantı durumu
- `📦 Realtime event` - Gelen event'ler
- `🔔 YENİ SİPARİŞ TETİKLENDİ` - Bildirim tetiklendi
- `⚠️ Audio oynatılamadı` - Autoplay policy sorunu
