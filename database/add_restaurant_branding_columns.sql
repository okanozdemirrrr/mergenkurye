-- Restoran Branding Kolonları Ekleme
-- Mağaza kimliği yönetimi için gerekli alanlar

-- Restaurants tablosuna yeni kolonlar ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS working_hours VARCHAR(100),
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Products tablosuna is_available kolonu ekle (eğer yoksa)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Yorumlar için customer bilgisi foreign key kontrolü
-- (Zaten reviews tablosu var, sadece kontrol)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' 
        AND column_name = 'restaurant_reply'
    ) THEN
        ALTER TABLE reviews ADD COLUMN restaurant_reply TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' 
        AND column_name = 'replied_at'
    ) THEN
        ALTER TABLE reviews ADD COLUMN replied_at TIMESTAMPTZ;
    END IF;
END $$;

-- Storage bucket kontrolü (manuel olarak Supabase Dashboard'dan oluşturulmalı)
-- Bucket adı: restaurant-images
-- Public: true
-- Allowed MIME types: image/*

COMMENT ON COLUMN restaurants.description IS 'Restoran açıklaması - müşteri panelinde gösterilir';
COMMENT ON COLUMN restaurants.working_hours IS 'Çalışma saatleri - örn: 09:00 - 23:00';
COMMENT ON COLUMN restaurants.cover_image_url IS 'Kapak fotoğrafı URL - müşteri paneli hero section';
COMMENT ON COLUMN restaurants.logo_url IS 'Logo URL - müşteri paneli ve restoran paneli';
COMMENT ON COLUMN products.is_available IS 'Ürün stok durumu - false ise müşteri panelinde gizlenir';
COMMENT ON COLUMN reviews.restaurant_reply IS 'Restoran yanıtı - müşteriye bildirim gönderilir';
COMMENT ON COLUMN reviews.replied_at IS 'Yanıt tarihi';
