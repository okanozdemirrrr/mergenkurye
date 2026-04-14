-- Müşteri Adresleri için Eksik Sütunları Ekleme
-- Basit ve Hızlı Versiyon

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

-- 6. İndeksler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_customers_district ON customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_neighborhood ON customers(neighborhood);

-- Başarılı!
SELECT 'Migration tamamlandı! Tüm sütunlar eklendi.' as status;
