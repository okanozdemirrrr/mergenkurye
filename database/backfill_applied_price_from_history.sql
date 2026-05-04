-- Eski paketlere applied_price değerini geri yükle
-- Strateji: Her restoranın MEVCUT package_fee değerini kullan
-- (Geçmiş fiyat bilgisi olmadığı için en mantıklı yaklaşım)

UPDATE packages
SET applied_price = (
  SELECT COALESCE(package_fee, 100)
  FROM restaurants 
  WHERE restaurants.id = packages.restaurant_id
)
WHERE applied_price IS NULL;

-- Eğer restaurant_id NULL olan paketler varsa onlara 100₺ ata
UPDATE packages
SET applied_price = 100
WHERE applied_price IS NULL;

-- Kontrol
SELECT 
  COUNT(*) as total_packages,
  COUNT(applied_price) as packages_with_price,
  COUNT(*) - COUNT(applied_price) as packages_without_price,
  MIN(applied_price) as min_price,
  MAX(applied_price) as max_price,
  AVG(applied_price) as avg_price
FROM packages;
