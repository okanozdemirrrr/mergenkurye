# ⏰ ZAMAN DAMGALARI KURULUM REHBERİ

## 🎯 AMAÇ
Paket takip sisteminde tüm önemli zamanları kaydetmek için gerekli veritabanı sütunlarını eklemek.

## 📋 ZAMAN DAMGALARI

| Sütun | Ne Zaman Set Edilir | Kim Tarafından |
|-------|---------------------|----------------|
| `created_at` | Sipariş oluşturulduğunda | Supabase (otomatik) |
| `assigned_at` | Kurye atandığında | Admin |
| `picked_up_at` | Restorandan alındığında | Kurye ("Teslim Aldım" butonu) |
| `delivered_at` | Müşteriye teslim edildiğinde | Kurye ("Teslim Ettim" butonu) |

## 🚀 KURULUM ADIMLARI

### Adım 1: Supabase SQL Editor'ü Aç
1. Supabase Dashboard'a git
2. Sol menüden **SQL Editor**'ü seç
3. **New Query** butonuna tıkla

### Adım 2: Migration SQL'ini Çalıştır
Aşağıdaki dosyadaki SQL kodunu kopyala ve çalıştır:

📄 **Dosya:** `database_migration_add_all_timestamps.sql`

```sql
-- packages tablosuna tüm zaman damgası sütunlarını ekle

-- 1. assigned_at - Admin kurye atadığında
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.assigned_at IS 'Kurye atandığı zaman (admin tarafından)';

-- 2. picked_up_at - Kurye restorandan paketi aldığında
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.picked_up_at IS 'Kurye paketi restorandan aldığı zaman';

-- 3. delivered_at - Kurye müşteriye teslim ettiğinde
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.delivered_at IS 'Paketin müşteriye teslim edildiği zaman';

-- Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_assigned_at ON packages(assigned_at);
CREATE INDEX IF NOT EXISTS idx_packages_picked_up_at ON packages(picked_up_at);
CREATE INDEX IF NOT EXISTS idx_packages_delivered_at ON packages(delivered_at);

-- Mevcut delivered paketler için delivered_at'ı created_at'tan kopyala
UPDATE packages 
SET delivered_at = created_at 
WHERE status = 'delivered' AND delivered_at IS NULL;
```

### Adım 3: Çalıştır
**RUN** butonuna tıkla veya `Ctrl+Enter` / `Cmd+Enter` tuşlarına bas.

### Adım 4: Doğrula
Başarılı mesajı görmelisin:
```
Success. No rows returned
```

## ✅ DOĞRULAMA

Sütunların eklendiğini kontrol et:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'packages'
AND column_name IN ('assigned_at', 'picked_up_at', 'delivered_at')
ORDER BY column_name;
```

Beklenen sonuç:
```
assigned_at   | timestamp with time zone | YES
delivered_at  | timestamp with time zone | YES
picked_up_at  | timestamp with time zone | YES
```

## 🔄 MEVCUT VERİLER

Migration, mevcut `delivered` statüsündeki paketler için `delivered_at` alanını `created_at` ile doldurur. Bu geçici bir çözümdür. Yeni teslimatlarda gerçek teslim zamanı kaydedilecektir.

## 📊 KULLANIM ÖRNEĞİ

Bir paketin zaman çizelgesi:

```
1. created_at:   2026-01-23 10:00:00  (Restoran sipariş oluşturdu)
2. assigned_at:  2026-01-23 10:05:00  (Admin kurye atadı)
3. picked_up_at: 2026-01-23 10:15:00  (Kurye restorandan aldı)
4. delivered_at: 2026-01-23 10:30:00  (Kurye müşteriye teslim etti)
```

## 🎉 TAMAMLANDI!

Artık sistem tüm önemli zamanları kaydedecek ve kurye panelinde doğru saatleri gösterecek.

## 🐛 SORUN GİDERME

**Hata: "column already exists"**
- Sorun yok! `IF NOT EXISTS` kullandık, zaten varsa atlanır.

**Hata: "permission denied"**
- Supabase'de yeterli yetkiye sahip olduğunuzdan emin olun.
- Project owner veya admin olmalısınız.

**Sütunlar görünmüyor**
- Tarayıcıyı yenileyin
- Supabase Table Editor'de packages tablosunu kontrol edin
