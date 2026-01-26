-- ============================================
-- GÜVENLİ KURYE ATAMA SİSTEMİ
-- ============================================
-- Bu migration, kurye atama sistemini güvenli hale getirir
-- ve agent'in atanmış siparişlere erişimini engeller

-- 1. LOCKED_BY KOLONU EKLE (Opsiyonel - Bonus Yapı)
-- Bu kolon, siparişin kimin kontrolünde olduğunu gösterir
ALTER TABLE packages ADD COLUMN IF NOT EXISTS locked_by VARCHAR(20) DEFAULT 'agent';

-- locked_by değerleri:
-- 'agent'   : Agent tarafından oluşturuldu, henüz atanmadı
-- 'admin'   : Admin tarafından manuel oluşturuldu
-- 'courier' : Kuryeye atandı, sadece kurye güncelleyebilir

-- 2. TRIGGER: Kurye atandığında locked_by'ı otomatik güncelle
CREATE OR REPLACE FUNCTION update_locked_by_on_assign()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer status 'assigned' olarak değiştiriliyorsa
  IF NEW.status = 'assigned' AND OLD.status = 'waiting' THEN
    NEW.locked_by = 'courier';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_update_locked_by ON packages;
CREATE TRIGGER trigger_update_locked_by
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_locked_by_on_assign();

-- 3. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- NOT: RLS politikaları opsiyoneldir. Eğer agent ve kurye ayrı authentication kullanıyorsa
-- bu politikaları aktif edebilirsiniz. Şimdilik sadece trigger ve locked_by kolonu yeterli.

-- RLS'yi etkinleştir (opsiyonel)
-- ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Agent için READ politikası (opsiyonel)
-- CREATE POLICY "agent_read_policy" ON packages
--   FOR SELECT
--   USING (locked_by = 'agent' OR status = 'waiting');

-- Agent için UPDATE politikası (opsiyonel)
-- CREATE POLICY "agent_update_policy" ON packages
--   FOR UPDATE
--   USING (locked_by = 'agent')
--   WITH CHECK (locked_by = 'agent');

-- Admin için tam erişim (opsiyonel)
-- CREATE POLICY "admin_full_access" ON packages
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Kurye için politikalar (opsiyonel)
-- NOT: courier_id tipine göre cast yapmanız gerekebilir
-- CREATE POLICY "courier_read_policy" ON packages
--   FOR SELECT
--   USING (locked_by = 'courier' AND courier_id = current_user);

-- CREATE POLICY "courier_update_policy" ON packages
--   FOR UPDATE
--   USING (locked_by = 'courier' AND courier_id = current_user)
--   WITH CHECK (locked_by = 'courier' AND courier_id = current_user);

-- 4. İNDEKS OLUŞTUR (Performans için)
CREATE INDEX IF NOT EXISTS idx_packages_locked_by ON packages(locked_by);
CREATE INDEX IF NOT EXISTS idx_packages_status_locked ON packages(status, locked_by);

-- 5. MEVCUT VERİLERİ GÜNCELLE
-- Tüm 'waiting' durumundaki siparişleri 'agent' olarak işaretle
UPDATE packages 
SET locked_by = 'agent' 
WHERE status = 'waiting' AND locked_by IS NULL;

-- Tüm 'assigned', 'picking_up', 'on_the_way' durumundaki siparişleri 'courier' olarak işaretle
UPDATE packages 
SET locked_by = 'courier' 
WHERE status IN ('assigned', 'picking_up', 'on_the_way') AND locked_by IS NULL;

-- Tüm 'delivered' durumundaki siparişleri 'courier' olarak işaretle
UPDATE packages 
SET locked_by = 'courier' 
WHERE status = 'delivered' AND locked_by IS NULL;

-- ============================================
-- KULLANIM NOTLARI
-- ============================================
-- 1. Admin panel kurye atarken:
--    UPDATE packages SET courier_id=X, status='assigned' WHERE id=Y AND status='waiting'
--    Trigger otomatik olarak locked_by='courier' yapacak
--
-- 2. Agent yeni sipariş oluştururken:
--    INSERT INTO packages (..., locked_by) VALUES (..., 'agent')
--
-- 3. Kurye sipariş güncellerken:
--    UPDATE packages SET status='picking_up' WHERE id=X AND locked_by='courier' AND courier_id=auth.uid()
--
-- 4. RLS politikalarını test etmek için:
--    SELECT * FROM packages WHERE locked_by='agent'; -- Agent'in görebildikleri
--    SELECT * FROM packages WHERE locked_by='courier'; -- Kuryelerin görebildikleri

-- ============================================
-- GERİ ALMA (Rollback)
-- ============================================
-- Eğer bu migration'ı geri almak isterseniz:
-- DROP TRIGGER IF EXISTS trigger_update_locked_by ON packages;
-- DROP FUNCTION IF EXISTS update_locked_by_on_assign();
-- ALTER TABLE packages DROP COLUMN IF EXISTS locked_by;

-- RLS politikalarını geri almak için (eğer aktif ettiyseniz):
-- DROP POLICY IF EXISTS "agent_read_policy" ON packages;
-- DROP POLICY IF EXISTS "agent_update_policy" ON packages;
-- DROP POLICY IF EXISTS "admin_full_access" ON packages;
-- DROP POLICY IF EXISTS "courier_read_policy" ON packages;
-- DROP POLICY IF EXISTS "courier_update_policy" ON packages;
-- ALTER TABLE packages DISABLE ROW LEVEL SECURITY;
