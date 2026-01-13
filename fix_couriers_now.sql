-- KURYE SORUNUNU HEMEN ÇÖZ
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. Önce mevcut durumu kontrol et
SELECT 'MEVCUT DURUM:' as info;
SELECT id, username, full_name, is_active, status, last_lat, last_lng FROM couriers;

-- 2. Eğer tablo boşsa, kuryeleri yeniden oluştur
INSERT INTO couriers (username, password, full_name, is_active, status, last_lat, last_lng) 
VALUES 
  ('ahmet55', 'ahmet55123', 'Ahmet Abi', true, 'idle', 41.2867, 36.3300),
  ('taha', 'taha123', 'Taha', true, 'idle', 41.2900, 36.3350)
ON CONFLICT (username) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status,
  last_lat = EXCLUDED.last_lat,
  last_lng = EXCLUDED.last_lng;

-- 3. Tüm kuryeleri kesinlikle aktif yap
UPDATE couriers SET 
  is_active = true, 
  status = 'idle',
  updated_at = NOW()
WHERE username IN ('ahmet55', 'taha');

-- 4. Ahmet Abi'ye Samsun merkez koordinatı ver
UPDATE couriers SET 
  last_lat = 41.2867,
  last_lng = 36.3300,
  is_active = true,
  status = 'idle',
  updated_at = NOW()
WHERE username = 'ahmet55';

-- 5. Taha'ya farklı koordinat ver
UPDATE couriers SET 
  last_lat = 41.2900,
  last_lng = 36.3350,
  is_active = true,
  status = 'idle',
  updated_at = NOW()
WHERE username = 'taha';

-- 6. Sonucu kontrol et
SELECT 'GÜNCELLENMIŞ DURUM:' as info;
SELECT 
  username,
  full_name,
  is_active,
  status,
  last_lat,
  last_lng,
  updated_at
FROM couriers 
ORDER BY full_name;

-- 7. Koordinat kontrolü
SELECT 'KOORDINAT KONTROLÜ:' as info;
SELECT 
  full_name,
  last_lat,
  last_lng,
  CASE 
    WHEN last_lat IS NOT NULL AND last_lng IS NOT NULL AND last_lat != 0 AND last_lng != 0 
    THEN 'GEÇERLİ KONUM ✅' 
    ELSE 'KONUM YOK ❌' 
  END as konum_durumu,
  is_active,
  status
FROM couriers;

-- 8. Admin paneli için özet
SELECT 'ADMİN PANELİ ÖZETİ:' as info;
SELECT 
  COUNT(*) as toplam_kurye,
  COUNT(CASE WHEN is_active = true THEN 1 END) as aktif_kurye,
  COUNT(CASE WHEN last_lat IS NOT NULL AND last_lng IS NOT NULL AND last_lat != 0 AND last_lng != 0 THEN 1 END) as konumu_olan_kurye
FROM couriers;