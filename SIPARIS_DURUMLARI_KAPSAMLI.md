# 📦 Sipariş Durumları - Kapsamlı Referans

## 🎯 Tüm Sipariş Durumları (Status)

Sistemde **8 ana durum** + **2 eski durum** (geriye uyumluluk) bulunmaktadır.

---

## ✅ ANA DURUMLAR (8 Adet)

### 1. `new_order` (YENİ SİPARİŞ)
```typescript
Kod: 0
Renk: Mavi (Blue)
CSS: bg-blue-600 / text-blue-600
Badge: bg-blue-900/50 text-blue-300
Etiket: "YENİ SİPARİŞ"
Kısa: "Yeni"
Emoji: 🔵
Açıklama: "Atama bekliyor"

Ne Oluyor:
- Müşteri siparişi verdi
- Sistem siparişi oluşturdu
- Restoran panelinde görünüyor
- Restoran onayı bekleniyor

Timestamp: created_at

Sonraki Durumlar:
✅ getting_ready (Restoran hazırlamaya başladı)
❌ cancelled (İptal edildi)
```

### 2. `getting_ready` (HAZIRLANIYOR)
```typescript
Kod: 1
Renk: Cyan (Açık Mavi)
CSS: bg-cyan-600 / text-cyan-600
Badge: bg-cyan-900/50 text-cyan-300
Etiket: "HAZIRLANIYOR"
Kısa: "Hazırlanıyor"
Emoji: 🔷
Açıklama: "Restoran hazırlıyor"

Ne Oluyor:
- Restoran siparişi onayladı
- Yemek hazırlanıyor
- Müşteri bilgilendiriliyor
- Hazır olması bekleniyor

Timestamp: getting_ready_at

Sonraki Durumlar:
✅ ready (Sipariş hazır)
❌ cancelled (İptal edildi)
```

### 3. `ready` (HAZIR)
```typescript
Kod: 2
Renk: Teal (Yeşilimsi Mavi)
CSS: bg-teal-600 / text-teal-600
Badge: bg-teal-900/50 text-teal-300
Etiket: "HAZIR"
Kısa: "Hazır"
Emoji: 💠
Açıklama: "Kurye ataması bekliyor"

Ne Oluyor:
- Sipariş hazır
- Admin panelinde görünüyor
- Kurye ataması bekleniyor
- Alınmaya hazır

Timestamp: ready_at

Sonraki Durumlar:
✅ assigned (Kurye atandı)
❌ cancelled (İptal edildi)
```

### 4. `assigned` (ATANDI)
```typescript
Kod: 3
Renk: Mor (Purple)
CSS: bg-purple-600 / text-purple-600
Badge: bg-purple-900/50 text-purple-300
Etiket: "ATANDI"
Kısa: "Atandı"
Emoji: 🟣
Açıklama: "Kurye atandı"

Ne Oluyor:
- Admin kurye atadı
- Kurye bildirimi aldı
- Kurye siparişi gördü
- Restorandan alım bekleniyor

Timestamp: assigned_at

Sonraki Durumlar:
✅ picking_up (Restorandan alınıyor)
❌ cancelled (İptal edildi)
```

### 5. `picking_up` (ALINIYOR)
```typescript
Kod: 4
Renk: Turuncu (Orange)
CSS: bg-orange-600 / text-orange-600
Badge: bg-orange-900/50 text-orange-300
Etiket: "ALINIYOR"
Kısa: "Alınıyor"
Emoji: 🟠
Açıklama: "Restorandan alınıyor"

Ne Oluyor:
- Kurye restorana gitti
- Sipariş hazır
- Kurye paketi alıyor
- Teslimat başlamak üzere

Timestamp: (assigned_at ile aynı, ayrı timestamp yok)

Sonraki Durumlar:
✅ on_the_way (Teslimat yolunda)
❌ cancelled (İptal edildi)
```

