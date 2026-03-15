# 🔧 REALTIME TROUBLESHOOTING

## 🎯 Sorun: Bildirimler Anlık Gelmiyor

### Adım 1: SQL Kontrolü

Supabase SQL Editor'de çalıştır:
```sql
-- database/check_realtime_status.sql dosyasını çalıştır

-- Veya direkt bu sorguyu:
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'notifications';
```

**Beklenen Sonuç:**
```
schemaname | tablename     | pubname
-----------|---------------|------------------
public     | notifications | supabase_realtime
```

**Eğer boş gelirse:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

### Adım 2: Tarayıcı Konsolu Kontrolü

1. Müşteri paneline giriş yap
2. F12 ile konsolu aç
3. Şu logları ara:

**Başarılı Bağlantı:**
```
🔌 Realtime subscription başlatılıyor... [customer-id]
📡 Subscription durumu: SUBSCRIBED
✅ Realtime bağlantısı başarılı!
```

**Hatalı Bağlantı:**
```
❌ Customer ID bulunamadı, subscription başlatılamadı
// veya
❌ Realtime bağlantı hatası!
// veya
⏱️ Realtime bağlantı zaman aşımı!
```

---

### Adım 3: Manuel Test

#### A. SQL Editor'den Test
```sql
-- Kendi customer_id'nizi buraya yazın
INSERT INTO notifications (customer_id, title, message, type)
VALUES ('YOUR_CUSTOMER_ID', '🔔 Test', 'Realtime test bildirimi', 'system');
```

**Beklenen Sonuç:**
- Konsolda: `🔔 Yeni bildirim geldi!`
- Zil ikonunda badge +1
- Dropdown'da yeni bildirim

#### B. Admin Panelinden Test
```
1. Admin Panel → Müşteriler → Duyurular
2. Başlık: "🔔 Test"
3. Mesaj: "Realtime test"
4. Gönder
```

**Beklenen Sonuç:**
- Tüm müşterilere bildirim gider
- Konsolda: `🔔 Yeni bildirim geldi!`

---

### Adım 4: Supabase Dashboard Kontrolü

1. **Supabase Dashboard** → **Database** → **Replication**
2. `supabase_realtime` publication'ını bul
3. `notifications` tablosu listede olmalı ✅

**Eğer yoksa:**
- SQL Editor'de çalıştır: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications;`
- Sayfayı yenile

---

### Adım 5: Network Kontrolü

1. F12 → Network sekmesi
2. WS (WebSocket) filtresi
3. `realtime` bağlantısını bul

**Başarılı:**
- Status: 101 Switching Protocols
- Type: websocket
- Messages sekmesinde mesajlar görünür

**Hatalı:**
- Status: 400/500
- Bağlantı yok

---

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun 1: "Customer ID bulunamadı"
**Neden:** localStorage'da customer_id yok

**Çözüm:**
```javascript
// Konsolda kontrol et:
localStorage.getItem('customer_id')

// Eğer null ise, çıkış yap ve tekrar giriş yap
```

---

### Sorun 2: "CHANNEL_ERROR"
**Neden:** Realtime publication'da tablo yok

**Çözüm:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

### Sorun 3: "TIMED_OUT"
**Neden:** Supabase bağlantı sorunu veya RLS politikası

**Çözüm:**
```sql
-- RLS politikalarını kontrol et
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- Eğer yoksa, SQL dosyasını tekrar çalıştır
-- database/create_notifications_table.sql
```

---

### Sorun 4: Bildirim Geliyor Ama Badge Güncellenmiyor
**Neden:** State güncelleme sorunu

**Çözüm:**
```typescript
// NotificationBell.tsx içinde kontrol et:
setNotifications(prev => [newNotification, ...prev])
setUnreadCount(prev => prev + 1)
```

---

### Sorun 5: Push Notification Gelmiyor
**Neden:** Tarayıcı izni verilmemiş

**Çözüm:**
```javascript
// Konsolda kontrol et:
Notification.permission

// Eğer "default" ise:
Notification.requestPermission()

// Eğer "denied" ise:
// Tarayıcı ayarlarından izin ver
```

