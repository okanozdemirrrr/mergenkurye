-- COURIERS TABLOSUNA LAST_UPDATE KOLONU EKLE
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. last_update kolonunu ekle (eğer yoksa)
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Mevcut kuryelerin last_update'ini şimdi yap
UPDATE couriers 
SET last_update = NOW() 
WHERE last_update IS NULL;

-- 3. Sonucu kontrol et
SELECT 'LAST_UPDATE KOLONU EKLENDİ:' as info;
SELECT 
  username,
  full_name,
  is_active,
  last_lat,
  last_lng,
  last_update,
  EXTRACT(EPOCH FROM (NOW() - last_update)) as saniye_oncesi
FROM couriers 
ORDER BY full_name;

-- 4. Test için Ahmet Abi'nin last_update'ini güncelle
UPDATE couriers 
SET 
  last_update = NOW(),
  last_lat = 41.2867,
  last_lng = 36.3300,
  is_active = true
WHERE username = 'ahmet55';

-- 5. Test için Taha'nın last_update'ini güncelle  
UPDATE couriers 
SET 
  last_update = NOW(),
  last_lat = 41.2900,
  last_lng = 36.3350,
  is_active = true
WHERE username = 'taha';

-- 6. Final kontrol
SELECT 'GÜNCELLENMIŞ DURUM:' as info;
SELECT 
  username,
  full_name,
  is_active,
  last_lat,
  last_lng,
  last_update,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - last_update)) < 60 THEN 'CANLI ✅'
    ELSE 'HAYALET ❌'
  END as durum
FROM couriers 
ORDER BY full_name;