### 6. `on_the_way` (YOLDA)
```typescript
Kod: 5
Renk: Sarı (Yellow)
CSS: bg-yellow-600 / text-yellow-600
Badge: bg-yellow-900/50 text-yellow-300
Etiket: "YOLDA"
Kısa: "Yolda"
Emoji: 🟡
Açıklama: "Teslimat yolunda"

Ne Oluyor:
- Kurye paketi aldı
- Müşteriye gidiyor
- Konum takibi aktif
- Teslim edilmek üzere

Timestamp: picked_up_at

Sonraki Durumlar:
✅ delivered (Başarıyla teslim edildi)
❌ cancelled (İptal edildi)
```

### 7. `delivered` (TESLİM EDİLDİ) ✅
```typescript
Kod: 6
Renk: Yeşil (Green)
CSS: bg-green-600 / text-green-600
Badge: bg-green-900/50 text-green-300
Etiket: "TESLİM EDİLDİ"
Kısa: "Teslim"
Emoji: 🟢
Açıklama: "Başarıyla teslim edildi"

Ne Oluyor:
- Kurye müşteriye teslim etti
- Sipariş tamamlandı
- Ödeme işlendi
- Geçmiş siparişlere taşındı

Timestamp: delivered_at

Sonraki Durumlar:
🔒 Değiştirilemez (Final durum)
```

### 8. `cancelled` (İPTAL EDİLDİ) ❌
```typescript
Kod: 7
Renk: Kırmızı (Red)
CSS: bg-red-600 / text-red-600
Badge: bg-red-900/50 text-red-300
Etiket: "İPTAL EDİLDİ"
Kısa: "İptal"
Emoji: 🔴
Açıklama: "Sipariş iptal edildi"

Ne Oluyor:
- Sipariş iptal edildi
- İptal nedeni kaydedildi
- Ödeme iade edildi (varsa)
- Geçmiş siparişlere taşındı

Timestamp: cancelled_at
Ek Alanlar: cancelled_by, cancellation_reason

Sonraki Durumlar:
🔒 Değiştirilemez (Final durum)
```

---

## 🔄 ESKİ DURUMLAR (Geriye Uyumluluk)

### `waiting` (ESKİ)
```typescript
Durum: DEPRECATED ⚠️
Yeni Karşılığı: new_order
Açıklama: Eski sistemde kullanılıyordu
Otomatik Dönüşüm: Migration ile new_order'a çevrildi
```

### `pending` (ESKİ)
```typescript
Durum: DEPRECATED ⚠️
Yeni Karşılığı: new_order
Açıklama: Eski sistemde kullanılıyordu
Otomatik Dönüşüm: Migration ile new_order'a çevrildi
```

---

## 📊 DURUM AKIŞI (Flow)

### Tam Akış Şeması
```
new_order (🔵)
    ↓
getting_ready (🔷)
    ↓
ready (💠)
    ↓
assigned (🟣)
    ↓
picking_up (🟠)
    ↓
on_the_way (🟡)
    ↓
delivered (🟢) ✅

VEYA

cancelled (🔴) ❌ (Her aşamadan iptal edilebilir)
```

### İzin Verilen Geçişler
```typescript
new_order      → getting_ready, cancelled
getting_ready  → ready, cancelled
ready          → assigned, cancelled
assigned       → picking_up, cancelled
picking_up     → on_the_way, cancelled
on_the_way     → delivered, cancelled
delivered      → (değiştirilemez)
cancelled      → (değiştirilemez)
```

---

## 🗄️ VERİTABANI YAPISI

### packages Tablosu - Status Alanı
```sql
status VARCHAR(20) NOT NULL DEFAULT 'new_order'

-- Constraint (İzin verilen değerler)
CONSTRAINT packages_status_check 
CHECK (status IN (
    'new_order',
    'getting_ready',
    'ready',
    'assigned',
    'picking_up',
    'on_the_way',
    'delivered',
    'cancelled',
    -- Eski değerler (geriye uyumluluk)
    'waiting',
    'pending'
))
```

