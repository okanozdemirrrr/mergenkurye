-- ============================================
-- RESTORAN BRANDING SÜTUNLARI EKLEME
-- ============================================
-- Restoranların mağaza kimliği için gerekli sütunlar

-- 1. Description (Açıklama) sütunu ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Working Hours (Çalışma Saatleri) sütunu ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS working_hours VARCHAR(100);

-- 3. Cover Image URL (Kapak Fotoğrafı) sütunu ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 4. Logo URL sütunu ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Yorumlar
COMMENT ON COLUMN restaurants.description IS 'Restoran açıklaması/tanıtımı';
COMMENT ON COLUMN restaurants.working_hours IS 'Çalışma saatleri (Örn: 09:00 - 23:00)';
COMMENT ON COLUMN restaurants.cover_image_url IS 'Kapak fotoğrafı URL';
COMMENT ON COLUMN restaurants.logo_url IS 'Logo URL';

-- Kontrol
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN ('description', 'working_hours', 'cover_image_url', 'logo_url')
ORDER BY column_name;

-- Başarı mesajı
SELECT '✅ Restoran branding sütunları başarıyla eklendi!' as message;
