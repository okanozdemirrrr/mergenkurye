-- SON KONTROL VE DÜZELTİM

-- 1. Packages tablosunda olmayan courier_id'leri temizle
UPDATE packages 
SET courier_id = NULL 
WHERE courier_id IS NOT NULL 
  AND courier_id NOT IN (SELECT id FROM couriers);

SELECT 'ESKİ KURYE ID''LERİ TEMİZLENDİ!' as mesaj;

-- 2. Foreign key'i sil
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_courier_id_fkey;

-- 3. Yeni foreign key ekle
ALTER TABLE packages 
ADD CONSTRAINT packages_courier_id_fkey 
FOREIGN KEY (courier_id) 
REFERENCES couriers(id) 
ON DELETE SET NULL;

-- 4. Couriers tablosundaki kuryeler
SELECT 'MEVCUT KURYELER:' as bilgi;
SELECT id, username, full_name, is_active FROM couriers ORDER BY full_name;

-- 5. Packages tablosundaki courier_id'ler
SELECT 'PACKAGES TABLOSUNDA ATANMIŞ KURYELER:' as bilgi;
SELECT DISTINCT courier_id FROM packages WHERE courier_id IS NOT NULL;

SELECT 'TAMAMLANDI! ARTIK PAKET ATAYABİLİRSİN!' as mesaj;
