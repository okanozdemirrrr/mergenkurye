-- SİPARİŞ İPTAL SİSTEMİ
-- Packages tablosuna iptal detaylarını tutacak kolonlar ekleniyor

-- 1. İptal zamanı
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. İptal eden (admin veya restaurant)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- 3. İptal nedeni
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 4. İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_cancelled_at 
ON packages(cancelled_at) 
WHERE cancelled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_packages_status_cancelled 
ON packages(status) 
WHERE status = 'cancelled';

-- 5. Kontrol: Yeni kolonları göster
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'packages' 
  AND column_name IN ('cancelled_at', 'cancelled_by', 'cancellation_reason');

-- 6. Örnek iptal işlemi (TEST)
-- UPDATE packages 
-- SET 
--   status = 'cancelled',
--   cancelled_at = NOW(),
--   cancelled_by = 'admin',
--   cancellation_reason = 'Müşteri talebi',
--   courier_id = NULL
-- WHERE id = 123;

-- BAŞARILI! İptal sistemi veritabanına eklendi.
