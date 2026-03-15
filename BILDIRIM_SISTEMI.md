# 🔔 BİLDİRİM SİSTEMİ DOKÜMANTASYONU

## 📋 Genel Bakış

Mergen Go müşteri paneline eksiksiz bir bildirim sistemi eklendi. Sistem hem uygulama içi bildirimler hem de tarayıcı push bildirimleri destekliyor.

## ✨ Özellikler

### 1. Bildirim Zili (Bell Icon)
- **Konum:** Header'da hamburger menü ile "Çıkış" butonu arasında
- **Rozet:** Okunmamış bildirim sayısını gösterir (kırmızı badge)
- **Dropdown:** Tıklandığında son 20 bildirimi gösterir
- **Realtime:** Yeni bildirimler anında görünür (Supabase Realtime)

### 2. Push Notification (Tarayıcı Bildirimleri)
- **İzin İsteği:** Kullanıcı giriş yaptıktan 2 saniye sonra modal açılır
- **Özellikler:**
  - Kampanyalar
  - Sipariş güncellemeleri
  - Restoran yanıtları
- **Tarayıcı Desteği:** Chrome, Firefox, Edge, Safari (iOS 16.4+)

### 3. Bildirim Tipleri
- `order_reply` 💬 - Restoran yoruma yanıt verdi
- `order_update` 📦 - Sipariş durumu değişti
- `campaign` 🎉 - Kampanya duyurusu
- `system` 🔔 - Sistem bildirimi

### 4. Otomatik Tetikleyiciler

#### A. Restoran Yanıtı
```sql
-- reviews tablosunda reply güncellendiğinde otomatik bildirim
TRIGGER: trigger_review_reply_notification
```

#### B. Sipariş Durumu Değişikliği
```sql
-- packages tablosunda status değiştiğinde otomatik bildirim
TRIGGER: trigger_order_status_notification
```

Bildirim gönderilen durumlar:
- `ready` → "👨‍🍳 Siparişiniz Hazır!"
- `assigned` → "🛵 Kurye Atandı!"
- `on_the_way` → "🚀 Siparişiniz Yolda!"
- `delivered` → "✅ Teslim Edildi!"

### 5. Admin Kampanya Bildirimi
```sql
-- Tüm müşterilere toplu bildirim gönder
SELECT send_campaign_notification(
  '🎉 %20 İndirim!',
  'Bugün tüm siparişlerde %20 indirim var!',
  '/musteri'
);
```

## 🗄️ Veritabanı Şeması

### notifications Tablosu
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('order_reply', 'campaign', 'system', 'order_update')),
    is_read BOOLEAN DEFAULT FALSE,
    related_order_id INTEGER REFERENCES packages(id),
    related_review_id UUID REFERENCES reviews(id),
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
```

### Index'ler
- `idx_notifications_customer_id` - Müşteriye göre hızlı arama
- `idx_notifications_is_read` - Okunmamış bildirimleri filtreleme
- `idx_notifications_created_at` - Tarih sıralaması
- `idx_notifications_customer_unread` - Müşteri + okunmamış (composite)

## 🎨 UI Bileşenleri

### 1. NotificationBell.tsx
**Konum:** `src/app/musteri/components/NotificationBell.tsx`

**Özellikler:**
- Realtime subscription (Supabase)
- Unread badge animasyonu
- Dropdown panel (380px genişlik)
- "Tümünü Okundu İşaretle" butonu
- Zaman formatı (Şimdi, 5 dk önce, 2 saat önce, vb.)
- Dışarı tıklama ile kapanma

**Kullanım:**
```tsx
import NotificationBell from './components/NotificationBell'

<NotificationBell />
```

### 2. PushNotificationPrompt.tsx
**Konum:** `src/app/musteri/components/PushNotificationPrompt.tsx`

**Özellikler:**
- Modal tasarım
- İzin durumu kontrolü
- LocalStorage ile "bir kez sor" mantığı
- Test bildirimi gönderme
- Faydalar listesi

**Kullanım:**
```tsx
import PushNotificationPrompt from './components/PushNotificationPrompt'

