-- ============================================
-- ADIM ADIM MIGRATION
-- Her satırı tek tek çalıştırabilirsiniz
-- ============================================

-- ADIM 1: district sütunu
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district VARCHAR(100);

-- ADIM 2: neighborhood sütunu
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);

-- ADIM 3: street_address sütunu
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_address VARCHAR(255);

-- ADIM 4: floor sütunu
ALTER TABLE customers ADD COLUMN IF NOT EXISTS floor VARCHAR(10);

-- ADIM 5: door_number sütunu
ALTER TABLE customers ADD COLUMN IF NOT EXISTS door_number VARCHAR(10);

-- ADIM 6: district indeksi
CREATE INDEX IF NOT EXISTS idx_customers_district ON customers(district);

-- ADIM 7: neighborhood indeksi
CREATE INDEX IF NOT EXISTS idx_customers_neighborhood ON customers(neighborhood);

-- KONTROL: Sütunları listele
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('district', 'neighborhood', 'street_address', 'floor', 'door_number')
ORDER BY column_name;
