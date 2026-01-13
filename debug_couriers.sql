-- KURYE VERİLERİNİ KONTROL ET VE DEBUG BİLGİLERİ
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. Couriers tablosunun mevcut durumunu kontrol et
SELECT 'COURIERS TABLOSU DURUMU:' as info;
SELECT 
  id,
  username,
  full_name,
  is_active,
  status,
  last_lat,
  last_lng,
  orders_completed,
  created_at
FROM couriers 
ORDER BY full_name;

-- 2. Toplam kurye sayısı
SELECT 'TOPLAM KURYE SAYISI:' as info;
SELECT COUNT(*) as toplam_kurye FROM couriers;

-- 3. Aktif/Pasif kurye dağılımı
SELECT 'AKTİF/PASİF DAĞILIMI:' as info;
SELECT 
  is_active,
  COUNT(*) as kurye_sayisi,
  STRING_AGG(full_name, ', ') as kurye_isimleri
FROM couriers 
GROUP BY is_active;

-- 4. Status dağılımı
SELECT 'STATUS DAĞILIMI:' as info;
SELECT 
  status,
  COUNT(*) as kurye_sayisi,
  STRING_AGG(full_name, ', ') as kurye_isimleri
FROM couriers 
GROUP BY status;

-- 5. Konum bilgisi olan kuryeler
SELECT 'KONUM BİLGİSİ DURUMU:' as info;
SELECT 
  full_name,
  last_lat,
  last_lng,
  CASE 
    WHEN last_lat IS NOT NULL AND last_lng IS NOT NULL AND last_lat != 0 AND last_lng != 0 
    THEN 'GEÇERLİ KONUM' 
    ELSE 'KONUM YOK' 
  END as konum_durumu,
  is_active,
  status
FROM couriers
ORDER BY full_name;

-- 6. Packages tablosundaki kurye ilişkileri
SELECT 'PACKAGES TABLOSUNDA KURYE İLİŞKİLERİ:' as info;
SELECT 
  c.full_name,
  COUNT(CASE WHEN p.status != 'delivered' THEN 1 END) as aktif_paket_sayisi,
  COUNT(CASE WHEN p.status = 'delivered' THEN 1 END) as teslim_edilen_paket_sayisi,
  COUNT(CASE WHEN p.status = 'delivered' AND DATE(p.delivered_at) = CURRENT_DATE THEN 1 END) as bugun_teslim_edilen
FROM couriers c
LEFT JOIN packages p ON c.id = p.courier_id
GROUP BY c.id, c.full_name
ORDER BY c.full_name;

-- 7. Son 5 dakikada güncellenen kuryeler (konum güncellemesi)
SELECT 'SON 5 DAKİKADA GÜNCELLENEN KURYELER:' as info;
SELECT 
  full_name,
  last_lat,
  last_lng,
  updated_at,
  is_active,
  status
FROM couriers 
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;

-- 8. Test güncellemesi - Ahmet Abi'yi aktif yap ve konum ver
SELECT 'TEST GÜNCELLEMESİ YAPILIYOR:' as info;
UPDATE couriers 
SET 
  is_active = true, 
  status = 'idle',
  last_lat = 41.2867,
  last_lng = 36.3300,
  updated_at = NOW()
WHERE username = 'ahmet55';

-- 9. Test güncellemesi - Taha'yı aktif yap ve farklı konum ver
UPDATE couriers 
SET 
  is_active = true, 
  status = 'idle',
  last_lat = 41.2900,
  last_lng = 36.3350,
  updated_at = NOW()
WHERE username = 'taha';

-- 10. Güncelleme sonrası durumu kontrol et
SELECT 'GÜNCELLEME SONRASI DURUM:' as info;
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

-- 11. Admin paneli için özet bilgi
SELECT 'ADMİN PANELİ ÖZETİ:' as info;
SELECT 
  COUNT(*) as toplam_kurye,
  COUNT(CASE WHEN is_active = true THEN 1 END) as aktif_kurye,
  COUNT(CASE WHEN is_active = false THEN 1 END) as pasif_kurye,
  COUNT(CASE WHEN last_lat IS NOT NULL AND last_lng IS NOT NULL AND last_lat != 0 AND last_lng != 0 THEN 1 END) as konumu_olan_kurye
FROM couriers;