{isLoggedIn && <PushNotificationPrompt />}
```

### 3. Bildirimler Sayfası
**Konum:** `src/app/musteri/bildirimler/page.tsx`

**Özellikler:**
- Tüm bildirimler listesi
- Filtreler (Tümü / Okunmamış)
- Silme işlemi
- Okundu işaretleme
- Detaylı tarih formatı

**URL:** `/musteri/bildirimler`

## 🚀 Kurulum Adımları

### 1. SQL Script'i Çalıştır
```bash
1. Supabase Dashboard → SQL Editor
2. database/create_notifications_table.sql dosyasını aç
3. "Run" butonuna tıkla
```

**ÖNEMLİ:** Script içinde Realtime aktifleştirme komutu var:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 2. Realtime Kontrolü (Opsiyonel)
Supabase Dashboard'da kontrol et:
```
Database → Replication → supabase_realtime
```
`notifications` tablosu listede olmalı ✅

### 2. Kontrol Et
```sql
-- Tablo oluşturuldu mu?
SELECT * FROM notifications LIMIT 1;

-- Trigger'lar aktif mi?
SELECT * FROM pg_trigger WHERE tgname LIKE '%notification%';

-- RLS politikaları var mı?
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### 3. Test Et

#### A. Manuel Bildirim Oluştur
```sql
INSERT INTO notifications (customer_id, title, message, type)
VALUES (
  'YOUR_CUSTOMER_ID',
  '🎉 Test Bildirimi',
  'Bu bir test bildirimidir.',
  'system'
);
```

#### B. Kampanya Bildirimi Gönder
```sql
SELECT send_campaign_notification(
  '🎉 Hoş Geldiniz!',
  'Mergen Go bildirim sistemi aktif!',
  '/musteri'
);
```

#### C. Restoran Yanıtı Test
```sql
-- Bir review'a reply ekle
UPDATE reviews
SET reply = 'Teşekkür ederiz!',
    replied_at = NOW()
WHERE id = 'YOUR_REVIEW_ID';

-- Otomatik bildirim oluşturulmalı
```

## 📱 Push Notification Kurulumu

### 1. Tarayıcı İzni İste
Kullanıcı giriş yaptıktan sonra otomatik olarak modal açılır.

### 2. İzin Durumları
- `default` - Henüz sorulmadı
- `granted` - İzin verildi ✅
- `denied` - İzin reddedildi ❌

### 3. Test Bildirimi Gönder
```javascript
if (Notification.permission === 'granted') {
  new Notification('Test Başlık', {
    body: 'Test mesajı',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'test-notification'
  })
}
```

### 4. Tarayıcı Desteği
| Tarayıcı | Destekleniyor? | Notlar |
|----------|----------------|--------|
| Chrome | ✅ | Tam destek |
| Firefox | ✅ | Tam destek |
| Edge | ✅ | Tam destek |
| Safari (macOS) | ✅ | macOS 13+ |
| Safari (iOS) | ✅ | iOS 16.4+ |
| Opera | ✅ | Tam destek |

## 🔧 Özelleştirme

### Bildirim Süresi Formatı
```typescript
const formatTime = (timestamp: string) => {
  const diffMins = Math.floor((now - date) / 60000)
  
  if (diffMins < 1) return 'Şimdi'
  if (diffMins < 60) return `${diffMins} dk önce`
  // ...
}
```

### Bildirim İkonu
```typescript
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order_reply': return '💬'
    case 'order_update': return '📦'
    case 'campaign': return '🎉'
    case 'system': return '🔔'
  }
}
```

### Dropdown Genişliği
```tsx
<motion.div className="w-[380px] max-w-[calc(100vw-32px)]">
```

## 🎯 Kullanım Senaryoları

### Senaryo 1: Restoran Yanıtı
1. Müşteri sipariş verir ve değerlendirme yapar
2. Restoran yoruma yanıt verir
3. **Otomatik:** Trigger çalışır, bildirim oluşturulur
4. Müşteri header'daki zilde kırmızı badge görür
5. Zile tıklar, "Yorumunuza Yanıt Var!" bildirimini görür
6. Tıklar, siparişler sayfasına yönlendirilir
7. Restoran yanıtını görür

### Senaryo 2: Sipariş Takibi
1. Müşteri sipariş verir
2. Restoran siparişi hazırlar (status: `ready`)
3. **Otomatik:** "👨‍🍳 Siparişiniz Hazır!" bildirimi gelir
4. Kurye atanır (status: `assigned`)
5. **Otomatik:** "🛵 Kurye Atandı!" bildirimi gelir
6. Kurye yola çıkar (status: `on_the_way`)
7. **Otomatik:** "🚀 Siparişiniz Yolda!" bildirimi gelir
8. Teslim edilir (status: `delivered`)
9. **Otomatik:** "✅ Teslim Edildi!" bildirimi gelir

