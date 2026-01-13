-- KOORDİNATLARI ZORLA DÜZELTELİM
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. Mevcut durumu göster
SELECT 'MEVCUT DURUM:' as info;
SELECT username, full_name, is_active, status, last_lat, last_lng FROM couriers;

-- 2. Koordinatları zorla güncelle
UPDATE couriers SET 
  last_lat = 41.2867,
  last_lng = 36.3300,
  is_active = true,
  status = 'idle'
WHERE username = 'ahmet55';

UPDATE couriers SET 
  last_lat = 41.2900,
  last_lng = 36.3350,
  is_active = true,
  status = 'idle'
WHERE username = 'taha';

-- 3. Sonucu kontrol et
SELECT 'GÜNCELLENMIŞ DURUM:' as info;
SELECT username, full_name, is_active, status, last_lat, last_lng FROM couriers;

-- 4. Koordinat tiplerini kontrol et
SELECT 'KOORDİNAT TİPLERİ:' as info;
SELECT 
  username,
  last_lat,
  pg_typeof(last_lat) as lat_tipi,
  last_lng,
  pg_typeof(last_lng) as lng_tipi
FROM couriers;