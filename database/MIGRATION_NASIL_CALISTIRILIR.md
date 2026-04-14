# 🚀 Migration Nasıl Çalıştırılır?

## Seçenek 1: Basit Versiyon (Önerilen)

### Dosya: `add_address_columns_simple.sql`

1. Supabase Dashboard → SQL Editor
2. Dosya içeriğini kopyala-yapıştır
3. Run (Ctrl+Enter)
4. Bitti! ✅

## Seçenek 2: Adım Adım (En Güvenli)

### Dosya: `MIGRATION_STEP_BY_STEP.sql`

Her satırı tek tek çalıştır:

```sql
-- 1. district ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district VARCHAR(100);

-- 2. neighborhood ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);

-- 3. street_address ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_address VARCHAR(255);

-- 4. floor ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS floor VARCHAR(10);

-- 5. door_number ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS door_number VARCHAR(10);

-- 6. İndeksler
CREATE INDEX IF NOT EXISTS idx_customers_district ON customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_neighborhood ON customers(neighborhood);
```

## Seçenek 3: Tek Komut

Supabase SQL Editor'de:

```sql
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS street_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS floor VARCHAR(10),
ADD COLUMN IF NOT EXISTS door_number VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_customers_district ON customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_neighborhood ON customers(neighborhood);
```

## ✅ Kontrol

Migration sonrası kontrol et:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('district', 'neighborhood', 'street_address', 'floor', 'door_number');
```

**Beklenen Sonuç:**
```
district        | character varying
door_number     | character varying
floor           | character varying
neighborhood    | character varying
street_address  | character varying
```

## 🎯 Hata Alırsan

### Hata: "column already exists"
**Çözüm:** Normal, sütun zaten var. Devam et.

### Hata: "syntax error"
**Çözüm:** Tek tek çalıştır (Seçenek 2)

### Hata: "permission denied"
**Çözüm:** Supabase Dashboard'dan çalıştır (SQL Editor)

## 🚀 Sonrası

Migration başarılı olduktan sonra:

1. Kodu deploy et
2. Uygulamayı test et
3. Adres kaydetmeyi dene
4. Artık hata vermeyecek! ✅

**Play Store'a hazır! 🎯**
