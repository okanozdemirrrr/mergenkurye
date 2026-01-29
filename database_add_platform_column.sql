-- PLATFORM KOLONU EKLEME
-- Packages tablosuna platform bilgisi ekleniyor

-- 1. Platform kolonunu ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS platform TEXT;

-- 2. Platform için indeks oluştur (filtreleme performansı için)
CREATE INDEX IF NOT EXISTS idx_packages_platform 
ON packages(platform) 
WHERE platform IS NOT NULL;

-- 3. Mevcut kayıtları kontrol et
SELECT 
  platform,
  COUNT(*) AS adet
FROM packages
GROUP BY platform
ORDER BY adet DESC;

-- 4. Örnek platform değerleri
-- UPDATE packages SET platform = 'trendyol' WHERE id = 1;
-- UPDATE packages SET platform = 'getir' WHERE id = 2;
-- UPDATE packages SET platform = 'yemeksepeti' WHERE id = 3;
-- UPDATE packages SET platform = 'migros' WHERE id = 4;

-- 5. Tablo yapısını kontrol et
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'packages' 
  AND column_name = 'platform';

-- BAŞARILI! Platform kolonu eklendi.
