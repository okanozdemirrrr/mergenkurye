-- ============================================
-- 🚀 SÜRÜM NOTLARI MODAL SİSTEMİ
-- ============================================
-- Kullanıcılara v2.0 güncellemesini göstermek için
-- veritabanı destekli modal sistemi

-- 1. Couriers tablosuna kolon ekle
ALTER TABLE couriers
ADD COLUMN IF NOT EXISTS has_seen_v2_update BOOLEAN DEFAULT false;

-- 2. Restaurants tablosuna kolon ekle
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS has_seen_v2_update BOOLEAN DEFAULT false;

-- 3. Admins tablosu varsa ona da ekle (yoksa hata vermesin)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admins') THEN
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS has_seen_v2_update BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_couriers_has_seen_v2_update ON couriers(has_seen_v2_update);
CREATE INDEX IF NOT EXISTS idx_restaurants_has_seen_v2_update ON restaurants(has_seen_v2_update);

-- 5. Yorumlar
COMMENT ON COLUMN couriers.has_seen_v2_update IS 'Kurye v2.0 güncelleme modalını gördü mü?';
COMMENT ON COLUMN restaurants.has_seen_v2_update IS 'Restoran v2.0 güncelleme modalını gördü mü?';

-- ✅ TAMAMLANDI!
-- Artık her kullanıcı tipi için modal gösterim kontrolü yapılabilir
