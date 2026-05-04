-- Packages tablosuna applied_price sütunu ekle
-- Bu sütun, paketin oluşturulduğu andaki restaurant.package_fee değerini saklar (snapshot)

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS applied_price NUMERIC(10, 2);

-- Yorum ekle
COMMENT ON COLUMN packages.applied_price IS 'Paketin oluşturulduğu andaki paket başı ücret (snapshot). Fiyat değişiklikleri geçmiş siparişleri etkilemez.';

-- Mevcut paketlere restoranın güncel package_fee değerini ata
UPDATE packages
SET applied_price = (
  SELECT COALESCE(package_fee, 100)
  FROM restaurants 
  WHERE restaurants.id = packages.restaurant_id
)
WHERE applied_price IS NULL;

-- Restaurant_id NULL olan paketler varsa onlara 100₺ ata
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
  ROUND(AVG(applied_price), 2) as avg_price
FROM packages;
