# 🚀 READY STATUS SİSTEMİ - MERGEN KURYE EKOSİSTEMİ

## 📋 Genel Bakış

Mergen Kurye artık profesyonel bir sipariş yönetim sistemine sahip. Restoran "Teslimata Hazır" onayı vermeden kurye ataması yapılamaz.

---

## 🔄 Yeni Sipariş Akışı (Lifecycle)

```
1. new_order    → Müşteri siparişi verdi, restoran ekranına düştü
2. ready        → Restoran hazırladı, kurye bekliyor (ADMIN BURADA DEVREYE GİRER)
3. assigned     → Admin kuryeyi atadı
4. picking_up   → Kurye dükkana geliyor
5. on_the_way   → Kurye yolda
6. delivered    → Teslim edildi
7. cancelled    → İptal edildi (özel durum)
```

---

## 🍽️ RESTORAN PANELİ YENİLİKLERİ

### 1. Yeni Sidebar Menüsü

```
📦 Siparişler       → Ana sipariş yönetimi
📜 Geçmiş          → Teslim edilen/iptal edilen siparişler
🍴 Menü Yönetimi   → Ürün CRUD işlemleri
🚪 Çıkış Yap       → Oturumu kapat
```

### 2. Menü Yönetimi Sayfası (`/restoran/menu-yonetimi`)

**Özellikler:**
- ✅ Ürün Ekleme/Düzenleme/Silme
- ✅ Fiyat Güncelleme
- ✅ Stok Durumu (is_available) - Stokta yoksa müşteri görmez
- ✅ Minimum Sepet Tutarı Ayarlama
- ✅ Kategoriye Göre Filtreleme
- ✅ Context-Aware: Her restoran sadece kendi ürünlerini görür

**Veritabanı Değişiklikleri:**
```sql
-- Products tablosuna eklendi
ALTER TABLE products ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Restaurants tablosuna eklendi
ALTER TABLE restaurants ADD COLUMN minimum_order_value DECIMAL(10,2) DEFAULT 300.00;
```

### 3. Yeni Sipariş Yönetimi

**3 Aşamalı Görünüm:**

#### 🔔 Yeni Siparişler (new_order)
- Turuncu kenarlık
- "YENİ" badge
- **"Teslimata Hazır" butonu** (yeşil)
- İptal butonu (kırmızı)

#### ✅ Teslimata Hazır (ready)
- Yeşil kenarlık
- "Kurye bekleniyor..." mesajı
- Hazırlanma saati gösterimi

#### 🚴 Teslimat Aşamasında (assigned/picking_up/on_the_way)
- Kurye atandıktan sonraki aşamalar
- Durum badge'leri

---

## 👨‍💼 ADMIN PANELİ DEĞİŞİKLİKLERİ

### Kritik Değişiklik: Ready Filtresi

**Önceki Sistem:**
```typescript
// Tüm sahipsiz paketleri gösteriyordu
const unassignedPackages = packages.filter(pkg => 
  !pkg.courier_id && pkg.status !== 'cancelled'
)
```

**Yeni Sistem:**
```typescript
// Sadece READY durumundaki paketleri gösteriyor
const unassignedPackages = packages.filter(pkg => 
  !pkg.courier_id && 
  pkg.status === 'ready' &&  // ← RESTORAN ONAYI GEREKLİ
  pkg.status !== 'cancelled'
)
```

**Sonuç:** Admin panelinde kurye atama listesinde sadece restoran tarafından "Teslimata Hazır" işaretlenen siparişler görünür.

---

## 🗄️ VERİTABANI DEĞİŞİKLİKLERİ

### Migration 005: Ready Status Sistemi

```sql
-- 1. Status constraint güncellendi
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_status_check;
ALTER TABLE packages ADD CONSTRAINT packages_status_check 
CHECK (status IN ('new_order', 'ready', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled'));

-- 2. ready_at timestamp eklendi
ALTER TABLE packages ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

-- 3. Mevcut 'waiting' statusleri 'new_order'a çevrildi
UPDATE packages SET status = 'new_order' WHERE status = 'waiting';

-- 4. Restaurants tablosuna minimum_order_value eklendi
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2) DEFAULT 300.00;

-- 5. Products tablosuna is_available eklendi
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- 6. Performans index'leri
CREATE INDEX IF NOT EXISTS idx_packages_status_ready ON packages(status) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_packages_restaurant_status ON packages(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_available ON products(restaurant_id, is_available);
```

---

## 📊 İSTATİSTİK VE CİRO HESAPLAMALARI

### Önemli Kural: İptal Edilen Siparişler

**Cancelled siparişler:**
- ❌ Ciro hesaplamalarına DAHİL EDİLMEZ
- ❌ İstatistiklere DAHİL EDİLMEZ
- ✅ Sadece geçmiş kayıtlarda görünür

**Örnek Filtreleme:**
```typescript
// Doğru ciro hesaplama
const totalRevenue = packages
  .filter(p => p.status === 'delivered')  // Sadece teslim edilenler
  .reduce((sum, p) => sum + p.amount, 0)

// Yanlış (iptal edilenleri dahil etmez)
const totalRevenue = packages
  .filter(p => p.status !== 'cancelled')  // ❌ YANLIŞ
  .reduce((sum, p) => sum + p.amount, 0)
```

