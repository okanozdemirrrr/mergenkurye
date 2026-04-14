# 🚀 Bildirim Sistemi Entegrasyon Rehberi

## ✅ Tamamlanan İşler

1. ✅ NotificationContext oluşturuldu
2. ✅ Audio yönetimi hazır
3. ✅ Native notification desteği eklendi
4. ✅ Restoran, Admin, Kurye hook'ları hazır
5. ✅ UI popup component'leri hazır
6. ✅ Root layout'a NotificationProvider eklendi

---

## 📝 Yapılması Gerekenler (3 Adım)

### ADIM 1: Restoran Paneline Ekle

**Dosya:** `src/app/restoran/page_NEW.tsx` (veya `page.tsx`)

**Eklenecek Kod:**

```tsx
// En üste import ekle
import { RestaurantNotificationWrapper } from '@/components/notifications/RestaurantNotificationWrapper'

// Component içinde, return statement'ın içine ekle
export default function RestoranPage() {
  // Mevcut state'ler...
  const restaurantId = 123 // TODO: Gerçek restaurant ID'yi buraya al
  const restaurantName = "Restoran Adı" // TODO: Gerçek restoran adını buraya al

  return (
    <div>
      {/* Mevcut içerik */}
      
      {/* EN SONA EKLE */}
      <RestaurantNotificationWrapper 
        restaurantId={restaurantId}
        restaurantName={restaurantName}
      />
    </div>
  )
}
```

**Nereden Alınacak:**
- `restaurantId`: Login state'inden veya session'dan
- `restaurantName`: Restoran bilgilerinden

---

### ADIM 2: Admin Paneline Ekle

**Dosya:** `src/app/admin/page.tsx`

**Eklenecek Kod:**

```tsx
// En üste import ekle
import { AdminNotificationWrapper } from '@/components/notifications/AdminNotificationWrapper'

// Component içinde, return statement'ın içine ekle
export default function AdminPage() {
  return (
    <div>
      {/* Mevcut içerik */}
      
      {/* EN SONA EKLE */}
      <AdminNotificationWrapper />
    </div>
  )
}
```

**Not:** Admin için parametre gerekmez, tüm siparişleri dinler.

---

### ADIM 3: Kurye Paneline Ekle

**Dosya:** `src/app/kurye/page.tsx`

**Eklenecek Kod:**

```tsx
// En üste import ekle
import { CourierNotificationWrapper } from '@/components/notifications/CourierNotificationWrapper'

// Component içinde, return statement'ın içine ekle
export default function KuryePage() {
  // Mevcut state'ler...
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)

  return (
    <div>
      {/* Mevcut içerik */}
      
      {/* EN SONA EKLE */}
      <CourierNotificationWrapper courierId={selectedCourierId} />
    </div>
  )
}
```

**Nereden Alınacak:**
- `courierId`: Login state'inden (`selectedCourierId`)

---

## 🧪 Test Etme

### Test 1: Restoran Bildirimi
1. Restoran paneline giriş yap
2. Supabase SQL Editor'de çalıştır:
```sql
INSERT INTO packages (
  customer_name, 
  customer_phone, 
  delivery_address, 
  amount, 
  status, 
  restaurant_id
) VALUES (
  'Test Müşteri',
  '05551234567',
  'Test Adres, Samsun',
  150.00,
  'new_order',
  123  -- Restoran ID'nizi buraya yazın
);
```
3. Popup görünmeli + audio çalmalı
4. "Hazırlanıyor" butonuna tıkla
5. Audio durmalı + popup kapanmalı

### Test 2: Admin Bildirimi
1. Admin paneline giriş yap
2. Yukarıdaki SQL'i çalıştır (herhangi bir restaurant_id ile)
3. Popup görünmeli + audio çalmalı
4. "Görüldü" butonuna tıkla
5. Audio durmalı + popup kapanmalı

