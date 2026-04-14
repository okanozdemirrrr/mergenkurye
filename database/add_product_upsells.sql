-- ============================================
-- 🔗 ÜRÜN YAN ÜRÜNLERİ (CROSS-SELL) SİSTEMİ
-- ============================================

-- SEÇENEK 1: Basit yaklaşım - products tablosuna JSONB sütunu ekle
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS upsell_product_ids TEXT[] DEFAULT '{}';

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_products_upsell_ids ON products USING GIN (upsell_product_ids);

-- SEÇENEK 2: İlişkisel tablo (daha esnek ama karmaşık)
-- CREATE TABLE IF NOT EXISTS product_upsells (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
--   upsell_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
--   display_order INTEGER DEFAULT 0,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(product_id, upsell_product_id)
-- );

-- CREATE INDEX IF NOT EXISTS idx_product_upsells_product_id ON product_upsells(product_id);
-- CREATE INDEX IF NOT EXISTS idx_product_upsells_upsell_id ON product_upsells(upsell_product_id);

-- ✅ TAMAMLANDI!
-- Artık her ürün için yan ürünler tanımlanabilir
-- Örnek kullanım:
-- UPDATE products SET upsell_product_ids = ARRAY['product-id-1', 'product-id-2'] WHERE id = 'main-product-id';
