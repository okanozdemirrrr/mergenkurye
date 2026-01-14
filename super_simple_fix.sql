-- SÜPER BASİT DÜZELTME
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- Ahmet Abi'yi aktif yap
UPDATE couriers 
SET 
  is_active = true,
  status = 'idle',
  last_lat = 41.2867,
  last_lng = 36.3300
WHERE username = 'ahmet55';

-- Taha'yı aktif yap
UPDATE couriers 
SET 
  is_active = true,
  status = 'idle',
  last_lat = 41.2900,
  last_lng = 36.3350
WHERE username = 'taha';

-- Sonucu göster
SELECT 
  username,
  full_name,
  is_active,
  status,
  last_lat,
  last_lng
FROM couriers;