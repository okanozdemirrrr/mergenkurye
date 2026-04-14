-- Müşteri Adresleri için Mahalle Ekleme ve Adres Yapısını Basitleştirme
-- Play Store öncesi son güncelleme

-- 1. İlçe (district) sütunu ekle
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS district VARCHAR(100);

-- 2. Mahalle (neighborhood) sütunu ekle
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);

-- 3. Cadde/Sokak (street_address) sütunu ekle
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS street_address VARCHAR(255);

-- 4. Kat (floor) sütunu ekle
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS floor VARCHAR(10);

-- 5. Kapı No (door_number) sütunu ekle
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS door_number VARCHAR(10);

-- 6. Mevcut verileri birleştir (eğer avenue veya street varsa)
-- Bu adım opsiyonel - eğer bu sütunlar yoksa hata vermez
DO $$
BEGIN
    -- avenue ve street sütunları varsa birleştir
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'avenue'
    ) THEN
        UPDATE customers 
        SET street_address = CONCAT_WS(' ', avenue, street)
        WHERE (avenue IS NOT NULL OR street IS NOT NULL)
        AND street_address IS NULL;
    END IF;
END $$;

-- 7. Eski sütunları kaldır (eğer varsa)
ALTER TABLE customers 
DROP COLUMN IF EXISTS avenue,
DROP COLUMN IF EXISTS street;

-- 8. İndeksler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_customers_district ON customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_neighborhood ON customers(neighborhood);

-- 9. Yorumlar ekle
COMMENT ON COLUMN customers.district IS 'Müşterinin ilçesi (örn: 19 Mayıs)';
COMMENT ON COLUMN customers.neighborhood IS 'Müşterinin mahallesi (örn: Merkez Mahallesi, Üniversite Mahallesi)';
COMMENT ON COLUMN customers.street_address IS 'Birleşik cadde/sokak bilgisi (örn: Atatürk Bulvarı, 1. Sokak)';
COMMENT ON COLUMN customers.floor IS 'Kat numarası';
COMMENT ON COLUMN customers.door_number IS 'Kapı numarası';

-- Başarılı!
SELECT 'Migration tamamlandı! district, neighborhood, street_address, floor, door_number sütunları hazır.' as status;