---

## 🎨 TASARIM PRENSİPLERİ

### Yemeksepeti Tarzı Kurumsal Sadelik

**Renk Paleti:**
- Arka Plan: `bg-slate-950` (Koyu siyah)
- Kartlar: `bg-slate-900` (Koyu gri)
- Kenarlıklar: `border-slate-800` (Çok koyu gri)
- Vurgular: `bg-orange-600` (Turuncu - Mergen rengi)
- Başarı: `bg-green-600` (Yeşil)
- Hata: `bg-red-600` (Kırmızı)

**Buton Stilleri:**
```tsx
// Birincil aksiyon
className="bg-orange-600 hover:bg-orange-700 text-white"

// Başarı aksiyonu
className="bg-green-600 hover:bg-green-700 text-white"

// İptal/Silme
className="bg-red-600 hover:bg-red-700 text-white"

// İkincil aksiyon
className="bg-slate-700 hover:bg-slate-600 text-white"
```

**Gereksiz Gradient YOK:**
- ❌ `bg-gradient-to-r from-orange-500 to-red-500`
- ✅ `bg-orange-600`

---

## 🔐 GÜVENLİK VE CONTEXT-AWARE SİSTEM

### Restoran İzolasyonu

Her restoran sadece kendi verilerini görür:

```typescript
// Ürünleri çekerken
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('restaurant_id', restaurantId)  // ← Kritik filtre

// Siparişleri çekerken
const { data } = await supabase
  .from('packages')
  .select('*')
  .eq('restaurant_id', restaurantId)  // ← Kritik filtre
```

---

## 📱 REALTIME GÜNCELLEMELER

### Restoran Paneli Realtime

```typescript
const channel = supabase
  .channel(`restaurant-${selectedRestaurantId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'packages',
      filter: `restaurant_id=eq.${selectedRestaurantId}`
    },
    (payload) => {
      console.log('📦 Yeni sipariş geldi!')
      loadPackages(selectedRestaurantId)
    }
  )
  .subscribe()
```

**Sonuç:** Müşteri sipariş verdiği anda restoran ekranına düşer.

---

## 🚀 DEPLOYMENT KONTROL LİSTESİ

### 1. Veritabanı Migration
```bash
# Migration dosyasını çalıştır
psql -h [SUPABASE_HOST] -U postgres -d postgres -f database/migrations/005_ready_status_system.sql
```

### 2. Mevcut Verileri Güncelle
```sql
-- Tüm 'waiting' statuslerini 'new_order'a çevir
UPDATE packages SET status = 'new_order' WHERE status = 'waiting';
```

### 3. Realtime Ayarları
Supabase Dashboard → Database → Replication:
- ✅ `packages` tablosu işaretli olmalı
- ✅ `products` tablosu işaretli olmalı
- ✅ `restaurants` tablosu işaretli olmalı

### 4. Test Senaryoları

#### Senaryo 1: Yeni Sipariş Akışı
1. Müşteri sipariş verir → `new_order`
2. Restoran ekranında görünür
3. Restoran "Teslimata Hazır" butonuna basar → `ready`
4. Admin panelinde kurye atama listesinde görünür
5. Admin kurye atar → `assigned`
6. Kurye alır → `picking_up`
7. Kurye yola çıkar → `on_the_way`
8. Kurye teslim eder → `delivered`

#### Senaryo 2: Menü Yönetimi
1. Restoran giriş yapar
2. "Menü Yönetimi" sekmesine tıklar
3. Yeni ürün ekler
4. Fiyat günceller
5. Stoktan kaldırır (is_available = false)
6. Müşteri panelinde ürün görünmez

#### Senaryo 3: Minimum Sepet
1. Restoran minimum sepet tutarını 500₺ yapar
2. Müşteri 400₺'lik sepet oluşturur
3. "Ödeme Yap" butonu pasif kalır
4. "100₺ daha ekleyin" uyarısı çıkar

---

## 📞 DESTEK VE SORUN GİDERME

### Sık Karşılaşılan Sorunlar

#### 1. Admin panelinde sipariş görünmüyor
**Sebep:** Restoran henüz "Teslimata Hazır" butonuna basmadı.
**Çözüm:** Restoran panelinde sipariş `ready` durumuna geçirilmeli.

#### 2. Menü yönetiminde ürün eklenemiyor
**Sebep:** `restaurant_id` localStorage'da yok.
**Çözüm:** Restoran çıkış yapıp tekrar giriş yapmalı.

#### 3. Realtime çalışmıyor
**Sebep:** Supabase Replication ayarları kapalı.
**Çözüm:** Supabase Dashboard'dan `packages` tablosunu Replication'a ekle.

---

## 🎯 SONUÇ

Mergen Kurye artık profesyonel bir sipariş yönetim ekosisteminde çalışıyor:

✅ Restoran "Hazır" onayı olmadan kurye atanamaz
✅ Dinamik menü yönetimi
✅ Stok kontrolü
✅ Minimum sepet tutarı
✅ Context-aware güvenlik
✅ Realtime güncellemeler
✅ Temiz ve profesyonel UI

**Bu sistem bir para makinesidir. Ciddi durmalı. ✨**
