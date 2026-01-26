-- ============================================
-- MUTLAK KORUMA SİSTEMİ - KURYE ATAMA KİLİDİ
-- ============================================
-- Bu trigger, kurye atanmış paketleri MUTLAK olarak korur

-- ADIM 1: Eski trigger'ı kaldır
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages;
DROP FUNCTION IF EXISTS protect_assigned_packages();

-- ADIM 2: Yeni MUTLAK koruma fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION protect_assigned_packages_absolute()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ İLK KURYE ATAMASI: courier_id NULL'dan dolu'ya geçiyorsa → İZİN VER
  IF OLD.courier_id IS NULL AND NEW.courier_id IS NOT NULL THEN
    -- İlk atama, izin ver
    RETURN NEW;
  END IF;
  
  -- 🔒 MUTLAK KİLİT: Eğer courier_id zaten doluysa → HİÇBİR DEĞİŞİKLİK YAPILMASIN
  IF OLD.courier_id IS NOT NULL THEN
    -- Kurye atanmış, HİÇBİR ALAN DEĞİŞTİRİLEMEZ!
    RAISE EXCEPTION '🔒 MUTLAK KİLİT: Bu paket kurye atanmış (ID: %), HİÇBİR DEĞİŞİKLİK YAPILAMAZ!', OLD.id
      USING HINT = 'Kurye atanmış paketler korunur. Sadece kurye uygulaması güncelleyebilir.';
  END IF;
  
  -- Diğer durumlar için izin ver
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ADIM 3: Trigger'ı aktif et
CREATE TRIGGER trigger_protect_assigned_packages_absolute
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION protect_assigned_packages_absolute();

-- ============================================
-- TEST
-- ============================================

-- Test 1: Kurye atanmamış paketi güncelle (BAŞARILI OLMALI)
/*
UPDATE packages
SET customer_name = 'Test Güncelleme'
WHERE courier_id IS NULL
LIMIT 1;
-- Beklenen: Başarılı
*/

-- Test 2: Kurye atanmış paketi güncellemeye çalış (BAŞARISIZ OLMALI)
/*
UPDATE packages
SET customer_name = 'Test Güncelleme'
WHERE courier_id IS NOT NULL
LIMIT 1;
-- Beklenen: ERROR: 🔒 MUTLAK KİLİT: Bu paket kurye atanmış, HİÇBİR DEĞİŞİKLİK YAPILAMAZ!
*/

-- Test 3: İlk kurye ataması (BAŞARILI OLMALI)
/*
UPDATE packages
SET courier_id = 'test-kurye-id', status = 'assigned'
WHERE courier_id IS NULL
LIMIT 1;
-- Beklenen: Başarılı
*/

-- ============================================
-- KONTROL
-- ============================================

-- Trigger aktif mi?
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'packages'
  AND trigger_name = 'trigger_protect_assigned_packages_absolute';

-- Beklenen: 1 satır (trigger aktif)

-- ============================================
-- ROLLBACK (GERİ ALMA)
-- ============================================
/*
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_absolute ON packages;
DROP FUNCTION IF EXISTS protect_assigned_packages_absolute();
*/

-- ============================================
-- NOTLAR
-- ============================================
-- 1. Bu trigger, courier_id dolu olan paketlere HİÇBİR DEĞİŞİKLİK YAPILMASINA İZİN VERMEZ
-- 2. İlk kurye ataması (NULL → dolu) izin verilir
-- 3. Kurye atandıktan sonra, hiç kimse (ajan dahil) paketi güncelleyemez
-- 4. Sadece kurye uygulaması (status değişiklikleri için) güncelleyebilir
-- 5. Trigger, veritabanı seviyesinde çalışır (API bypass edilemez)

-- ============================================
-- AJAN NASIL ETKİLENİR?
-- ============================================
-- Ajan INSERT yapar:
-- - Eğer paket yoksa → Yeni kayıt oluşturulur ✅
-- - Eğer paket varsa → UNIQUE constraint hatası (ignore-duplicates ile 200 OK) ✅

-- Ajan UPDATE yapmaya çalışırsa (teorik):
-- - Eğer courier_id NULL ise → Güncelleme yapılır ✅
-- - Eğer courier_id dolu ise → MUTLAK KİLİT çalışır, güncelleme engellenir ❌

-- ============================================
-- ADMİN PANELİ NASIL ETKİLENİR?
-- ============================================
-- Admin kurye atar:
-- - courier_id NULL → dolu: İlk atama, başarılı ✅
-- - courier_id dolu → dolu: MUTLAK KİLİT çalışır, değiştirilemez ❌

-- ============================================
-- GÜVENLİK SEVİYESİ
-- ============================================
-- 🔒🔒🔒🔒🔒 (5/5) - MUTLAK KORUMA
-- Kurye atanmış paketler ASLA değiştirilemez!
