# 🏗️ MERGEN KURYE SİSTEMİ - KAPSAMLI TEKNİK MİMARİ VE İŞ MANTIĞI DOKÜMANTASYONU

> **Oluşturulma Tarihi**: 16 Nisan 2026  
> **Versiyon**: 2.0  
> **Durum**: Production Ready

---

## 📋 İÇİNDEKİLER

1. [Sistem Mimarisi & Teknoloji Yığını](#1-sistem-mimarisi--teknoloji-yığını)
2. [Veritabanı Şeması (Data Matrix)](#2-veritabanı-şeması-data-matrix)
3. [Sipariş Yaşam Döngüsü (State Transitions)](#3-sipariş-yaşam-döngüsü-state-transitions)
4. [Panel Bazlı Detaylı Analiz](#4-panel-bazlı-detaylı-analiz)
5. [Kritik İş Mantığı Modülleri](#5-kritik-iş-mantığı-modülleri)
6. [Realtime Mimari](#6-realtime-mimari)
7. [Bildirim Sistemi Mimarisi](#7-bildirim-sistemi-mimarisi)
8. [Güvenlik ve Yetkilendirme](#8-güvenlik-ve-yetkilendirme)

---

## 1. SİSTEM MİMARİSİ & TEKNOLOJİ YIĞINI

### 1.1 Genel Mimari Yapı

Mergen Kurye, **hibrit web-mobil SaaS** mimarisine sahip bir kurye yönetim platformudur.

```
┌─────────────────────────────────────────────────────────────┐
│                    KULLANICI KATMANI                         │
├─────────────────────────────────────────────────────────────┤
│  Web Browser (Desktop/Mobile)  │  Native Mobile App         │
│  - Restoran Paneli              │  - Capacitor Wrapper       │
│  - Admin Paneli                 │  - iOS/Android            │
│  - Kurye Paneli (Web)           │  - GPS Tracking           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND KATMANI                            │
├─────────────────────────────────────────────────────────────┤
│  Next.js 16.1.1 (App Router + Turbopack)                    │
│  - React 19 (Client & Server Components)                    │
│  - TypeScript (Strict Mode)                                 │
│  - Tailwind CSS 4.0                                         │
│  - Framer Motion (Animasyonlar)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  DEPLOYMENT KATMANI                          │
├─────────────────────────────────────────────────────────────┤
│  Vercel (Production)                                         │
│  - Edge Functions                                            │
│  - Automatic HTTPS                                           │
│  - CDN Distribution                                          │
│  - Environment Variables                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND KATMANI                             │
├─────────────────────────────────────────────────────────────┤
│  Supabase (Backend-as-a-Service)                            │
│  - PostgreSQL 15 (Veritabanı)                               │
│  - Realtime Subscriptions (WebSocket)                       │
│  - Row Level Security (RLS)                                 │
│  - Storage (Resim/Dosya)                                    │
│  - Auth (Kullanıcı Yönetimi)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  MOBİL WRAPPER                               │
├─────────────────────────────────────────────────────────────┤
│  Capacitor 6.x                                               │
│  - Native Bridge (iOS/Android)                              │
│  - Geolocation Plugin                                        │
│  - Push Notifications                                        │
│  - Background Tasks                                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Teknoloji Detayları

#### Frontend Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **Build Tool**: Turbopack (Webpack'ten 10x hızlı)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4.0
- **Type Safety**: TypeScript 5.x (Strict Mode)
- **State Management**: React Context API + Custom Hooks
- **Animation**: Framer Motion
- **Maps**: Leaflet.js + React-Leaflet
- **Icons**: Lucide React

#### Backend Stack
- **Database**: PostgreSQL 15 (Supabase)
- **Realtime**: Supabase Realtime (WebSocket)
- **Storage**: Supabase Storage (S3-compatible)
- **Auth**: Supabase Auth (JWT-based)

#### Mobile Stack
- **Wrapper**: Capacitor 6.x
- **Platforms**: iOS 13+, Android 8+
- **Native Features**:
  - GPS Tracking (Foreground & Background)
  - Push Notifications
  - Camera Access
  - Local Storage

#### Deployment
- **Hosting**: Vercel (Production)
- **Domain**: mergenkuryesistem.vercel.app
- **SSL**: Automatic (Let's Encrypt)
- **CDN**: Vercel Edge Network

### 1.3 Web ve Mobil Etkileşimi

**Web Deployment (Vercel)**:
- Tüm paneller (Restoran, Admin, Kurye) web üzerinden erişilebilir
- Responsive tasarım (mobil tarayıcılarda da çalışır)
- PWA desteği (offline çalışma yok, sadece install prompt)

**Mobil App (Capacitor)**:
- Web uygulamasının native wrapper'ı
- Aynı Next.js kodu çalışır
- Ek native özellikler:
  - Arka plan GPS takibi
  - Native push notifications
  - Daha iyi performans

**Veri Akışı**:
```
Mobil App → Capacitor Bridge → Next.js (Web) → Supabase → PostgreSQL
                                    ↓
                            Realtime WebSocket
                                    ↓
                    Tüm Paneller (Anlık Güncelleme)
```

---

## 2. VERİTABANI ŞEMASI (DATA MATRIX)

### 2.1 Ana Tablolar ve İlişkiler

```sql
-- KULLANICI YÖNETİMİ
users (Supabase Auth)
  ├── couriers (1:1)
  ├── restaurants (1:1)
  └── customers (1:1)

-- SİPARİŞ YÖNETİMİ
packages (Siparişler)
  ├── FK: courier_id → couriers.id
  ├── FK: restaurant_id → restaurants.id
  └── FK: customer_id → customers.id

-- FİNANSAL YÖNETİM
courier_settlements (Kurye Mutabakatları)
  └── FK: courier_id → couriers.id

restaurant_debts (Restoran Borçları)
  └── FK: restaurant_id → restaurants.id

-- MENÜ YÖNETİMİ
products (Ürünler)
  └── FK: restaurant_id → restaurants.id

categories (Kategoriler)
  └── FK: restaurant_id → restaurants.id

-- MARKET YÖNETİMİ
market_products (Market Ürünleri)
  └── Bağımsız tablo

-- DEĞERLENDİRME SİSTEMİ
reviews (Yorumlar)
  ├── FK: order_id → packages.id
  ├── FK: customer_id → customers.id
  └── FK: restaurant_id → restaurants.id

-- BİLDİRİM SİSTEMİ
notifications (Bildirimler)
  └── FK: customer_id → customers.id
```

### 2.2 Detaylı Tablo Şemaları

#### 2.2.1 `packages` (Siparişler) - EN ÖNEMLİ TABLO

```sql
CREATE TABLE packages (
  -- Temel Bilgiler
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE,                    -- Sipariş numarası (örn: "MK-20260416-001")
  
  -- Müşteri Bilgileri
  customer_id UUID REFERENCES customers(id),   -- Müşteri ID (opsiyonel)
  customer_name TEXT NOT NULL,                 -- Müşteri adı
  customer_phone TEXT,                         -- Müşteri telefonu
  delivery_address TEXT NOT NULL,              -- Teslimat adresi
  
  -- Sipariş Detayları
  content TEXT,                                -- Paket içeriği
  amount DECIMAL(10, 2) NOT NULL,             -- Toplam tutar
  items JSONB DEFAULT '[]'::jsonb,            -- Sipariş öğeleri (JSON array)
  subtotal DECIMAL(10, 2) DEFAULT 0,          -- Ara toplam
  delivery_fee DECIMAL(10, 2) DEFAULT 0,      -- Teslimat ücreti
  
  -- Durum Bilgileri
  status TEXT NOT NULL DEFAULT 'new_order',    -- Sipariş durumu
  CHECK (status IN (
    'new_order',      -- Yeni sipariş
    'getting_ready',  -- Hazırlanıyor
    'ready',          -- Hazır
    'assigned',       -- Kuryeye atandı
    'picking_up',     -- Alınıyor
    'on_the_way',     -- Yolda
    'delivered',      -- Teslim edildi
    'cancelled'       -- İptal edildi
  )),
  
  -- İlişkiler
  courier_id UUID REFERENCES couriers(id),     -- Atanan kurye
  restaurant_id BIGINT REFERENCES restaurants(id), -- Restoran
  
  -- Ödeme Bilgileri
  payment_method TEXT DEFAULT 'cash',          -- Ödeme yöntemi
  CHECK (payment_method IN ('cash', 'card', 'iban')),
  
  -- Platform Bilgisi
  platform TEXT DEFAULT 'web',                 -- Sipariş platformu
  
  -- Zaman Damgaları (Sipariş Yaşam Döngüsü)
  created_at TIMESTAMPTZ DEFAULT NOW(),        -- Oluşturulma
  getting_ready_at TIMESTAMPTZ,                -- Hazırlanmaya başlama
  ready_at TIMESTAMPTZ,                        -- Hazır olma
  assigned_at TIMESTAMPTZ,                     -- Kuryeye atanma
  picked_up_at TIMESTAMPTZ,                    -- Alınma
  delivered_at TIMESTAMPTZ,                    -- Teslim edilme
  
  -- İptal Bilgileri
  cancelled_at TIMESTAMPTZ,                    -- İptal edilme
  cancelled_by TEXT,                           -- İptal eden (admin/restaurant)
  cancellation_reason TEXT,                    -- İptal nedeni
  
  -- Mutabakat Bilgileri
  settled_at TIMESTAMPTZ,                      -- Kurye mutabakatı
  restaurant_settled_at TIMESTAMPTZ,           -- Restoran mutabakatı
  
  -- Konum Bilgileri
  latitude DECIMAL(10, 8),                     -- Enlem
  longitude DECIMAL(11, 8)                     -- Boylam
);

-- İndeksler (Performans için)
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_courier_id ON packages(courier_id);
CREATE INDEX idx_packages_restaurant_id ON packages(restaurant_id);
CREATE INDEX idx_packages_created_at ON packages(created_at);
CREATE INDEX idx_packages_delivered_at ON packages(delivered_at);
```

**ÖNEMLİ NOTLAR**:
- `amount` değeri ASLA değişmez (orijinal sipariş tutarı)
- `status` değişiklikleri trigger ile zaman damgalarını otomatik günceller
- `settled_at` ve `restaurant_settled_at` sadece bilgi amaçlıdır, finansal hesaplamada KULLANILMAZ

#### 2.2.2 `courier_settlements` (Kurye Mutabakatları) - FİNANSAL TABLO

```sql
CREATE TABLE courier_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  
  -- Tarih Aralığı (Sadece bilgi amaçlı)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Ödeme Bilgisi
  amount_paid DECIMAL(10, 2) NOT NULL,         -- Admin'in kuryeden aldığı tutar
  
  -- Meta Bilgiler
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin',
  notes TEXT                                    -- Opsiyonel not
);

-- İndeksler
CREATE INDEX idx_courier_settlements_courier_id ON courier_settlements(courier_id);
CREATE INDEX idx_courier_settlements_dates ON courier_settlements(start_date, end_date);
CREATE INDEX idx_courier_settlements_created_at ON courier_settlements(created_at);
```

**KRİTİK İŞ MANTIĞI**:
```
Kalan Borç = Toplam Teslimat Tutarı - Toplam Ödenen Tutar

Toplam Teslimat Tutarı = SUM(packages.amount) 
  WHERE courier_id = X 
  AND status = 'delivered'
  AND delivered_at <= endDate

Toplam Ödenen Tutar = SUM(courier_settlements.amount_paid)
  WHERE courier_id = X
  AND created_at <= endDate

Kalan Borç = MAX(0, Toplam Teslimat - Toplam Ödenen)
```

**SENARYOLAR**:
1. **Tam Ödeme**: `amount_paid = Kalan Borç` → Kalan Borç = 0
2. **Eksik Ödeme**: `amount_paid < Kalan Borç` → Kalan Borç devam eder
3. **Fazla Ödeme (Bahşiş)**: `amount_paid > Kalan Borç` → Kalan Borç = 0

#### 2.2.3 `couriers` (Kuryeler)

```sql
CREATE TABLE couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),      -- Supabase Auth bağlantısı
  
  -- Kişisel Bilgiler
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  
  -- Durum Bilgileri
  is_active BOOLEAN DEFAULT true,              -- Aktif/Pasif
  
  -- Konum Bilgileri
  last_location JSONB,                         -- Son konum {latitude, longitude, updated_at}
  
  -- Zaman Damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.4 `restaurants` (Restoranlar)

```sql
CREATE TABLE restaurants (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  -- Temel Bilgiler
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  
  -- Branding
  description TEXT,                            -- Açıklama
  working_hours TEXT,                          -- Çalışma saatleri
  cover_image_url TEXT,                        -- Kapak fotoğrafı
  logo_url TEXT,                               -- Logo
  
  -- İş Kuralları
  minimum_order_value DECIMAL(10, 2) DEFAULT 0, -- Minimum sepet tutarı
  is_active BOOLEAN DEFAULT true,              -- Aktif/Pasif
  
  -- İstatistikler
  rating DECIMAL(3, 2) DEFAULT 0.0,           -- Ortalama puan (0-5)
  review_count INTEGER DEFAULT 0,              -- Yorum sayısı
  
  -- Zaman Damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.5 `products` (Ürünler)

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,                         -- UUID veya custom ID
  restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  
  -- Ürün Bilgileri
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  
  -- Görünürlük
  is_visible BOOLEAN DEFAULT true,             -- Vitrinde göster/gizle
  
  -- Cross-Sell (Yan Ürünler)
  upsell_product_ids TEXT[] DEFAULT '{}',      -- İlişkili ürün ID'leri
  
  -- Zaman Damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.6 `market_products` (Market Ürünleri)

```sql
CREATE TABLE market_products (
  id BIGSERIAL PRIMARY KEY,
  
  -- Ürün Bilgileri
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,                      -- Kategori (örn: "Meyve", "Sebze")
  image_url TEXT,
  
  -- Stok Bilgisi
  stock_quantity INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  
  -- Zaman Damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2.7 `reviews` (Değerlendirmeler)

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- İlişkiler
  order_id INTEGER UNIQUE REFERENCES packages(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  restaurant_id BIGINT REFERENCES restaurants(id),
  
  -- Değerlendirme
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Restoran Yanıtı
  restaurant_reply TEXT,
  replied_at TIMESTAMPTZ,
  
  -- Zaman Damgaları
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Tablo İlişkileri Özeti

```
packages (N) ←→ (1) couriers
packages (N) ←→ (1) restaurants
packages (N) ←→ (1) customers
packages (1) ←→ (1) reviews

courier_settlements (N) ←→ (1) couriers
restaurant_debts (N) ←→ (1) restaurants

products (N) ←→ (1) restaurants
products (N) ←→ (1) categories

reviews (N) ←→ (1) restaurants
reviews (N) ←→ (1) customers
```

---


## 3. SİPARİŞ YAŞAM DÖNGÜSÜ (STATE TRANSITIONS)

### 3.1 Sipariş Durumları ve Kronolojik Akış

```
┌─────────────┐
│  new_order  │ ← Sipariş oluşturuldu (Restoran veya Admin)
└──────┬──────┘
       │ Restoran: "Hazırla" butonu
       ↓
┌──────────────┐
│getting_ready │ ← Restoran hazırlamaya başladı
└──────┬───────┘
       │ Restoran: "Hazır" butonu
       ↓
┌──────────┐
│  ready   │ ← Sipariş hazır, kurye bekliyor
└────┬─────┘
     │ Admin: Kurye ata + "Kurye Ata" butonu
     ↓
┌──────────┐
│ assigned │ ← Kuryeye atandı
└────┬─────┘
     │ Kurye: "Alındı" butonu (mobil app)
     ↓
┌─────────────┐
│ picking_up  │ ← Kurye restorandan alıyor
└──────┬──────┘
       │ Kurye: "Yola Çıktım" butonu
       ↓
┌─────────────┐
│ on_the_way  │ ← Kurye müşteriye gidiyor
└──────┬──────┘
       │ Kurye: "Teslim Edildi" butonu
       ↓
┌─────────────┐
│  delivered  │ ← Sipariş tamamlandı ✅
└─────────────┘

       ❌ İPTAL AKIŞI (Her aşamada mümkün)
       ↓
┌─────────────┐
│  cancelled  │ ← Admin veya Restoran iptal etti
└─────────────┘
```

### 3.2 Durum Geçişleri ve Tetikleyiciler

| Mevcut Durum | Yeni Durum | Tetikleyen Panel | Tetikleyen Aksiyon | Timestamp Güncellenen |
|--------------|------------|------------------|--------------------|-----------------------|
| `new_order` | `getting_ready` | **Restoran** | "Hazırla" butonu | `getting_ready_at` |
| `getting_ready` | `ready` | **Restoran** | "Hazır" butonu | `ready_at` |
| `ready` | `assigned` | **Admin** | Kurye seç + "Kurye Ata" | `assigned_at` |
| `assigned` | `picking_up` | **Kurye** | "Alındı" butonu | `picked_up_at` |
| `picking_up` | `on_the_way` | **Kurye** | "Yola Çıktım" butonu | - |
| `on_the_way` | `delivered` | **Kurye** | "Teslim Edildi" butonu | `delivered_at` |
| `*` (herhangi) | `cancelled` | **Admin/Restoran** | "İptal Et" (3 nokta menüsü) | `cancelled_at` |

### 3.3 Otomatik Trigger'lar

Veritabanında aşağıdaki trigger'lar çalışır:

```sql
-- Örnek: Status değiştiğinde timestamp'leri otomatik güncelle
CREATE OR REPLACE FUNCTION update_package_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'getting_ready' AND OLD.status != 'getting_ready' THEN
    NEW.getting_ready_at = NOW();
  END IF;
  
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
    NEW.ready_at = NOW();
  END IF;
  
  IF NEW.status = 'assigned' AND OLD.status != 'assigned' THEN
    NEW.assigned_at = NOW();
  END IF;
  
  IF NEW.status = 'picking_up' AND OLD.status != 'picking_up' THEN
    NEW.picked_up_at = NOW();
  END IF;
  
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = NOW();
  END IF;
  
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_package_timestamps
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION update_package_timestamps();
```

### 3.4 Durum Geçiş Kuralları

**İZİN VERİLEN GEÇİŞLER**:
- `new_order` → `getting_ready` ✅
- `getting_ready` → `ready` ✅
- `ready` → `assigned` ✅
- `assigned` → `picking_up` ✅
- `picking_up` → `on_the_way` ✅
- `on_the_way` → `delivered` ✅
- Herhangi bir durum → `cancelled` ✅

**İZİN VERİLMEYEN GEÇİŞLER**:
- `delivered` → Başka bir durum ❌ (Teslim edilen sipariş geri dönemez)
- `cancelled` → Başka bir durum ❌ (İptal edilen sipariş geri dönemez)
- Geriye doğru geçişler ❌ (örn: `ready` → `getting_ready`)

---

## 4. PANEL BAZLI DETAYLI ANALİZ

### 4.1 RESTORAN PANELİ

#### 4.1.1 Genel Özellikler

**Erişim**: `/restoran`  
**Kimlik Doğrulama**: Supabase Auth (restaurant user)  
**Ana Bileşen**: `src/app/restoran/page_NEW.tsx`

#### 4.1.2 Özellik Listesi

1. **Kanban Board (Sipariş Yönetimi)**
   - 3 kolon: "Yeni Siparişler", "Hazırlanan", "Hazır"
   - Sürükle-bırak YOK (buton bazlı geçiş)
   - Realtime güncelleme (Supabase Realtime)

2. **Sipariş Oluşturma**
   - Floating Action Button (sol alt)
   - Modal form: Müşteri bilgileri, adres, tutar, içerik
   - Platform seçimi (Getir, Yemeksepeti, Trendyol, vb.)
   - Ödeme yöntemi (Nakit, Kart, IBAN)

3. **Sipariş Detay Modalı**
   - "Hazır" kolonundaki siparişlere tıklanabilir
   - Tüm sipariş bilgileri görüntülenir
   - Kurye bilgisi (atandıysa)
   - Zaman damgaları (oluşturulma, hazırlanma, hazır olma, vb.)

4. **Teslim Edilen Siparişler Sekmesi**
   - İki tarih kutusu ile filtreleme
   - Tüm teslim edilmiş siparişler listelenir
   - Sipariş no, müşteri, kurye, tutar, zaman bilgileri

5. **Günlük Finansal Özet**
   - Bugünkü paket sayısı
   - Paket masrafı (paket sayısı × 100₺)
   - Bugünkü hak ediş (ciro - masraf)

6. **Menü Yönetimi** (`/restoran/restoranim`)
   - Ürün ekleme/düzenleme/silme
   - Kategori yönetimi
   - Görsel yükleme (Supabase Storage)
   - Yan ürün (upsell) seçimi
   - Minimum sepet tutarı ayarı

7. **Dark Mode**
   - Toggle butonu (sağ alt)
   - Tüm bileşenlerde desteklenir

#### 4.1.3 Bildirim Sistemi (Restoran)

**Tetikleyici**: `packages` tablosunda `status = 'new_order'` ve `restaurant_id` eşleşmesi

**Davranış**:
1. **Popup Göster**: Ekranın sağ altında sticky popup
2. **Audio Loop**: Bildirim sesi sürekli çalar
3. **Popup İçeriği**:
   - Müşteri adı/soyadı
   - Müşteri telefonu
   - Müşteri adresi
   - Restoran adı
4. **"Hazırlanıyor" Butonu**:
   - Tıklandığında:
     - Audio durdurulur
     - Popup kapanır
     - Veritabanında `status = 'getting_ready'` güncellenir

**Kod Konumu**:
- Context: `src/contexts/NotificationContext.tsx`
- Hook: `src/hooks/useRestaurantNotifications.ts`
- Wrapper: `src/components/notifications/RestaurantNotificationWrapper.tsx`
- Popup: `src/components/notifications/RestaurantOrderPopup.tsx`

#### 4.1.4 Realtime Bağlantı

```typescript
// Restoran paneli sadece kendi siparişlerini dinler
const channel = supabase
  .channel('restaurant-packages')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'packages',
    filter: `restaurant_id=eq.${restaurantId}`
  }, (payload) => {
    // Siparişleri yeniden yükle
    fetchPackages()
  })
  .subscribe()
```

**Yeniden Bağlanma Mekanizması**:
- Bağlantı koptuğunda 3 saniye sonra otomatik yeniden bağlanır
- Maksimum 10 deneme
- Polling fallback (30 saniye)

---

### 4.2 ADMİN PANELİ

#### 4.2.1 Genel Özellikler

**Erişim**: `/admin`  
**Kimlik Doğrulama**: Supabase Auth (admin user)  
**Ana Bileşen**: `src/app/admin/page.tsx`

#### 4.2.2 Özellik Listesi

1. **Canlı Sipariş Takibi** (Ana Sekme)
   - Canlı harita (Leaflet.js)
   - Kurye durumları (sağ panel)
   - Sipariş kartları (grid layout)
   - Kurye atama (dropdown + buton)
   - Sipariş iptali (3 nokta menüsü)

2. **Geçmiş Siparişler**
   - Tarih filtreleme
   - Sayfalama (pagination)
   - Teslim edilen ve iptal edilen siparişler

3. **Kurye Yönetimi**
   - Kurye listesi
   - Aktif/Pasif durumu
   - Bugünkü teslimat sayısı
   - Aktif paket sayısı
   - Toplam borç

4. **Gün Sonu Mutabakatı**
   - Kurye seçimi
   - Tarih aralığı seçimi
   - Nakit/Kart/IBAN toplamları (görsel)
   - Kalan borç hesaplama (finansal)
   - Ödeme kaydı (`courier_settlements` tablosuna)

5. **Restoran Yönetimi**
   - Restoran listesi
   - Başvuru onaylama
   - Borç takibi
   - Ödeme kayıtları

6. **Market CMS**
   - Kategori bazlı ürün yönetimi
   - Ürün ekleme/düzenleme/silme
   - Stok yönetimi

7. **Müşteri Duyuruları**
   - Duyuru oluşturma
   - Tüm müşterilere bildirim gönderme

#### 4.2.3 Kurye Atama Mekanizması

**Akış**:
1. Admin "Hazır" durumundaki siparişi görür
2. Dropdown'dan aktif kurye seçer
3. "Kurye Ata" butonuna basar
4. Veritabanı güncellenir:
   ```sql
   UPDATE packages 
   SET courier_id = 'selected_courier_id',
       status = 'assigned',
       assigned_at = NOW()
   WHERE id = package_id;
   ```
5. Kurye panelinde bildirim gider

**Kod Konumu**: `src/services/orderService.ts` → `assignCourier()`

#### 4.2.4 Sipariş İptali

**Akış**:
1. Admin sipariş kartındaki 3 nokta menüsüne tıklar
2. "İptal Et" seçeneğini seçer
3. Onay dialogu çıkar
4. Onaylanırsa:
   ```sql
   UPDATE packages 
   SET status = 'cancelled',
       courier_id = NULL,
       cancelled_at = NOW(),
       cancelled_by = 'admin'
   WHERE id = package_id;
   ```

**Kod Konumu**: `src/services/orderService.ts` → `cancelOrder()`

#### 4.2.5 Bildirim Sistemi (Admin)

**Tetikleyici**: `packages` tablosunda `status = 'new_order'` (tüm restoranlar)

**Davranış**:
1. **Popup Göster**: Ekranın sağ altında sticky popup
2. **Audio Loop**: Bildirim sesi sürekli çalar
3. **Popup İçeriği**:
   - Müşteri adı/soyadı
   - Müşteri telefonu
   - Müşteri adresi
4. **"Görüldü" Butonu**:
   - Tıklandığında:
     - Audio durdurulur
     - Popup kapanır
     - **VERİTABANI GÜNCELLENMEZ** (sadece UI acknowledgment)

**Kod Konumu**:
- Hook: `src/hooks/useAdminNotifications.ts`
- Wrapper: `src/components/notifications/AdminNotificationWrapper.tsx`
- Popup: `src/components/notifications/AdminOrderPopup.tsx`

#### 4.2.6 Gün Sonu Mutabakatı Detaylı Mantık

**Modal**: `src/app/admin/components/modals/EndOfDayModalNew.tsx`

**Hesaplama Mantığı**:

```typescript
// 1. GÖRSEL DEĞERLER (Tarih aralığına göre)
const { data: packages } = await supabase
  .from('packages')
  .select('amount, payment_method')
  .eq('courier_id', courierId)
  .eq('status', 'delivered')
  .gte('delivered_at', `${startDate}T00:00:00`)
  .lte('delivered_at', `${endDate}T23:59:59`)

const cashTotal = packages.filter(p => p.payment_method === 'cash').reduce(...)
const cardTotal = packages.filter(p => p.payment_method === 'card').reduce(...)
const ibanTotal = packages.filter(p => p.payment_method === 'iban').reduce(...)

// 2. FİNANSAL HESAPLAMA (Tüm geçmiş - startDate KULLANILMAZ!)
const { data: allPackages } = await supabase
  .from('packages')
  .select('amount')
  .eq('courier_id', courierId)
  .eq('status', 'delivered')
  .lte('delivered_at', `${endDate}T23:59:59`) // Sadece endDate!

const totalOwed = allPackages.reduce((sum, p) => sum + p.amount, 0)

// 3. TOPLAM ÖDEME (Tüm geçmiş)
const { data: settlements } = await supabase
  .from('courier_settlements')
  .select('amount_paid')
  .eq('courier_id', courierId)
  .lte('created_at', `${endDate}T23:59:59`) // Sadece endDate!

const totalPaid = settlements.reduce((sum, s) => sum + s.amount_paid, 0)

// 4. KALAN BORÇ (CARİ HESAP)
const remainingDebt = Math.max(0, totalOwed - totalPaid)
```

**Ödeme Kaydı**:
```typescript
await supabase
  .from('courier_settlements')
  .insert({
    courier_id: courierId,
    start_date: startDate,
    end_date: endDate,
    amount_paid: receivedAmount,
    notes: notes || null,
    created_by: 'admin'
  })
```

**Senaryolar**:
- **Tam Ödeme**: `receivedAmount = remainingDebt` → Yeni kalan borç = 0
- **Eksik Ödeme**: `receivedAmount < remainingDebt` → Yeni kalan borç = remainingDebt - receivedAmount
- **Fazla Ödeme**: `receivedAmount > remainingDebt` → Yeni kalan borç = 0 (fazlası bahşiş)

---

### 4.3 KURYE PANELİ

#### 4.3.1 Genel Özellikler

**Erişim**: `/kurye`  
**Kimlik Doğrulama**: Supabase Auth (courier user)  
**Ana Bileşen**: `src/app/kurye/page.tsx`

#### 4.3.2 Özellik Listesi

1. **Aktif Siparişler**
   - Atanan siparişler listesi
   - Durum butonları:
     - "Alındı" (`assigned` → `picking_up`)
     - "Yola Çıktım" (`picking_up` → `on_the_way`)
     - "Teslim Edildi" (`on_the_way` → `delivered`)

2. **Kazanç İstatistikleri**
   - Nakit toplam (görsel)
   - Kart toplam (görsel)
   - IBAN toplam (görsel)
   - **Kalan Borç** (finansal - realtime)

3. **GPS Takibi**
   - Foreground tracking (uygulama açıkken)
   - Background tracking (Capacitor plugin)
   - Konum güncelleme (her 10 saniye)
   - `couriers.last_location` güncellenir

4. **Geçmiş Teslimatlar**
   - Tarih filtreleme
   - Teslim edilen siparişler listesi

#### 4.3.3 Bildirim Sistemi (Kurye)

**Tetikleyici**: `packages` tablosunda `status = 'assigned'` ve `courier_id` eşleşmesi

**Davranış**:
1. **Native Notification**: Cihazın native bildirim sistemi
2. **Kısa Audio**: 3-4 saniye ses çalar (loop YOK)
3. **Bildirim İçeriği**:
   - Başlık: "Yeni paketiniz var!"
   - İçerik: "Müşteri Adresi: [address], Restoran Adresi: [restaurant_address]"
4. **Popup YOK**: Sadece native notification

**Kod Konumu**:
- Hook: `src/hooks/useCourierNotifications.ts`
- Wrapper: `src/components/notifications/CourierNotificationWrapper.tsx`

#### 4.3.4 Kazanç İstatistikleri (Realtime)

**Bileşen**: `src/components/CourierEarningsStats.tsx`

**Realtime Subscription**:
```typescript
const channel = supabase
  .channel('courier-settlements-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'courier_settlements',
    filter: `courier_id=eq.${courierId}`
  }, (payload) => {
    // Kalan borcu yeniden hesapla
    calculateRemainingDebt()
  })
  .subscribe()
```

**Önemli**: Nakit/Kart/IBAN değerleri DEĞİŞMEZ, sadece "Kalan Borç" realtime güncellenir.

#### 4.3.5 GPS Tracking Mantığı

**Foreground Tracking**:
```typescript
navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude } = position.coords
    
    // Veritabanını güncelle
    await supabase
      .from('couriers')
      .update({
        last_location: {
          latitude,
          longitude,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', courierId)
  },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
)
```

**Background Tracking** (Capacitor):
```typescript
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation'

await BackgroundGeolocationPlugin.addWatcher({
  backgroundMessage: "Konum takibi aktif",
  backgroundTitle: "Mergen Kurye",
  requestPermissions: true,
  stale: false,
  distanceFilter: 50 // 50 metre hareket ettiğinde güncelle
}, (location) => {
  // Konum güncelle
  updateCourierLocation(location.latitude, location.longitude)
})
```

---


## 5. KRİTİK İŞ MANTIĞI MODÜLLERİ

### 5.1 Kurye Borç ve Mutabakat Sistemi

#### 5.1.1 Matematiksel Formül

```
KALAN BORÇ = MAX(0, TOPLAM TESLİMAT TUTARI - TOPLAM ÖDENEN TUTAR)

Nerede:
  TOPLAM TESLİMAT TUTARI = SUM(packages.amount)
    WHERE courier_id = X
    AND status = 'delivered'
    AND delivered_at <= endDate

  TOPLAM ÖDENEN TUTAR = SUM(courier_settlements.amount_paid)
    WHERE courier_id = X
    AND created_at <= endDate
```

#### 5.1.2 Cari Hesap Mantığı

**Önemli Kural**: `startDate` finansal hesaplamada KULLANILMAZ!

**Neden?**
- Kurye'nin borcu sürekli devam eden bir "cari hesap"tır
- Geçmiş borçlar silinmez, sadece ödemelerle azalır
- `startDate` sadece görsel istatistikler için kullanılır (Nakit/Kart/IBAN)

**Örnek Senaryo**:
```
Tarih: 1 Ocak - 10 Ocak
Kurye A'nın teslimatları:
  - 1 Ocak: 100₺
  - 5 Ocak: 150₺
  - 10 Ocak: 200₺
  TOPLAM: 450₺

Ödemeler:
  - 5 Ocak: 80₺ ödedi
  - 10 Ocak: 150₺ ödedi
  TOPLAM: 230₺

KALAN BORÇ = 450₺ - 230₺ = 220₺

Eğer admin 11-15 Ocak aralığını seçerse:
  - Görsel (Nakit/Kart/IBAN): 11-15 Ocak arası teslimatlar
  - Finansal (Kalan Borç): 1 Ocak'tan 15 Ocak'a kadar TÜM teslimatlar - TÜM ödemeler
```

#### 5.1.3 Tablo Etkileşimi

```
packages tablosu:
  - amount değeri ASLA değişmez
  - status değişiklikleri sadece durum takibi için
  - settled_at sadece bilgi amaçlı (finansal hesaplamada KULLANILMAZ)

courier_settlements tablosu:
  - Her ödeme kaydı buraya eklenir
  - Orijinal paket verileri DEĞİŞMEZ
  - amount_paid değeri pozitif olmalı
  - start_date ve end_date sadece bilgi amaçlı
```

#### 5.1.4 Ödeme Senaryoları

**1. Tam Ödeme**:
```
Kalan Borç: 500₺
Admin Girişi: 500₺
Sonuç: Kalan Borç = 0₺
```

**2. Eksik Ödeme**:
```
Kalan Borç: 500₺
Admin Girişi: 300₺
Sonuç: Kalan Borç = 200₺ (devam eder)
```

**3. Fazla Ödeme (Bahşiş)**:
```
Kalan Borç: 500₺
Admin Girişi: 600₺
Sonuç: Kalan Borç = 0₺ (100₺ bahşiş olarak kabul edilir)
```

**4. Negatif Borç Olmaz**:
```typescript
const remainingDebt = Math.max(0, totalOwed - totalPaid)
// Negatif değer asla döndürülmez
```

---

### 5.2 Bildirim Mimarisi

#### 5.2.1 Üç Farklı Bildirim Tipi

| Panel | Trigger | UI | Audio | DB Update |
|-------|---------|----|----|-----------|
| **Restoran** | `status='new_order'` + `restaurant_id` match | Sticky Popup | Loop (sürekli) | ✅ "Hazırlanıyor" butonu status günceller |
| **Admin** | `status='new_order'` (tüm restoranlar) | Sticky Popup | Loop (sürekli) | ❌ "Görüldü" butonu sadece UI |
| **Kurye** | `status='assigned'` + `courier_id` match | Native Notification | 4 saniye (tek) | ❌ Sadece bilgilendirme |

#### 5.2.2 Audio Yönetimi

**Context**: `src/contexts/NotificationContext.tsx`

**Özellikler**:
- Browser autoplay policy bypass
- Memory leak önleme
- Loop ve tek seferlik çalma desteği

**Kod**:
```typescript
// Looping audio (Restoran/Admin)
const loopingAudioRef = useRef<HTMLAudioElement>(null)
loopingAudioRef.current = new Audio('/notification.mp3')
loopingAudioRef.current.loop = true
loopingAudioRef.current.volume = 0.8

// Short audio (Kurye)
const shortAudioRef = useRef<HTMLAudioElement>(null)
shortAudioRef.current = new Audio('/notification.mp3')
shortAudioRef.current.loop = false
shortAudioRef.current.volume = 0.8

// 4 saniye sonra durdur
setTimeout(() => {
  shortAudioRef.current?.pause()
  shortAudioRef.current.currentTime = 0
}, 4000)
```

#### 5.2.3 Native Notification (Kurye)

**İzin İsteme**:
```typescript
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    return permission
  }
  return Notification.permission
}
```

**Bildirim Gösterme**:
```typescript
if (Notification.permission === 'granted') {
  new Notification('Yeni paketiniz var!', {
    body: `Müşteri Adresi: ${customerAddress}, Restoran Adresi: ${restaurantAddress}`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'mergen-kurye',
    requireInteraction: false,
    silent: false
  })
}
```

#### 5.2.4 Realtime Subscription (Bildirimler)

**Restoran**:
```typescript
supabase
  .channel('restaurant-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'packages',
    filter: `restaurant_id=eq.${restaurantId}`
  }, (payload) => {
    if (payload.new.status === 'new_order') {
      playLoopingAudio()
      showPopup(payload.new)
    }
  })
  .subscribe()
```

**Admin**:
```typescript
supabase
  .channel('admin-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'packages'
  }, (payload) => {
    if (payload.new.status === 'new_order') {
      playLoopingAudio()
      showPopup(payload.new)
    }
  })
  .subscribe()
```

**Kurye**:
```typescript
supabase
  .channel('courier-notifications')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'packages',
    filter: `courier_id=eq.${courierId}`
  }, (payload) => {
    if (payload.new.status === 'assigned' && payload.old.status !== 'assigned') {
      playShortAudio()
      showNativeNotification('Yeni paketiniz var!', `Müşteri: ${payload.new.customer_name}`)
    }
  })
  .subscribe()
```

---

## 6. REALTIME MİMARİ

### 6.1 Supabase Realtime Yapısı

**Teknoloji**: WebSocket (Phoenix Channels)  
**Port**: 443 (HTTPS üzerinden)  
**Protokol**: Phoenix Socket Protocol

### 6.2 Channel Yapısı

Her panel kendi channel'ını oluşturur:

```typescript
const channel = supabase
  .channel('unique-channel-name', {
    config: {
      broadcast: { self: false }, // Kendi değişikliklerini dinleme
      presence: { key: '' }
    }
  })
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'packages',
    filter: 'restaurant_id=eq.123' // Opsiyonel filtre
  }, (payload) => {
    // Değişiklik geldiğinde çalışır
    handleChange(payload)
  })
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })
```

### 6.3 Subscription Durumları

| Durum | Açıklama | Aksiyon |
|-------|----------|---------|
| `SUBSCRIBED` | Bağlantı başarılı | ✅ Normal çalışma |
| `CHANNEL_ERROR` | Kanal hatası | 🔄 3 saniye sonra yeniden bağlan |
| `TIMED_OUT` | Zaman aşımı | 🔄 3 saniye sonra yeniden bağlan |
| `CLOSED` | Bağlantı kapandı | 🔄 3 saniye sonra yeniden bağlan |

### 6.4 Yeniden Bağlanma Mekanizması

**Kod Örneği**:
```typescript
const setupRealtimeWithRetry = async (retryCount = 0) => {
  try {
    const channel = supabase.channel('my-channel')
      .on('postgres_changes', { ... }, callback)
    
    const status = await new Promise<string>((resolve) => {
      channel.subscribe((status) => resolve(status))
    })

    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime bağlandı')
      return channel
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('⚠️ Bağlantı hatası, yeniden bağlanılıyor...')
      
      setTimeout(() => {
        setupRealtimeWithRetry(retryCount + 1)
      }, 3000)
    }
  } catch (error) {
    console.error('❌ Realtime hatası:', error)
    
    if (retryCount < 10) {
      setTimeout(() => {
        setupRealtimeWithRetry(retryCount + 1)
      }, 3000)
    }
  }
}
```

### 6.5 Polling Fallback

Realtime çalışmazsa, 30 saniyelik polling:

```typescript
const refreshInterval = setInterval(() => {
  fetchPackages()
  fetchCouriers()
  fetchRestaurants()
}, 30000)
```

### 6.6 Anti-Loop Mekanizması

**Sorun**: Admin bir paketi güncellediğinde, Realtime event tetiklenir ve sonsuz döngü oluşabilir.

**Çözüm**: Son işlem zamanını takip et

```typescript
const lastAdminActionTimeRef = useRef(0)
const ANTI_LOOP_DELAY = 2000 // 2 saniye

const handlePackageChange = async (payload) => {
  const now = Date.now()
  
  if (now - lastAdminActionTimeRef.current < ANTI_LOOP_DELAY) {
    console.log('🔒 Anti-Loop: Admin işlemi, Realtime atlandı')
    return
  }
  
  await fetchPackages()
}

// Admin işlem yaparken
const updatePackage = async () => {
  lastAdminActionTimeRef.current = Date.now()
  await supabase.from('packages').update(...)
}
```

---

## 7. BİLDİRİM SİSTEMİ MİMARİSİ

### 7.1 Mimari Diyagram

```
┌─────────────────────────────────────────────────────────────┐
│                  NotificationContext                         │
│  - Audio yönetimi (loop & short)                            │
│  - Native notification API                                   │
│  - Permission yönetimi                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Restoran     │  │    Admin      │  │    Kurye      │
│  Wrapper      │  │   Wrapper     │  │   Wrapper     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Restoran     │  │    Admin      │  │    Kurye      │
│  Hook         │  │    Hook       │  │    Hook       │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        ↓                   ↓                   ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Restoran     │  │    Admin      │  │   Native      │
│  Popup        │  │    Popup      │  │   Notification│
└───────────────┘  └───────────────┘  └───────────────┘
```

### 7.2 Bileşen Hiyerarşisi

**1. NotificationContext** (`src/contexts/NotificationContext.tsx`)
- Audio instance'ları yönetir
- Native notification API'sini sağlar
- Tüm uygulamayı sarar

**2. Wrapper Bileşenleri**
- `RestaurantNotificationWrapper.tsx`
- `AdminNotificationWrapper.tsx`
- `CourierNotificationWrapper.tsx`
- İlgili hook'u çağırır ve popup'ı render eder

**3. Hook'lar**
- `useRestaurantNotifications.ts`
- `useAdminNotifications.ts`
- `useCourierNotifications.ts`
- Realtime subscription'ı yönetir
- Bildirim mantığını içerir

**4. Popup Bileşenleri**
- `RestaurantOrderPopup.tsx`
- `AdminOrderPopup.tsx`
- Sipariş bilgilerini gösterir
- Aksiyon butonları içerir

### 7.3 Bildirim Akışı (Restoran Örneği)

```
1. Yeni sipariş oluşturulur (packages tablosuna INSERT)
   ↓
2. Supabase Realtime event tetiklenir
   ↓
3. useRestaurantNotifications hook event'i yakalar
   ↓
4. Hook kontrol eder:
   - status === 'new_order' mi?
   - restaurant_id eşleşiyor mu?
   ↓
5. Eşleşme varsa:
   - playLoopingAudio() çağrılır
   - setActiveOrder(order) ile popup gösterilir
   ↓
6. Restoran "Hazırlanıyor" butonuna basar
   ↓
7. stopLoopingAudio() çağrılır
   ↓
8. Veritabanı güncellenir (status = 'getting_ready')
   ↓
9. Popup kapanır
```

### 7.4 Browser Autoplay Policy Bypass

**Sorun**: Modern tarayıcılar kullanıcı etkileşimi olmadan audio çalmayı engeller.

**Çözüm**: İlk kullanıcı etkileşiminde audio'yu initialize et

```typescript
// İlk tıklamada audio'yu hazırla
const initializeAudio = () => {
  if (loopingAudioRef.current) {
    loopingAudioRef.current.play().then(() => {
      loopingAudioRef.current.pause()
      loopingAudioRef.current.currentTime = 0
      setIsAudioReady(true)
    })
  }
}

// Herhangi bir butona tıklandığında
<button onClick={initializeAudio}>...</button>
```

---

## 8. GÜVENLİK VE YETKİLENDİRME

### 8.1 Supabase Auth

**Kimlik Doğrulama**: JWT (JSON Web Token) tabanlı

**Kullanıcı Tipleri**:
- `admin`: Tüm yetkilere sahip
- `courier`: Sadece kendi siparişlerini görebilir
- `restaurant`: Sadece kendi restoranının siparişlerini görebilir

### 8.2 Row Level Security (RLS)

**Örnek Policy (packages tablosu)**:
```sql
-- Kuryeler sadece kendi siparişlerini görebilir
CREATE POLICY "Couriers can view their own packages"
ON packages FOR SELECT
USING (auth.uid() = courier_id);

-- Restoranlar sadece kendi siparişlerini görebilir
CREATE POLICY "Restaurants can view their own packages"
ON packages FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM restaurants WHERE id = packages.restaurant_id
));

-- Admin her şeyi görebilir
CREATE POLICY "Admins can view all packages"
ON packages FOR SELECT
USING (auth.jwt() ->> 'role' = 'admin');
```

### 8.3 API Güvenliği

**Environment Variables**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Anon Key**: Public key, RLS ile korunur  
**Service Role Key**: Backend işlemleri için (Vercel'de saklanır)

### 8.4 CORS ve CSP

**CORS**: Supabase otomatik olarak yönetir  
**CSP**: Next.js headers ile yapılandırılır

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
          }
        ]
      }
    ]
  }
}
```

---

## 9. PERFORMANS OPTİMİZASYONU

### 9.1 React Optimizasyonları

**useCallback**: Fonksiyonları memoize et
```typescript
const fetchPackages = useCallback(async () => {
  // ...
}, [dependencies])
```

**useMemo**: Hesaplamaları cache'le
```typescript
const filteredPackages = useMemo(() => {
  return packages.filter(p => p.status === 'ready')
}, [packages])
```

**React.memo**: Component'leri memoize et
```typescript
export default React.memo(KanbanBoard)
```

### 9.2 Veritabanı Optimizasyonları

**İndeksler**:
```sql
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_courier_id ON packages(courier_id);
CREATE INDEX idx_packages_restaurant_id ON packages(restaurant_id);
CREATE INDEX idx_packages_created_at ON packages(created_at);
```

**Sadece Gerekli Sütunları Çek**:
```typescript
// ❌ Kötü
const { data } = await supabase.from('packages').select('*')

// ✅ İyi
const { data } = await supabase
  .from('packages')
  .select('id, customer_name, amount, status')
```

### 9.3 Realtime Optimizasyonları

**Filtreler Kullan**:
```typescript
// ❌ Kötü: Tüm değişiklikleri dinle
.on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, ...)

// ✅ İyi: Sadece ilgili değişiklikleri dinle
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'packages',
  filter: `restaurant_id=eq.${restaurantId}`
}, ...)
```

---

## 10. DEPLOYMENT VE CI/CD

### 10.1 Vercel Deployment

**Otomatik Deployment**:
- `main` branch'e push → Production deployment
- Pull request → Preview deployment

**Build Komutu**:
```bash
npm run build
```

**Environment Variables** (Vercel Dashboard):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 10.2 Mobil App Build

**Android**:
```bash
# Capacitor sync
npx cap sync android

