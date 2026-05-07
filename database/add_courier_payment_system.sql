-- =====================================================
-- KURYE ÖDEME SİSTEMİ - VERİTABANI KATMANI
-- =====================================================
-- Mergen Kurye sisteminin 'Hak Ediş' mantığını profesyonel SaaS standardına taşıma
-- Sabit (hardcoded) hesaplamaları kaldırıp, tamamen veritabanı kontrollü yapı

-- Couriers tablosuna ödeme sistemi sütunları ekleme
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'paket_basi' CHECK (payment_type IN ('paket_basi', 'saatlik')),
ADD COLUMN IF NOT EXISTS package_rate NUMERIC(10,2) DEFAULT NULL;

-- Açıklama yorumları
COMMENT ON COLUMN couriers.payment_type IS 'Kurye ödeme türü: paket_basi veya saatlik';
COMMENT ON COLUMN couriers.package_rate IS 'Paket başı ücret (TL) - paket_basi için tam ücret, saatlik için ek ücret';

-- Mevcut kuryeler için varsayılan değerler (isteğe bağlı)
-- UPDATE couriers SET payment_type = 'paket_basi', package_rate = 65.00 WHERE payment_type IS NULL;

-- İndeks ekleme (performans için)
CREATE INDEX IF NOT EXISTS idx_couriers_payment_type ON couriers(payment_type);

-- Kontrol sorgusu
SELECT id, full_name, payment_type, package_rate 
FROM couriers 
WHERE is_active = true 
ORDER BY full_name;