### Timestamp Alanları
```sql
created_at TIMESTAMP          -- Sipariş oluşturulma
getting_ready_at TIMESTAMP    -- Hazırlanmaya başlama
ready_at TIMESTAMP            -- Hazır olma
assigned_at TIMESTAMP         -- Kurye atanma
picked_up_at TIMESTAMP        -- Restorandan alınma
delivered_at TIMESTAMP        -- Teslim edilme
cancelled_at TIMESTAMP        -- İptal edilme
```

### İptal Alanları
```sql
cancelled_by VARCHAR(20)      -- 'admin' veya 'restaurant'
cancellation_reason TEXT      -- İptal nedeni
```

---

## 🎨 GÖRSEL TASARIM

### Renk Paleti
```css
new_order:      #2563eb (Blue)
getting_ready:  #0891b2 (Cyan)
ready:          #0d9488 (Teal)
assigned:       #9333ea (Purple)
picking_up:     #ea580c (Orange)
on_the_way:     #ca8a04 (Yellow)
delivered:      #16a34a (Green)
cancelled:      #dc2626 (Red)
```

### Badge Sınıfları (Dark Mode)
```css
new_order:      bg-blue-900/50 text-blue-300
getting_ready:  bg-cyan-900/50 text-cyan-300
ready:          bg-teal-900/50 text-teal-300
assigned:       bg-purple-900/50 text-purple-300
picking_up:     bg-orange-900/50 text-orange-300
on_the_way:     bg-yellow-900/50 text-yellow-300
delivered:      bg-green-900/50 text-green-300
cancelled:      bg-red-900/50 text-red-300
```

---

## 📱 KULLANICI GÖRÜNÜMLERİ

### Müşteri Perspektifi
```
new_order       → "Siparişiniz alındı"
getting_ready   → "Siparişiniz hazırlanıyor"
ready           → "Siparişiniz hazır"
assigned        → "Kurye atandı"
picking_up      → "Kurye yolda"
on_the_way      → "Siparişiniz yolda"
delivered       → "Teslim edildi - Afiyet olsun!"
cancelled       → "Sipariş iptal edildi"
```

### Kurye Perspektifi
```
new_order       → (Görmez)
getting_ready   → (Görmez)
ready           → (Görmez)
assigned        → "Yeni sipariş atandı"
picking_up      → "Restorandan al"
on_the_way      → "Müşteriye teslim et"
delivered       → "Teslim edildi - Kazanç eklendi"
cancelled       → "İptal edildi"
```

### Restoran Perspektifi
```
new_order       → "Yeni sipariş geldi - Onayla"
getting_ready   → "Hazırlanıyor"
ready           → "Hazır - Kurye bekleniyor"
assigned        → "Kurye atandı"
picking_up      → "Kurye geliyor"
on_the_way      → "Kurye aldı"
delivered       → "Teslim edildi - Ödeme işlendi"
cancelled       → "İptal edildi"
```

### Admin Perspektifi
```
new_order       → "Restoran onayı bekleniyor"
getting_ready   → "Restoran hazırlıyor"
ready           → "Kurye ata"
assigned        → "Kurye atandı - Takip et"
picking_up      → "Alım aşamasında"
on_the_way      → "Teslimat aşamasında"
delivered       → "Tamamlandı - Ödemeler işlendi"
cancelled       → "İptal edildi"
```

---

## 🔍 FİLTRELEME VE SORGULAMA

### Aktif Siparişler
```typescript
const activeStatuses: PackageStatus[] = [
  'new_order',
  'getting_ready',
  'ready',
  'assigned',
  'picking_up',
  'on_the_way'
]

// Kullanım
const activeOrders = packages.filter(p => 
  activeStatuses.includes(p.status)
)
```