### Test 3: Kurye Bildirimi
1. Kurye paneline giriş yap
2. Notification izni ver (browser popup)
3. Supabase SQL Editor'de çalıştır:
```sql
UPDATE packages 
SET 
  status = 'assigned',
  courier_id = 'kurye-uuid-buraya',  -- Kurye ID'nizi buraya yazın
  assigned_at = NOW()
WHERE id = 123;  -- Bir paket ID'si seçin
```
4. Kısa audio çalmalı (4 saniye)
5. Native notification görünmeli
6. 10 saniye sonra otomatik kapanmalı

---

## 🔧 Özelleştirme

### Audio Dosyası Değiştirme
1. Yeni audio dosyasını `public/notification.mp3` olarak kaydet
2. Veya farklı bir isim kullanmak için:
```tsx
// src/contexts/NotificationContext.tsx içinde
loopingAudioRef.current = new Audio('/yeni-ses.mp3')
shortAudioRef.current = new Audio('/yeni-ses.mp3')
```

### Popup Tasarımı Değiştirme
- `src/components/notifications/RestaurantOrderPopup.tsx`
- `src/components/notifications/AdminOrderPopup.tsx`

Tailwind CSS sınıflarını değiştirerek özelleştirebilirsin.

### Audio Süresi Değiştirme (Kurye)
```tsx
// src/contexts/NotificationContext.tsx içinde
setTimeout(() => {
  if (shortAudioRef.current) {
    shortAudioRef.current.pause()
  }
}, 4000)  // 4000ms = 4 saniye, burası değiştirilebilir
```

---

## ⚠️ Önemli Notlar

### 1. Autoplay Policy
Modern tarayıcılar audio'nun otomatik çalmasını engelleyebilir. Kullanıcı sayfada bir butona tıkladıktan sonra sorun çözülür.

### 2. Supabase Realtime
Supabase Dashboard'da Realtime'ın aktif olduğundan emin ol:
- Database → Replication → Enable Realtime for `packages` table

### 3. Notification İzni
Kurye panelinde native notification için izin gerekir. İlk girişte otomatik sorulur.

### 4. Status Değerleri
Sistemde kullanılan status değerleri:
- `new_order` - Yeni sipariş (Restoran + Admin bildirimi)
- `getting_ready` - Hazırlanıyor (Restoran butonu tıklandığında)
- `assigned` - Atandı (Kurye bildirimi)

---

## 🐛 Sorun Giderme

### Audio Çalmıyor
**Çözüm:** Sayfada bir butona tıkla, sonra yeni sipariş geldiğinde çalacak.

### Popup Görünmüyor
**Kontrol Et:**
1. Console'da hata var mı?
2. Realtime bağlantı kuruldu mu? (`📡 Realtime status: SUBSCRIBED`)
3. Status değeri doğru mu? (`new_order` veya `assigned`)

### Native Notification Çalışmıyor
**Kontrol Et:**
1. Browser notification izni verildi mi?
2. Console'da `⚠️ Notification izni verilmemiş` yazıyor mu?
3. Browser ayarlarından notification'ları kontrol et

---

## 📊 Özet

| Panel | Trigger | Audio | Popup | DB Update |
|-------|---------|-------|-------|-----------|
| Restoran | `status=new_order` | Loop | ✅ | ✅ `getting_ready` |
| Admin | `status=new_order` | Loop | ✅ | ❌ |
| Kurye | `status=assigned` | 4 saniye | ❌ | ❌ |

---

## ✅ Checklist

- [ ] Restoran paneline `RestaurantNotificationWrapper` eklendi
- [ ] Admin paneline `AdminNotificationWrapper` eklendi
- [ ] Kurye paneline `CourierNotificationWrapper` eklendi
- [ ] Restoran bildirimi test edildi
- [ ] Admin bildirimi test edildi
- [ ] Kurye bildirimi test edildi
- [ ] Audio dosyası (`public/notification.mp3`) mevcut
- [ ] Supabase Realtime aktif
- [ ] Production'a deploy edildi

---

Tüm adımlar tamamlandığında bildirim sistemi tam çalışır durumda olacak! 🎉
