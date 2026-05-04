-- ============================================
-- FIX: applications_status_check Constraint
-- ============================================
-- Sorun: Constraint sadece 'beklemede' ve 'reddedildi' değerlerine izin veriyor
-- Çözüm: 'onaylandi' değerini de ekle

-- 1. Mevcut constraint'i kaldır
ALTER TABLE applications 
DROP CONSTRAINT IF EXISTS applications_status_check;

-- 2. Yeni constraint ekle (onaylandi dahil)
ALTER TABLE applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN ('beklemede', 'onaylandi', 'reddedildi'));

-- 3. Kontrol et
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'applications'::regclass
  AND conname = 'applications_status_check';
