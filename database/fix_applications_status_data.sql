-- Önce mevcut geçersiz status değerlerini kontrol et
SELECT status, COUNT(*) FROM applications GROUP BY status;

-- Geçersiz status değerlerini düzelt
UPDATE applications 
SET status = 'beklemede' 
WHERE status NOT IN ('beklemede', 'onaylandi', 'reddedildi');

-- Constraint'i kaldır
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Yeni constraint ekle
ALTER TABLE applications ADD CONSTRAINT applications_status_check 
CHECK (status IN ('beklemede', 'onaylandi', 'reddedildi'));