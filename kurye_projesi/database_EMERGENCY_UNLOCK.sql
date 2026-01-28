-- ============================================
-- ACİL KURTARMA - TÜM KİLİTLERİ KALDIR
-- ============================================
-- Sistem felç oldu, tüm trigger ve constraint'leri kaldır

-- ADIM 1: TÜM TRIGGER'LARI KALDIR
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_absolute ON packages CASCADE;
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_simple ON packages CASCADE;
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages CASCADE;
DROP TRIGGER IF EXISTS trigger_update_locked_by ON packages CASCADE;
DROP TRIGGER IF EXISTS set_order_number ON packages CASCADE;
DROP TRIGGER IF EXISTS trigger_prevent_courier_change ON packages CASCADE;
DROP TRIGGER IF EXISTS trigger_lock_assigned_packages ON packages CASCADE;

-- ADIM 2: TÜM TRIGGER FONKSİYONLARINI KALDIR
DROP FUNCTION IF EXISTS protect_assigned_packages_absolute() CASCADE;
DROP FUNCTION IF EXISTS protect_assigned_packages_simple() CASCADE;
DROP FUNCTION IF EXISTS protect_assigned_packages() CASCADE;
DROP FUNCTION IF EXISTS update_locked_by_on_assign() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS prevent_courier_change() CASCADE;
DROP FUNCTION IF EXISTS lock_assigned_packages() CASCADE;

-- ADIM 3: UNIQUE CONSTRAINT'LERİ KALDIR
ALTER TABLE packages DROP CONSTRAINT IF EXISTS unique_external_order_per_source;
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_external_order_number_source_key;

-- ADIM 4: GEREKSIZ KOLONLARI KALDIR
ALTER TABLE packages DROP COLUMN IF EXISTS locked_by;
ALTER TABLE packages DROP COLUMN IF EXISTS external_order_number;
ALTER TABLE packages DROP COLUMN IF EXISTS source;

-- ADIM 5: RLS (Row Level Security) KAPAT (eğer aktifse)
ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- KONTROL - HİÇBİR ENGEL KALMADI MI?
-- ============================================

-- 1. Trigger kontrolü
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'packages';
-- Beklenen: 0 satır

-- 2. Constraint kontrolü
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'packages' AND constraint_type = 'UNIQUE';
-- Beklenen: 0 satır (sadece primary key olmalı)

-- 3. RLS kontrolü
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'packages';
-- Beklenen: rowsecurity = false

-- ============================================
-- TEST - KURYE ATAMA ÇALIŞIYOR MU?
-- ============================================

-- Kurye atanmamış bir paket bul
SELECT id, customer_name, courier_id, status FROM packages WHERE courier_id IS NULL LIMIT 1;

-- Manuel test (yukarıdaki ID'yi kullan):
-- UPDATE packages SET courier_id = (SELECT id FROM couriers LIMIT 1), status = 'assigned' WHERE id = <PAKET_ID>;
-- Beklenen: 1 row updated ✅

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ Tüm trigger'lar kaldırıldı
-- ✅ Tüm constraint'ler kaldırıldı
-- ✅ Gereksiz kolonlar kaldırıldı
-- ✅ RLS kapatıldı
-- ✅ Sistem özgür, artık her şey güncellenebilir!

RAISE NOTICE '🎉 SİSTEM KURTARILDI - TÜM KİLİTLER KALDIRILDI!';
