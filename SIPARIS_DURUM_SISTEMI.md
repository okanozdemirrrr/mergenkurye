# 📊 Sipariş Durum Sistemi - Mergen Kurye

## ✅ Yeni Status Sistemi

### Status Tanımları

| Status | Code | Label | Renk | Açıklama |
|--------|------|-------|------|----------|
| `new_order` | 0 | YENİ SİPARİŞ | 🔵 Mavi | Atama bekliyor |
| `assigned` | 1 | ATANDI | 🟣 Mor | Kurye atandı |
| `picking_up` | 2 | ALINIYOR | 🟠 Turuncu | Restorandan alınıyor |
| `on_the_way` | 3 | YOLDA | 🟡 Sarı | Teslimat yolunda |
| `delivered` | 4 | TESLİM EDİLDİ | 🟢 Yeşil | Başarıyla teslim edildi |
| `cancelled` | 5 | İPTAL EDİLDİ | 🔴 Kırmızı | Sipariş iptal edildi |

---

## 🔄 Status Akışı

```
┌─────────────┐
│ new_order   │ (0) Yeni sipariş oluşturuldu
│ 🔵 Mavi     │
└──────┬──────┘
       │ Admin kurye atar
       ▼
┌─────────────┐
│ assigned    │ (1) Kurye atandı
│ 🟣 Mor      │
└──────┬──────┘
       │ Kurye kabul eder
       ▼
┌─────────────┐
│ picking_up  │ (2) Restorandan alınıyor
│ 🟠 Turuncu  │
└──────┬──────┘
       │ Kurye yola çıkar
       ▼
┌─────────────┐
│ on_the_way  │ (3) Teslimat yolunda
│ 🟡 Sarı     │
└──────┬──────┘
       │ Kurye teslim eder
       ▼
┌─────────────┐
│ delivered   │ (4) Teslim edildi
│ 🟢 Yeşil    │
└─────────────┘

       │ Her aşamada iptal edilebilir
       ▼
┌─────────────┐
│ cancelled   │ (5) İptal edildi
│ 🔴 Kırmızı  │
└─────────────┘
```

---

## 🎯 Değişiklikler

### Eski Sistem (❌ Kaldırıldı)
```typescript
type PackageStatus = 'waiting' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled' | 'pending'
```

**Sorunlar:**
- `waiting` ve `pending` karışıklığı
- Yeni sipariş ile bekleyen sipariş ayrımı yok
- Default değer belirsiz
- Renk kodları tutarsız

### Yeni Sistem (✅ Uygulandı)
```typescript
type PackageStatus = 'new_order' | 'assigned' | 'picking_up' | 'on_the_way' | 'delivered' | 'cancelled'
```

**İyileştirmeler:**
- ✅ `new_order`: Açık ve net isim
- ✅ `waiting` ve `pending` kaldırıldı
- ✅ Default: `new_order`
- ✅ Tutarlı renk kodları
- ✅ Merkezi helper fonksiyonlar

---

## 🎨 Renk Kodları

### Tailwind Classes

```typescript
const STATUS_CONFIG = {
  new_order: {
    bgClass: 'bg-blue-600',
    textClass: 'text-blue-600',
    badgeClass: 'bg-blue-900/50 text-blue-300'
  },
  assigned: {
    bgClass: 'bg-purple-600',
    textClass: 'text-purple-600',
    badgeClass: 'bg-purple-900/50 text-purple-300'
  },
  picking_up: {
    bgClass: 'bg-orange-600',
    textClass: 'text-orange-600',
    badgeClass: 'bg-orange-900/50 text-orange-300'
  },
  on_the_way: {
    bgClass: 'bg-yellow-600',
    textClass: 'text-yellow-600',
    badgeClass: 'bg-yellow-900/50 text-yellow-300'
  },
  delivered: {
    bgClass: 'bg-green-600',
    textClass: 'text-green-600',
    badgeClass: 'bg-green-900/50 text-green-300'
  },
  cancelled: {
    bgClass: 'bg-red-600',
    textClass: 'text-red-600',
    badgeClass: 'bg-red-900/50 text-red-300'
  }
}
```

---

## 🔧 Kullanım

### Helper Fonksiyonlar

