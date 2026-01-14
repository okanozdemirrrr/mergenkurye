-- FOREIGN KEY SORUNUNU DÜZELT
-- packages tablosu couriers tablosuna bağlı değil, profiles'a bağlı!

-- 1. Eski foreign key'i sil
ALTER TABLE packages 
DROP CONSTRAINT IF EXISTS packages_courier_id_fkey;

-- 2. Yeni foreign key ekle - couriers tablosuna
ALTER TABLE packages 
ADD CONSTRAINT packages_courier_id_fkey 
FOREIGN KEY (courier_id) 
REFERENCES couriers(id) 
ON DELETE SET NULL;

-- 3. Kontrol et
SELECT 'FOREIGN KEY DÜZELTİLDİ! Artık paket atayabilirsin.' as mesaj;
