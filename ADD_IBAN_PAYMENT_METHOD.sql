-- packages tablosuna IBAN ödeme yöntemini ekle
-- Mevcut constraint'i kaldır ve yenisini ekle

-- 1. Önce mevcut constraint'i bul ve kaldır
ALTER TABLE packages 
DROP CONSTRAINT IF EXISTS packages_payment_method_check;

-- 2. Yeni constraint'i ekle (cash, card, iban)
ALTER TABLE packages 
ADD CONSTRAINT packages_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'iban'));

-- 3. Kontrol et
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'packages'::regclass
AND conname = 'packages_payment_method_check';
