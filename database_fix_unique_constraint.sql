-- ============================================
-- UNIQUE CONSTRAINT - DUPLICATE ENGELLEME
-- ============================================
-- Bu constraint, aynı siparişin birden fazla kez eklenmesini engeller

-- ADIM 1: Mevcut duplicate kayıtları temizle (opsiyonel)
-- NOT: Bu adımı çalıştırmadan önce yedek alın!
/*
DELETE FROM packages a
USING packages b
WHERE a.id > b.id
  AND a.external_order_number = b.external_order_number
  AND a.source = b.source;
*/

-- ADIM 2: UNIQUE constraint ekle
-- Bu constraint, aynı external_order_number + source kombinasyonunun tekrar eklenmesini engeller
ALTER TABLE packages
ADD CONSTRAINT unique_external_order_per_source
UNIQUE (external_order_number, source);

-- ADIM 3: Kontrol et
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'packages'
  AND constraint_name = 'unique_external_order_per_source';

-- Beklenen sonuç: 1 satır (constraint aktif)

-- ============================================
-- TEST
-- ============================================

-- Test 1: Aynı siparişi tekrar eklemeye çalış (BAŞARISIZ OLMALI)
/*
INSERT INTO packages (
  external_order_number,
  source,
  customer_name,
  delivery_address,
  amount,
  status
) VALUES (
  'TEST-12345',
  'trendyol',
  'Test Müşteri',
  'Test Adres',
  100,
  'pending'
);

-- İkinci kez aynı siparişi ekle (HATA VERMELI)
INSERT INTO packages (
  external_order_number,
  source,
  customer_name,
  delivery_address,
  amount,
  status
) VALUES (
  'TEST-12345',
  'trendyol',
  'Test Müşteri 2',
  'Test Adres 2',
  200,
  'pending'
);

-- Beklenen: ERROR: duplicate key value violates unique constraint "unique_external_order_per_source"
*/

-- ============================================
-- ROLLBACK (GERİ ALMA)
-- ============================================
-- Eğer constraint'i kaldırmak isterseniz:
/*
ALTER TABLE packages
DROP CONSTRAINT IF EXISTS unique_external_order_per_source;
*/

-- ============================================
-- NOTLAR
-- ============================================
-- 1. Bu constraint, aynı external_order_number + source kombinasyonunun tekrar eklenmesini engeller
-- 2. Ajan INSERT yaparken duplicate hatası alır ve mevcut kayda dokunmaz
-- 3. Supabase API'de 'Prefer: resolution=ignore-duplicates' header'ı ile birlikte çalışır
-- 4. Constraint, veritabanı seviyesinde çalışır (API bypass edilemez)

-- ============================================
-- AJAN TARAFINDA NASIL ÇALIŞIR?
-- ============================================
-- Ajan INSERT yapar:
-- POST /packages
-- Header: 'Prefer': 'resolution=ignore-duplicates,return=minimal'
-- Body: { external_order_number: 'TR-12345', source: 'trendyol', ... }

-- Eğer sipariş zaten varsa:
-- - Constraint hatası alır
-- - 'ignore-duplicates' header sayesinde hata yerine 200 OK döner
-- - Mevcut kayıt korunur
-- - Ajan hiçbir şey yapmaz

-- ============================================
-- AVANTAJLAR
-- ============================================
-- ✅ Aynı sipariş birden fazla kez eklenemez
-- ✅ Ajan INSERT yapabilir ama UPDATE yapamaz
-- ✅ Kurye atanmış paketler korunur
-- ✅ Veritabanı seviyesinde koruma
-- ✅ API bypass edilemez
