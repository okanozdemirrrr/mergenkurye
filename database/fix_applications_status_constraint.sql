-- Applications status constraint'ini güncelle
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Yeni constraint ekle (onaylandi dahil)
ALTER TABLE applications ADD CONSTRAINT applications_status_check 
CHECK (status IN ('beklemede', 'onaylandi', 'reddedildi'));

-- Alternatif olarak constraint'i tamamen kaldır
-- ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;