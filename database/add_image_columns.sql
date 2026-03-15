-- Restoran ve ürünlere görsel alanları ekle

-- Restaurants tablosuna cover_image_url ve logo_url ekle (zaten var, kontrol et)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Products tablosuna image_url ekle
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Categories tablosuna icon_url ekle (opsiyonel)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Products tablosuna is_visible kolonu ekle (vitrinde göster/gizle)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

COMMENT ON COLUMN restaurants.cover_image_url IS 'Restoran kapak fotoğrafı URL';
COMMENT ON COLUMN restaurants.logo_url IS 'Restoran logo URL';
COMMENT ON COLUMN products.image_url IS 'Ürün görseli URL';
COMMENT ON COLUMN products.is_visible IS 'Ürünün müşteri panelinde görünür olup olmadığı';
COMMENT ON COLUMN categories.icon_url IS 'Kategori ikonu URL';