```typescript
import { 
  getStatusLabel, 
  getStatusBadgeClass,
  normalizeStatus,
  canTransitionTo 
} from '@/utils/statusHelpers'

// Status label al
const label = getStatusLabel('new_order') // "YENİ SİPARİŞ"
const shortLabel = getStatusLabel('new_order', true) // "Yeni"

// Badge class al
const badgeClass = getStatusBadgeClass('new_order') // "bg-blue-900/50 text-blue-300"

// Eski status'u normalize et
const status = normalizeStatus('waiting') // "new_order"

// Status geçişi kontrol et
const canChange = canTransitionTo('new_order', 'assigned') // true
const cannotChange = canTransitionTo('delivered', 'assigned') // false
```

---

### React Component

```tsx
import { getStatusBadgeClass, getStatusLabel } from '@/utils/statusHelpers'

function OrderCard({ order }) {
  return (
    <div>
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeClass(order.status)}`}>
        {getStatusLabel(order.status)}
      </span>
    </div>
  )
}
```

---

## 📊 Panel Görünümleri

### Admin Paneli

**Yeni Sipariş (new_order):**
```
┌─────────────────────────────────────┐
│ 🔵 YENİ SİPARİŞ                    │
│ MRG-2024-001                        │
│ Ahmet Yılmaz                        │
│ 150₺                                │
│ [Kurye Ata ▼]                       │
└─────────────────────────────────────┘
```

**Atandı (assigned):**
```
┌─────────────────────────────────────┐
│ 🟣 ATANDI                           │
│ MRG-2024-001                        │
│ Ahmet Yılmaz                        │
│ Kurye: Mehmet Demir                 │
│ 150₺                                │
└─────────────────────────────────────┘
```

---

### Restoran Paneli

**Yeni Sipariş Listesi:**
```
┌─────────────────────────────────────┐
│ YENİ SİPARİŞLER (3)                 │
├─────────────────────────────────────┤
│ 🔵 MRG-001 | Ahmet Y. | 150₺       │
│ 🔵 MRG-002 | Ayşe K.  | 200₺       │
│ 🔵 MRG-003 | Mehmet D.| 180₺       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ATANAN SİPARİŞLER (2)               │
├─────────────────────────────────────┤
│ 🟣 MRG-004 | Ali V.   | 120₺       │
│ 🟣 MRG-005 | Fatma S. | 250₺       │
└─────────────────────────────────────┘
```

---

### Kurye Uygulaması

**Aktif Paketler:**
```
┌─────────────────────────────────────┐
│ 🟣 ATANDI                           │
│ #1 - Ahmet Yılmaz                   │
│ 150₺ | Nakit                        │
│ [KABUL ET]                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🟠 ALINIYOR                         │
│ #2 - Ayşe Kaya                      │
│ 200₺ | Kart                         │
│ [YOLA ÇIK]                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🟡 YOLDA                            │
│ #3 - Mehmet Demir                   │
│ 180₺ | Nakit                        │
│ [TESLİM ET]                         │
└─────────────────────────────────────┘
```

---

## 🗄️ Veritabanı Migration

### SQL Script

**Dosya:** `database/migrations/001_update_status_system.sql`

**Çalıştırma:**
```sql
-- Supabase SQL Editor'de çalıştır
-- VEYA
psql -h your-db-host -U postgres -d your-db-name -f 001_update_status_system.sql
```

**Yapılanlar:**
1. ✅ `waiting` → `new_order` dönüşümü
2. ✅ `pending` → `new_order` dönüşümü
3. ✅ Default status: `new_order`
4. ✅ Status check constraint
5. ✅ Performance index'leri

---

## 🔄 Migration Adımları

### 1. Veritabanı Güncellemesi
```bash
# Supabase Dashboard → SQL Editor
# 001_update_status_system.sql dosyasını çalıştır
```

### 2. Frontend Güncellemesi
```bash
# Build al
npm run build

# Test et
npm run dev
```

### 3. Doğrulama
```sql
-- Status dağılımını kontrol et
SELECT status, COUNT(*) 
FROM packages 
GROUP BY status;

