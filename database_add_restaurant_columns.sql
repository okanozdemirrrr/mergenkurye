-- Restoran Tablosuna Eksik Kolonları Ekle
-- Bu SQL komutunu Supabase SQL Editor'de çalıştırın

-- 1. maps_link kolonu ekle (Google Maps linki için)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS maps_link TEXT;

-- 2. delivery_fee kolonu ekle (Teslimat ücreti için)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 100;

-- 3. Mevcut kayıtlar için varsayılan değer ata
UPDATE restaurants 
SET delivery_fee = 100 
WHERE delivery_fee IS NULL;

-- 4. Kontrol sorgusu - Kolonların eklendiğini doğrula
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
  AND column_name IN ('maps_link', 'delivery_fee')
ORDER BY column_name;

-- 5. Test sorgusu - Restoranları listele
SELECT id, name, maps_link, delivery_fee 
FROM restaurants 
ORDER BY name;
