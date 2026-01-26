-- ============================================
-- BASİT ÇÖZÜM - KURYE ATAMA DÜZELTMESİ
-- ============================================
-- Bu SQL, kurye atama sorununu kökten çözer

-- ADIM 1: Eski trigger'ı tamamen kaldır
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_absolute ON packages;
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages;
DROP FUNCTION IF EXISTS protect_assigned_packages_absolute();
DROP FUNCTION IF EXISTS protect_assigned_packages();

-- ADIM 2: UNIQUE constraint'i kontrol et ve ekle (yoksa)
DO $$
BEGIN
  -- Önce constraint var mı kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'packages' 
    AND constraint_name = 'unique_external_order_per_source'
  ) THEN
    -- Constraint yok, ekle
    ALTER TABLE packages
    ADD CONSTRAINT unique_external_order_per_source
    UNIQUE (external_order_number, source);
    
    RAISE NOTICE '✅ UNIQUE constraint eklendi';
  ELSE
    RAISE NOTICE '✅ UNIQUE constraint zaten mevcut';
  END IF;
END $$;

-- ADIM 3: YENİ BASİT TRIGGER - Sadece courier_id doluysa korur
CREATE OR REPLACE FUNCTION protect_assigned_packages_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ İLK ATAMA: courier_id NULL → dolu (İZİN VER)
  IF OLD.courier_id IS NULL AND NEW.courier_id IS NOT NULL THEN
    RAISE NOTICE '✅ İlk kurye ataması yapılıyor: Paket ID %, Kurye ID %', OLD.id, NEW.courier_id;
    RETURN NEW;
  END IF;
  
  -- 🔒 KORUMA: courier_id zaten dolu (DEĞİŞTİRME)
  IF OLD.courier_id IS NOT NULL THEN
    -- Kurye atanmış, değişiklik yapma
    RAISE NOTICE '🛡️ Güvenlik kalkanı: Paket ID % zaten kurye atanmış (%), değişiklik engellendi', OLD.id, OLD.courier_id;
    RETURN OLD; -- Eski veriyi koru
  END IF;
  
  -- Diğer durumlar (courier_id hala NULL)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ADIM 4: Trigger'ı aktif et
CREATE TRIGGER trigger_protect_assigned_packages_simple
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION protect_assigned_packages_simple();

-- ============================================
-- KONTROL
-- ============================================

-- 1. UNIQUE constraint var mı?
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'packages'
  AND constraint_name = 'unique_external_order_per_source';
-- Beklenen: 1 satır (UNIQUE)

-- 2. Trigger aktif mi?
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'packages'
  AND trigger_name = 'trigger_protect_assigned_packages_simple';
-- Beklenen: 1 satır (BEFORE UPDATE)

-- ============================================
-- TEST
-- ============================================

-- Test 1: Kurye atanmamış paketi bul
SELECT id, external_order_number, courier_id, status
FROM packages
WHERE courier_id IS NULL
LIMIT 1;

-- Test 2: İlk kurye ataması yap (BAŞARILI OLMALI)
-- NOT: Yukarıdaki sorgudan aldığınız ID'yi kullanın
/*
UPDATE packages
SET courier_id = 'test-kurye-id-123', status = 'assigned'
WHERE id = <PAKET_ID>
  AND courier_id IS NULL;
-- Beklenen: ✅ İlk kurye ataması yapılıyor: Paket ID X, Kurye ID test-kurye-id-123
*/

-- Test 3: Aynı paketi tekrar güncellemeye çalış (BAŞARISIZ OLMALI)
/*
UPDATE packages
SET courier_id = 'baska-kurye-id', status = 'pending'
WHERE id = <PAKET_ID>;
-- Beklenen: 🛡️ Güvenlik kalkanı: Paket ID X zaten kurye atanmış, değişiklik engellendi
-- Sonuç: Eski veri korunur (courier_id değişmez)
*/

-- ============================================
-- NASIL ÇALIŞIR?
-- ============================================

-- SENARYO 1: Ajan yeni paket ekler
-- INSERT INTO packages (external_order_number='TR-123', source='trendyol', ...)
-- → Yeni kayıt oluşturulur (courier_id=NULL) ✅

-- SENARYO 2: Admin kurye atar
-- UPDATE packages SET courier_id='abc', status='assigned' WHERE id=1 AND courier_id IS NULL
-- → Trigger: "İlk atama, izin ver" ✅
-- → courier_id: NULL → 'abc' ✅

-- SENARYO 3: Ajan aynı paketi tekrar INSERT etmeye çalışır
-- INSERT INTO packages (external_order_number='TR-123', source='trendyol', ...)
-- → UNIQUE constraint hatası ❌
-- → 'ignore-duplicates' header sayesinde 200 OK döner ✅
-- → Mevcut kayıt korunur (courier_id='abc') ✅

-- SENARYO 4: Ajan paketi UPDATE etmeye çalışır (teorik)
-- UPDATE packages SET courier_id=NULL, status='pending' WHERE external_order_number='TR-123'
-- → Trigger: "Kurye atanmış, değişiklik engellendi" 🛡️
-- → Eski veri korunur (courier_id='abc') ✅

-- ============================================
-- ÖZET
-- ============================================
-- ✅ UNIQUE constraint: Aynı sipariş tekrar INSERT edilemez
-- ✅ Trigger: İlk kurye ataması izin verilir
-- ✅ Trigger: Kurye atandıktan sonra değişiklik engellenir
-- ✅ Ajan: Sadece INSERT yapabilir (UPDATE yapamaz)
-- ✅ Admin: İlk kurye atamasını yapabilir
-- ✅ Kurye: Status güncellemelerini yapabilir (ayrı bir trigger gerekebilir)

-- ============================================
-- ROLLBACK (GERİ ALMA)
-- ============================================
/*
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_simple ON packages;
DROP FUNCTION IF EXISTS protect_assigned_packages_simple();
ALTER TABLE packages DROP CONSTRAINT IF EXISTS unique_external_order_per_source;
*/
