-- Eski Kurye Konumlarını Temizleme
-- Tüm kuryelerin last_location verisini sıfırla

-- 1. Tüm kuryelerin konumlarını temizle
UPDATE couriers 
SET last_location = NULL;

-- 2. Veya sadece eski konumları temizle (2 günden eski)
UPDATE couriers 
SET last_location = NULL
WHERE (last_location->>'updated_at')::timestamptz < NOW() - INTERVAL '2 days';

-- 3. Kontrol et
SELECT 
  id,
  full_name,
  last_location->>'latitude' as lat,
  last_location->>'longitude' as lng,
  last_location->>'updated_at' as updated_at,
  is_active
FROM couriers
WHERE last_location IS NOT NULL;

-- 4. Eğer hala eski konum görünüyorsa, tüm JSONB alanını temizle
UPDATE couriers 
SET last_location = jsonb_build_object(
  'latitude', NULL,
  'longitude', NULL,
  'accuracy', NULL,
  'updated_at', NULL,
  'last_seen', NULL
);

-- 5. Veya tamamen NULL yap (önerilen)
UPDATE couriers SET last_location = NULL;

-- NOT: Bu script'i çalıştırdıktan sonra kurye uygulamasından 
-- "Konumu Güncelle" butonuna basarak yeni konum alınmalı
