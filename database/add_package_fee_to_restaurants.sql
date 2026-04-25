-- Restoranlara paket başı ücret sütunu ekle
-- Her restoran için farklı paket başı masraf belirlenebilir

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS package_fee NUMERIC(10, 2) DEFAULT 100.00;

-- Mevcut restoranlar için varsayılan değer ata
UPDATE restaurants
SET package_fee = 100.00
WHERE package_fee IS NULL;

-- Yorum ekle
COMMENT ON COLUMN restaurants.package_fee IS 'Paket başı masraf ücreti (TL). Her restoran için özelleştirilebilir.';