---

## 🧪 Tam Test Senaryosu

### 1. Hazırlık
```bash
1. SQL dosyasını çalıştır: database/create_notifications_table.sql
2. Realtime kontrolü: database/check_realtime_status.sql
3. Tarayıcıyı yenile (Ctrl+F5)
```

### 2. Müşteri Paneli
```bash
1. Müşteri paneline giriş yap
2. F12 ile konsolu aç
3. Şu logları gör:
   - 🔌 Realtime subscription başlatılıyor...
   - 📡 Subscription durumu: SUBSCRIBED
   - ✅ Realtime bağlantısı başarılı!
```

### 3. Test Bildirimi
```sql
-- SQL Editor'de:
INSERT INTO notifications (customer_id, title, message, type)
VALUES ('YOUR_CUSTOMER_ID', '🔔 Test', 'Realtime çalışıyor!', 'system');
```

### 4. Beklenen Sonuç
```bash
Konsol:
  🔔 Yeni bildirim geldi! { id: "...", title: "🔔 Test", ... }

UI:
  - Zil ikonunda kırmızı badge (1)
  - Dropdown'da yeni bildirim
  - Push notification (izin verilmişse)
```

---

## 📊 Debug Logları

### Başarılı Akış
```
[Sayfa Yükleme]
🔌 Realtime subscription başlatılıyor... abc-123-def
📡 Subscription durumu: SUBSCRIBED
✅ Realtime bağlantısı başarılı!

[Yeni Bildirim]
🔔 Yeni bildirim geldi! {
  id: "xyz-789",
  customer_id: "abc-123-def",
  title: "🎉 Kampanya",
  message: "İndirim var!",
  type: "campaign",
  is_read: false,
  created_at: "2026-03-15T10:30:00Z"
}
```

### Hatalı Akış
```
[Sayfa Yükleme]
❌ Customer ID bulunamadı, subscription başlatılamadı

// veya

🔌 Realtime subscription başlatılıyor... abc-123-def
📡 Subscription durumu: CHANNEL_ERROR
❌ Realtime bağlantı hatası!
```

---

## 🔍 Detaylı Kontrol Listesi

- [ ] SQL dosyası çalıştırıldı mı?
- [ ] `notifications` tablosu var mı?
- [ ] Realtime publication'da `notifications` var mı?
- [ ] RLS politikaları aktif mi?
- [ ] Customer ID localStorage'da var mı?
- [ ] Subscription başlatıldı mı? (konsol logu)
- [ ] Subscription durumu SUBSCRIBED mı?
- [ ] WebSocket bağlantısı aktif mi? (Network sekmesi)
- [ ] Test bildirimi gönderildi mi?
- [ ] Konsolda "Yeni bildirim geldi!" logu var mı?
- [ ] Badge güncellendi mi?
- [ ] Dropdown'da bildirim görünüyor mu?

---

## 🚀 Hızlı Çözüm

Eğer hiçbir şey çalışmıyorsa:

```sql
-- 1. Realtime'ı ekle
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Test bildirimi gönder
SELECT send_campaign_notification(
  '🔔 Test',
  'Realtime test bildirimi',
  '/musteri'
);
```

```bash
# 3. Tarayıcıyı tamamen kapat ve tekrar aç
# 4. Müşteri paneline giriş yap
# 5. F12 ile konsolu aç
# 6. Logları kontrol et
```

---

## 📞 Destek

Hala çalışmıyorsa:

1. **Konsol loglarını** kopyala
2. **Network sekmesini** kontrol et (WebSocket)
3. **SQL sorgu sonuçlarını** kontrol et
4. Tüm bilgileri paylaş

---

## ✅ Başarı Kriterleri

Realtime çalışıyorsa:
- ✅ Konsol: "✅ Realtime bağlantısı başarılı!"
- ✅ Yeni bildirim geldiğinde: "🔔 Yeni bildirim geldi!"
- ✅ Badge otomatik güncellenir
- ✅ Dropdown'da anında görünür
- ✅ Push notification gelir (izin verilmişse)

Tebrikler! Realtime çalışıyor! 🎉
