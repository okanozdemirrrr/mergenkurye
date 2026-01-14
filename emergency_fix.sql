-- ACİL DÜZELTME - KURYE SİSTEMİNİ TAMAMEN SIFIRLA
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. Mevcut durumu göster
SELECT '=== MEVCUT DURUM ===' as info;
SELECT 
  id,
  username,
  full_name,
  is_active,
  status,
  last_lat,
  last_lng,
  last_update
FROM couriers
ORDER BY full_name;

-- 2. TÜM KURYELERİ AKTİF YAP VE KONUM VER
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

-- 3. Güncellenmiş durumu kontrol et
SELECT '=== GÜNCELLENMIŞ DURUM ===' as info;
SELECT 
  id,
  username,
  full_name,
  is_active,
  status,
  last_lat,
  last_lng,
  last_update,
  EXTRACT(EPOCH FROM (NOW() - last_update)) as saniye_oncesi
FROM couriers
ORDER BY full_name;

-- 4. Packages tablosundaki bekleyen paketleri göster
SELECT '=== BEKLEYEN PAKETLER ===' as info;
SELECT 
  id,
  customer_name,
  status,
  courier_id,
  created_at
FROM packages
WHERE status IN ('waiting', 'assigned', 'picking_up', 'on_the_way')
ORDER BY created_at DESC
LIMIT 10;