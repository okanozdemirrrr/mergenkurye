-- ============================================
-- ÇELİK KİLİT KORUMA SİSTEMİ
-- ============================================
-- Bu trigger, kurye atanmış paketlerin Ajan tarafından ezilmesini engeller

-- ADIM 1: Trigger fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION protect_assigned_packages()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer paket zaten kurye atanmışsa (courier_id dolu)
  IF OLD.courier_id IS NOT NULL THEN
    RAISE EXCEPTION '🔒 ÇELİK KİLİT: Bu paket kurye atanmış, güncellenemez! (Paket ID: %, Kurye: %)', OLD.id, OLD.courier_id;
  END IF;
  
  -- Eğer paket zaten 'assigned' veya daha ileri bir statüdeyse
  IF OLD.status IN ('assigned', 'picking_up', 'on_the_way', 'delivered') THEN
    RAISE EXCEPTION '🔒 ÇELİK KİLİT: Bu paket % statüsünde, güncellenemez! (Paket ID: %)', OLD.status, OLD.id;
  END IF;
  
  -- Eğer locked_by 'courier' ise (kurye kilidi aktif)
  IF OLD.locked_by = 'courier' THEN
    RAISE EXCEPTION '🔒 ÇELİK KİLİT: Bu paket kurye tarafından kilitli, güncellenemez! (Paket ID: %)', OLD.id;
  END IF;
  
  -- Tüm kontroller geçti, güncellemeye izin ver
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ADIM 2: Trigger'ı packages tablosuna ekle
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages;

CREATE TRIGGER trigger_protect_assigned_packages
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION protect_assigned_packages();

-- ============================================
-- TEST SORULARI
-- ============================================

-- Test 1: Kurye atanmış bir paketi güncellemeye çalış (BAŞARISIZ OLMALI)
/*
UPDATE packages
SET customer_name = 'Test Güncelleme'
WHERE courier_id IS NOT NULL
LIMIT 1;
-- Beklenen: ERROR: 🔒 ÇELİK KİLİT: Bu paket kurye atanmış, güncellenemez!
*/

-- Test 2: Status 'assigned' olan bir paketi güncellemeye çalış (BAŞARISIZ OLMALI)
/*
UPDATE packages
SET amount = 999
WHERE status = 'assigned'
LIMIT 1;
-- Beklenen: ERROR: 🔒 ÇELİK KİLİT: Bu paket assigned statüsünde, güncellenemez!
*/

-- Test 3: Status 'pending' ve courier_id NULL olan bir paketi güncelle (BAŞARILI OLMALI)
/*
UPDATE packages
SET customer_name = 'Test Güncelleme'
WHERE status = 'pending' AND courier_id IS NULL
LIMIT 1;
-- Beklenen: Başarılı güncelleme
*/

-- ============================================
-- ROLLBACK (GERİ ALMA)
-- ============================================
-- Eğer trigger'ı kaldırmak isterseniz:
/*
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages;
DROP FUNCTION IF EXISTS protect_assigned_packages();
*/

-- ============================================
-- NOTLAR
-- ============================================
-- 1. Bu trigger, SADECE UPDATE işlemlerinde çalışır (INSERT ve DELETE etkilenmez)
-- 2. Ajan INSERT yapabilir ama UPDATE yapamaz
-- 3. Admin paneli, kurye atamadan ÖNCE UPDATE yapabilir
-- 4. Kurye atandıktan SONRA, hiç kimse (ajan dahil) UPDATE yapamaz
-- 5. Trigger, veritabanı seviyesinde çalışır (API bypass edilemez)

-- ============================================
-- GÜVENLİK SEVİYELERİ
-- ============================================
-- Seviye 1: locked_by = 'agent' → Sadece ajan güncelleyebilir (Admin kırabilir)
-- Seviye 2: locked_by = 'courier' → Sadece kurye güncelleyebilir (Kimse kıramaz)
-- Seviye 3: courier_id IS NOT NULL → ÇELİK KİLİT (Kimse güncelleyemez)
-- Seviye 4: status IN ('assigned', 'picking_up', 'on_the_way', 'delivered') → ÇELİK KİLİT (Kimse güncelleyemez)

-- ============================================
-- KURULUM SONRASI KONTROL
-- ============================================
-- Trigger'ın aktif olduğunu kontrol et:
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'packages'
  AND trigger_name = 'trigger_protect_assigned_packages';

-- Beklenen sonuç: 1 satır (trigger aktif)
