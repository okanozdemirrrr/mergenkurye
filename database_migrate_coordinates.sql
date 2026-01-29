-- VERITABANINI FİZİKSELLEŞTİRME VE VERİ KURTARMA
-- Koordinatları View'den Table'a taşıma

-- 1. Packages tablosuna koordinat kolonları ekle (eğer yoksa)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS latitude FLOAT8,
ADD COLUMN IF NOT EXISTS longitude FLOAT8;

-- 2. Eski verileri View'den Table'a kopyala
UPDATE packages 
SET 
  latitude = view_data.latitude, 
  longitude = view_data.longitude 
FROM packages_with_coordinates AS view_data 
WHERE packages.id = view_data.id 
  AND packages.latitude IS NULL;

-- 3. Koordinat indeksi oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_coordinates 
ON packages(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Realtime için packages tablosunu aktif et (eğer değilse)
-- NOT: Tablo zaten kayıtlıysa hata verir, bu normaldir
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE packages;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'packages tablosu zaten Realtime''da kayıtlı';
END $$;

-- 5. Kontrol: Kaç kayıt güncellendi?
SELECT 
  COUNT(*) FILTER (WHERE latitude IS NOT NULL) AS koordinatli_kayitlar,
  COUNT(*) FILTER (WHERE latitude IS NULL) AS koordinatsiz_kayitlar,
  COUNT(*) AS toplam_kayitlar
FROM packages;

-- 6. Örnek veri kontrolü
SELECT 
  id, 
  customer_name, 
  delivery_address,
  latitude,
  longitude,
  created_at
FROM packages 
ORDER BY created_at DESC 
LIMIT 10;

-- BAŞARILI! Veritabanı fizikselleşti.
