-- =====================================================
-- ADD ACCOUNT STATUS TO COURIERS
-- =====================================================
-- Amaç: Kurye hesap durumunu yönetmek için yeni alan
-- 
-- is_active: Kurye şu an aktif mi? (Kurye kendisi değiştirebilir)
-- account_status: Hesap durumu (Sadece admin değiştirebilir)
--   - 'active': Normal hesap, giriş yapabilir
--   - 'suspended': Askıya alınmış, giriş yapamaz
--   - 'terminated': İşten çıkarılmış, giriş yapamaz
-- =====================================================

-- Yeni sütun ekle
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

-- Mevcut tüm kuryeleri 'active' yap
UPDATE couriers 
SET account_status = 'active' 
WHERE account_status IS NULL;

-- Check constraint ekle
ALTER TABLE couriers
DROP CONSTRAINT IF EXISTS couriers_account_status_check;

ALTER TABLE couriers
ADD CONSTRAINT couriers_account_status_check 
CHECK (account_status IN ('active', 'suspended', 'terminated'));

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_couriers_account_status 
ON couriers(account_status);

-- =====================================================
-- KULLANIM ÖRNEKLERİ
-- =====================================================

-- Kurye işten çıkarıldı (giriş yapamaz)
-- UPDATE couriers 
-- SET account_status = 'terminated', is_active = false
-- WHERE id = 'xxx';

-- Kurye geçici olarak askıya alındı (giriş yapamaz)
-- UPDATE couriers 
-- SET account_status = 'suspended'
-- WHERE id = 'xxx';

-- Kurye tekrar aktif edildi
-- UPDATE couriers 
-- SET account_status = 'active'
-- WHERE id = 'xxx';

-- Kontrol
SELECT 
    full_name,
    username,
    is_active,
    account_status,
    status
FROM couriers
ORDER BY full_name;