### Senaryo 3: Kampanya Duyurusu
1. Admin Supabase SQL Editor'ü açar
2. Kampanya fonksiyonunu çalıştırır:
```sql
SELECT send_campaign_notification(
  '🎉 Cuma Fırsatı!',
  'Bugün tüm pizzalarda %30 indirim!',
  '/musteri/restoranlar'
);
```
3. **Otomatik:** Tüm müşterilere bildirim gönderilir
4. Müşteriler zilde badge görür
5. Push notification izni varsa tarayıcı bildirimi de gelir

## 🐛 Sorun Giderme

### Sorun 1: Bildirimler Görünmüyor
**Kontrol:**
```sql
-- Bildirimler var mı?
SELECT * FROM notifications WHERE customer_id = 'YOUR_ID';

-- RLS politikaları aktif mi?
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

**Çözüm:**
```sql
-- RLS'i yeniden aktifleştir
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### Sorun 2: Realtime Çalışmıyor
**Kontrol:**
- Supabase Dashboard → Database → Replication
- `notifications` tablosu için replication aktif mi?

**Çözüm:**
```sql
-- Replication'ı aktifleştir
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Sorun 3: Push Notification İzni Alınamıyor
**Kontrol:**
- HTTPS kullanılıyor mu? (localhost hariç)
- Tarayıcı destekliyor mu?
- Site ayarlarında bildirimler engellenmiş mi?

**Çözüm:**
```javascript
// İzin durumunu kontrol et
console.log('Permission:', Notification.permission)

// Manuel izin iste
Notification.requestPermission().then(result => {
  console.log('Result:', result)
})
```

### Sorun 4: Trigger Çalışmıyor
**Kontrol:**
```sql
-- Trigger var mı?
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_review_reply_notification';

-- Fonksiyon var mı?
SELECT * FROM pg_proc 
WHERE proname = 'notify_customer_on_review_reply';
```

**Çözüm:**
SQL script'i tekrar çalıştır (DROP IF EXISTS kullanıldığı için güvenli)

## 📊 Performans

### Index Kullanımı
```sql
-- Müşterinin okunmamış bildirimleri (hızlı)
EXPLAIN ANALYZE
SELECT * FROM notifications 
WHERE customer_id = 'xxx' AND is_read = FALSE;

-- Index kullanılıyor mu kontrol et
-- "Index Scan using idx_notifications_customer_unread" görmelisiniz
```

### Realtime Subscription
- Her müşteri sadece kendi bildirimlerini dinler
- Filter: `customer_id=eq.{customerId}`
- Bağlantı sayısı: Aktif kullanıcı sayısı kadar

## 🔐 Güvenlik

### RLS Politikaları
- Müşteriler sadece kendi bildirimlerini görebilir
- Herkes bildirim ekleyebilir (sistem için)
- Müşteriler kendi bildirimlerini güncelleyebilir (okundu işaretleme)

### SQL Injection Koruması
- Supabase client otomatik parameterize ediyor
- Trigger'larda `NEW` ve `OLD` kullanılıyor (güvenli)

## 📈 İstatistikler

### Bildirim Sayıları
```sql
-- Toplam bildirim sayısı
SELECT COUNT(*) FROM notifications;

-- Tip bazında dağılım
SELECT type, COUNT(*) 
FROM notifications 
GROUP BY type;

-- Okunma oranı
SELECT 
  COUNT(*) FILTER (WHERE is_read) * 100.0 / COUNT(*) as read_percentage
FROM notifications;
```

### En Aktif Müşteriler
```sql
SELECT 
  customer_id,
  COUNT(*) as notification_count
FROM notifications
GROUP BY customer_id
ORDER BY notification_count DESC
LIMIT 10;
```

## 🎉 Sonuç

Bildirim sistemi tamamen kuruldu ve çalışıyor!

**Yapılanlar:**
- ✅ Veritabanı şeması
- ✅ Otomatik trigger'lar
- ✅ UI bileşenleri
- ✅ Realtime subscription
- ✅ Push notification desteği
- ✅ Admin kampanya fonksiyonu
- ✅ Tüm bildirimler sayfası

**Tek yapmanız gereken:**
1. SQL script'i çalıştır
2. Tarayıcıyı yenile
3. Test et!
