-- PACKAGES_WITH_COORDINATES VIEW TEMİZLİĞİ
-- Artık koordinatlar fiziksel tabloda olduğu için View gereksiz

-- 1. Önce View'in var olduğunu kontrol et
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'packages_with_coordinates';

-- 2. View'i sil (eğer varsa)
DROP VIEW IF EXISTS packages_with_coordinates CASCADE;

-- 3. Kontrol: View silindi mi?
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'packages_with_coordinates';
-- Sonuç: Boş olmalı (0 rows)

-- 4. Packages tablosunun koordinat kolonlarını kontrol et
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'packages' 
  AND column_name IN ('latitude', 'longitude');

-- 5. Koordinatlı kayıt sayısını kontrol et
SELECT 
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS koordinatli,
  COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS koordinatsiz,
  COUNT(*) AS toplam
FROM packages;

-- BAŞARILI! View temizlendi, koordinatlar fiziksel tabloda.
