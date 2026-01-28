# 🔧 Restoran Tablosu 400 Hatası - Çözüm

## ❌ Sorun
Restoran listesi çekilirken 400 hatası alınıyor.

**Sebep:** `restaurants` tablosunda `maps_link` ve `delivery_fee` kolonları yok.

**Sorgu:**
```typescript
const { data, error } = await supabase
  .from('restaurants')
  .select('id, name, maps_link, delivery_fee')  // ❌ Bu kolonlar yok
  .order('name', { ascending: true })
```

---

## ✅ Çözüm 1: Kolonları Ekle (ÖNERİLEN)

### SQL Komutları

Supabase SQL Editor'de çalıştır:

```sql
-- 1. maps_link kolonu ekle (Google Maps linki için)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS maps_link TEXT;

-- 2. delivery_fee kolonu ekle (Teslimat ücreti için)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 100;

-- 3. Mevcut kayıtlar için varsayılan değer ata
UPDATE restaurants 
SET delivery_fee = 100 
WHERE delivery_fee IS NULL;
```

### Kontrol Sorgusu
```sql
-- Kolonların eklendiğini doğrula
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
  AND column_name IN ('maps_link', 'delivery_fee')
ORDER BY column_name;
```

### Test Sorgusu
```sql
-- Restoranları listele
SELECT id, name, maps_link, delivery_fee 
FROM restaurants 
ORDER BY name;
```

**Avantajları:**
- ✅ Google Maps entegrasyonu için hazır
- ✅ Restoran bazlı teslimat ücreti
- ✅ Gelecekte kullanılabilir

---

## ✅ Çözüm 2: Sorguyu Sadeleştir (GEÇİCİ)

Eğer bu kolonları şimdi eklemek istemiyorsan, sorguyu sadece mevcut kolonlarla çalışacak şekilde güncelle:

### Kod Değişikliği

**Dosya:** `src/app/restoran/page.tsx`

```typescript
// ÖNCE (Hatalı):
const { data, error } = await supabase
  .from('restaurants')
  .select('id, name, maps_link, delivery_fee')
  .order('name', { ascending: true })

// SONRA (Düzeltilmiş):
const { data, error } = await supabase
  .from('restaurants')
  .select('id, name, password')  // Sadece mevcut kolonlar
  .order('name', { ascending: true })
```

**Interface Güncellemesi:**

```typescript
interface Restaurant {
  id: string
  name: string
  password?: string
  // maps_link?: string      // ❌ Kaldır
  // delivery_fee?: number   // ❌ Kaldır
}
```

**Etkilenen Fonksiyonlar:**

1. `handleCustomerSatisfaction()` - Google Maps yönlendirmesi çalışmayacak
2. Teslimat ücreti her zaman 100₺ olacak (sabit kodlanmış)

**Dezavantajları:**
- ❌ Google Maps entegrasyonu çalışmaz
- ❌ Restoran bazlı teslimat ücreti olmaz
- ❌ Gelecekte yine eklemen gerekecek

---

## 🎯 Önerilen Çözüm

**Çözüm 1'i kullan** (Kolonları ekle)

Sebepleri:
1. Kodda zaten bu kolonlar kullanılıyor
2. Google Maps entegrasyonu için gerekli
3. Restoran bazlı teslimat ücreti için gerekli
4. Bir kere ekle, sonsuza kadar kullan

---

## 📋 Adım Adım Uygulama

### 1. Supabase Dashboard'a Git
```
https://supabase.com/dashboard
```

### 2. Projeyi Seç
Kurye projeni seç

### 3. SQL Editor'ü Aç
Sol menüden "SQL Editor" tıkla

### 4. SQL Komutunu Yapıştır
```sql
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS maps_link TEXT;

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 100;

UPDATE restaurants 
SET delivery_fee = 100 
WHERE delivery_fee IS NULL;
```

### 5. "Run" Butonuna Tıkla
Komut çalışacak

### 6. Kontrol Et
```sql
SELECT id, name, maps_link, delivery_fee 
FROM restaurants 
ORDER BY name;
```

### 7. Uygulamayı Test Et
```
http://localhost:3000/restoran
```

Giriş yap → 400 hatası gitmeli ✅

---

## 🔍 Hata Ayıklama

### Hala 400 Alıyorsan:

**1. Konsol'u Kontrol Et (F12):**
```javascript
// Tam hata mesajını göreceksin
⚠️ Restoranlar yüklenirken hata (sessiz): ...
```

**2. Supabase'de Kolonları Kontrol Et:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'restaurants';
```

**3. RLS (Row Level Security) Kontrol Et:**
```sql
-- RLS politikalarını kontrol et
SELECT * FROM pg_policies 
WHERE tablename = 'restaurants';
```

Eğer RLS aktifse ve politika yoksa:
```sql
-- Geçici olarak RLS'yi kapat (test için)
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;

-- VEYA politika ekle
CREATE POLICY "Herkes okuyabilir" 
ON restaurants FOR SELECT 
USING (true);
```

---

## ✅ Sonuç

**Önerilen:** SQL komutlarını çalıştır ve kolonları ekle.

**Dosya:** `database_add_restaurant_columns.sql` (hazır SQL komutları)

**Terminale:** merkez üssü nizamî ✅
