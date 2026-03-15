-- ============================================
-- 🍽️ RESTORAN SİSTEMİ GELİŞTİRME
-- ============================================

-- 1. Restaurants tablosuna yeni alanlar ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2, 1) DEFAULT 4.5,
ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_delivery_time TEXT DEFAULT '20-30 dk',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Genel',
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_campaign BOOLEAN DEFAULT false;

-- 2. Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_open ON restaurants(is_open);

-- 3. Test verisi güncelleme (mevcut restoranlar için)
-- UPDATE restaurants SET 
--   latitude = 41.492892,
--   longitude = 36.081592,
--   rating = 4.5,
--   min_order_amount = 150,
--   estimated_delivery_time = '20-30 dk',
--   category = 'Burger',
--   is_open = true,
--   has_campaign = false
-- WHERE latitude IS NULL;

-- ============================================
-- BAŞARILI! Restoran sistemi geliştirildi.
-- ============================================