### Tamamlanmış Siparişler
```typescript
const completedStatuses: PackageStatus[] = [
  'delivered',
  'cancelled'
]

// Kullanım
const completedOrders = packages.filter(p => 
  completedStatuses.includes(p.status)
)
```

### Kurye Bekleyen Siparişler
```typescript
const readyForCourier = packages.filter(p => 
  p.status === 'ready'
)
```

### Restoran Onayı Bekleyen
```typescript
const pendingRestaurant = packages.filter(p => 
  p.status === 'new_order'
)
```

---

## 🎯 ÖNCELİK SIRALAMASI

```typescript
1. new_order       (En yüksek öncelik)
2. getting_ready
3. ready
4. assigned
5. picking_up
6. on_the_way
7. delivered
8. cancelled       (En düşük öncelik)
```

---

## 🔔 BİLDİRİM MESAJLARI

```typescript
const statusMessages = {
  new_order: 'Sipariş sisteme eklendi',
  getting_ready: 'Sipariş hazırlanmaya başlandı',
  ready: 'Sipariş hazır, kurye ataması bekleniyor',
  assigned: 'Sipariş kuryeye atandı',
  picking_up: 'Sipariş restorandan alınıyor',
  on_the_way: 'Sipariş teslimat yolunda',
  delivered: 'Sipariş başarıyla teslim edildi',
  cancelled: 'Sipariş iptal edildi'
}
```

---

## 📈 ÖRNEK ZAMAN ÇİZELGESİ

```
14:00:00 → new_order        (Müşteri sipariş verdi)
14:01:00 → getting_ready    (Restoran onayladı)
14:15:00 → ready            (Sipariş hazır)
14:17:00 → assigned         (Admin kurye atadı)
14:25:00 → picking_up       (Kurye restorana vardı)
14:30:00 → on_the_way       (Kurye paketi aldı)
14:45:00 → delivered        (Müşteriye teslim edildi)

Toplam Süre: 45 dakika ✅
```

---

## 🛠️ HELPER FONKSİYONLAR

### Status Doğrulama
```typescript
isValidStatus(status: string): boolean
isActiveStatus(status: PackageStatus): boolean
isCompletedStatus(status: PackageStatus): boolean
```

### Status Dönüşüm
```typescript
normalizeStatus(status: string): PackageStatus
statusFromCode(code: number): PackageStatus
statusToCode(status: PackageStatus): number
```

### Status Geçiş Kontrolü
```typescript
canTransitionTo(current: PackageStatus, next: PackageStatus): boolean
getNextValidStatuses(current: PackageStatus): PackageStatus[]
```

### Görsel Yardımcılar
```typescript
getStatusBadgeClass(status: PackageStatus): string
getStatusLabel(status: PackageStatus, short?: boolean): string
getStatusColor(status: PackageStatus): string
getStatusBgClass(status: PackageStatus): string
getStatusTextClass(status: PackageStatus): string
```

---

## 📊 ÖZET

**Toplam Durum:** 10 adet (8 aktif + 2 deprecated)
**Aktif Durum:** 6 adet (new_order → on_the_way)
**Final Durum:** 2 adet (delivered, cancelled)
**Deprecated:** 2 adet (waiting, pending)

**Tam Akış:**
🔵 new_order → 🔷 getting_ready → 💠 ready → 🟣 assigned → 🟠 picking_up → 🟡 on_the_way → 🟢 delivered

**veya**

🔴 cancelled (Her aşamadan)

---

## 📁 İLGİLİ DOSYALAR

- `src/types/index.ts` - TypeScript tip tanımları
- `src/utils/statusHelpers.ts` - Helper fonksiyonlar
- `SIPARIS_DURUM_AKISI.md` - Detaylı akış dokümantasyonu
- `database/add_new_order_statuses.sql` - Veritabanı migration
- `src/app/restoran/components/KanbanBoard.tsx` - Restoran kanban görünümü
- `src/app/kurye/page.tsx` - Kurye paneli
- `src/app/admin/page.tsx` - Admin paneli
