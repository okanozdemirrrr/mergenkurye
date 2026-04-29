-- Mevcut foreign key constraint'i kaldır
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_restaurant_id_fkey;

-- Yeni constraint ekle - ON DELETE SET NULL ile
ALTER TABLE applications 
ADD CONSTRAINT applications_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL;

-- Alternatif: ON DELETE CASCADE (başvuruyu da sil)
-- ALTER TABLE applications 
-- ADD CONSTRAINT applications_restaurant_id_fkey 
-- FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;