# Android Studio'da aç
npx cap open android

# Build
./gradlew assembleRelease
```

**iOS**:
```bash
# Capacitor sync
npx cap sync ios

# Xcode'da aç
npx cap open ios

# Build (Xcode'da)
```

---

## 11. HATA YÖNETİMİ VE LOGGING

### 11.1 Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo)
    // Sentry'ye gönder (opsiyonel)
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Bir hata oluştu</div>
    }
    return this.props.children
  }
}
```

### 11.2 Retry Logic

```typescript
// src/utils/retry.ts
export async function retryWithBackoff(
  fn: () => Promise<any>,
  options: {
    maxAttempts: number
    initialDelay: number
    onRetry?: (attempt: number, error: Error) => void
  }
) {
  let lastError: Error
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < options.maxAttempts) {
        options.onRetry?.(attempt, lastError)
        await new Promise(resolve => 
          setTimeout(resolve, options.initialDelay * attempt)
        )
      }
    }
  }
  
  throw lastError
}
```

### 11.3 Logging Stratejisi

**Development**:
```typescript
console.log('✅ Success:', data)
console.warn('⚠️ Warning:', warning)
console.error('❌ Error:', error)
```

**Production**:
- Console log'lar otomatik temizlenir (Vercel)
- Kritik hatalar Sentry'ye gönderilir (opsiyonel)