-- Beklenen sonuç:
-- new_order: X
-- assigned: Y
-- picking_up: Z
-- on_the_way: W
-- delivered: V
-- cancelled: U
```

---

## 🧪 Test Senaryoları

### Senaryo 1: Yeni Sipariş Oluşturma
```typescript
// Agent'tan sipariş gelir
const newOrder = {
  order_number: 'MRG-2024-001',
  customer_name: 'Ahmet Yılmaz',
  amount: 150,
  status: 'new_order', // ✅ Otomatik
  restaurant_id: 1
}

// Admin panelinde görünür
// 🔵 YENİ SİPARİŞ etiketi ile
```

### Senaryo 2: Kurye Atama
```typescript
// Admin kurye atar
await assignCourier(orderId, courierId)

// Status otomatik güncellenir
// new_order → assigned

// Restoran panelinde
// 🔵 YENİ SİPARİŞ → 🟣 ATANDI
```

### Senaryo 3: Kurye Kabul Eder
```typescript
// Kurye "Kabul Et" butonuna basar
await updateStatus(orderId, 'picking_up')

// Status güncellenir
// assigned → picking_up

// Kurye uygulamasında
// 🟣 ATANDI → 🟠 ALINIYOR
```

### Senaryo 4: Teslimat
```typescript
// Kurye "Teslim Et" butonuna basar
await updateStatus(orderId, 'delivered', {
  payment_method: 'cash',
  delivered_at: new Date()
})

// Status güncellenir
// on_the_way → delivered

// Tüm panellerde
// 🟡 YOLDA → 🟢 TESLİM EDİLDİ
```

---

## 🚨 Hata Giderme

### Sorun 1: "Teslim Edildi" Hatası
**Sebep:** Default status `delivered` olarak ayarlanmış

**Çözüm:**
```sql
-- Default status'u kontrol et
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name = 'status';

-- Düzelt
ALTER TABLE packages 
ALTER COLUMN status SET DEFAULT 'new_order';
```

---

### Sorun 2: Eski Status Değerleri
**Sebep:** `waiting` veya `pending` değerleri hala var

**Çözüm:**
```sql
-- Eski değerleri bul
SELECT id, order_number, status 
FROM packages 
WHERE status IN ('waiting', 'pending');

-- Güncelle
UPDATE packages 
SET status = 'new_order' 
WHERE status IN ('waiting', 'pending');
```

---

### Sorun 3: Frontend'de Eski Status
**Sebep:** Cache veya eski kod

**Çözüm:**
```bash
# Cache temizle
rm -rf .next
rm -rf node_modules/.cache

# Yeniden build
npm run build

# Browser cache temizle
Ctrl + Shift + R (Hard refresh)
```

---

## 📈 Performans İyileştirmeleri

### Index'ler
```sql
-- Status bazlı sorgular için
CREATE INDEX idx_packages_status ON packages(status);

-- Aktif paketler için
CREATE INDEX idx_packages_active 
ON packages(status, courier_id) 
WHERE status NOT IN ('delivered', 'cancelled');

-- Restoran bazlı
CREATE INDEX idx_packages_restaurant_status 
ON packages(restaurant_id, status, created_at DESC);
```

### Query Optimizasyonu
```typescript
// ❌ Yavaş
const packages = await supabase
  .from('packages')
  .select('*')
  .neq('status', 'delivered')
  .neq('status', 'cancelled')

// ✅ Hızlı
const packages = await supabase
  .from('packages')
  .select('*')
  .in('status', ['new_order', 'assigned', 'picking_up', 'on_the_way'])
```

---

## 🎯 Özet

**Değişiklikler:**
- ✅ `waiting` → `new_order`
- ✅ `pending` kaldırıldı
- ✅ Tutarlı renk kodları
- ✅ Merkezi helper fonksiyonlar
- ✅ SQL migration
- ✅ Performance index'leri

**Sonuç:**
- 🎨 Daha iyi UX (mavi, mor, yeşil)
- 🚀 Daha hızlı sorgular (index'ler)
- 🔧 Daha kolay bakım (helper'lar)
- 📊 Daha net durum takibi

---

**Hazırlayan:** Kiro AI
**Proje:** Mergen Kurye Sistemi
**Tarih:** 11.02.2026
**Durum:** ✅ Hazır (Frontend güncellemesi gerekli)
