-- HIZLI DÜZELTME - SADECE GEREKLİ İŞLEMLER
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. last_update kolonunu ekle (eğer yoksa)
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Mevcut kuryelerin last_update'ini şimdi yap
UPDATE couriers 
SET last_update = NOW() 
WHERE last_update IS NULL;

-- 3. TÜM KURYELERİ AKTİF YAP VE KONUM VER
UPDATE couriers 
SET 
  is_active = true,
  status = 'idle',
  last_lat = 41.2867,
  last_lng = 36.3300,
  last_update = NOW()
WHERE username = 'ahmet55';

UPDATE couriers 
SET 
  is_active = true,
  status = 'idle',
  last_lat = 41.2900,
  last_lng = 36.3350,
  last_update = NOW()
WHERE username = 'taha';

-- 4. Sonucu kontrol et
SELECT 
  username,
  full_name,
  is_active,
  status,
  last_lat,
  last_lng,
  last_update
FROM couriers
ORDER BY full_name;