---

## 12. GELECEKTEKİ GELİŞTİRMELER

### 12.1 Planlanan Özellikler

1. **Müşteri Paneli**
   - Sipariş takibi
   - Restoran menüsü
   - Sepet sistemi
   - Ödeme entegrasyonu

2. **Analytics Dashboard**
   - Günlük/haftalık/aylık raporlar
   - Kurye performans analizi
   - Restoran satış analizi

3. **WhatsApp Entegrasyonu**
   - Sipariş bildirimleri
   - Durum güncellemeleri

4. **Ödeme Entegrasyonu**
   - İyzico/PayTR
   - Online ödeme

5. **Multi-tenant Sistem**
   - Farklı şehirler için ayrı instance'lar
   - Merkezi yönetim paneli

### 12.2 Teknik Borç

1. **Test Coverage**
   - Unit testler (Jest)
   - Integration testler (Cypress)
   - E2E testler

2. **TypeScript Strict Mode**
   - Tüm `any` kullanımlarını kaldır
   - Strict null checks

3. **Performance Monitoring**
   - Lighthouse CI
   - Web Vitals tracking

---

## 13. SONUÇ

Mergen Kurye sistemi, modern web teknolojileri kullanılarak geliştirilmiş, ölçeklenebilir ve güvenilir bir kurye yönetim platformudur. 

**Temel Güçlü Yönler**:
- ✅ Realtime veri senkronizasyonu
- ✅ Panel-bazlı bildirim sistemi
- ✅ Cari hesap mantığı ile finansal takip
- ✅ Hibrit web-mobil mimari
- ✅ Type-safe kod yapısı
- ✅ Otomatik yeniden bağlanma mekanizmaları

**Kritik İş Kuralları**:
- 📌 Orijinal paket fiyatları ASLA değişmez
- 📌 Finansal hesaplamalar `courier_settlements` tablosuna dayanır
- 📌 Kalan borç = MAX(0, Toplam Teslimat - Toplam Ödeme)
- 📌 `startDate` sadece görsel istatistikler için kullanılır
- 📌 Bildirim sistemi panel-bazlı farklı davranışlar sergiler

---

**Dokümantasyon Sonu**

> Bu dokümantasyon, sistemin mevcut durumunu (16 Nisan 2026 itibariyle) yansıtmaktadır.  
> Gelecekteki değişiklikler bu dokümana eklenmelidir.

