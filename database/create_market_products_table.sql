-- ============================================
-- MARKET ÜRÜNLER TABLOSU - SÜPERMARKET CMS
-- ============================================

-- Market ürünleri tablosu
CREATE TABLE IF NOT EXISTS market_products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  discount_price DECIMAL(10, 2),
  discount_percentage INTEGER,
  unit VARCHAR(50) NOT NULL DEFAULT '1 Adet',
  description TEXT,
  image_url TEXT,
  emoji VARCHAR(10) DEFAULT '📦',
  stock_status VARCHAR(20) DEFAULT 'active' CHECK (stock_status IN ('active', 'out_of_stock', 'inactive')),
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Kategori için index
CREATE INDEX IF NOT EXISTS idx_market_products_category ON market_products(category);

-- Stok durumu için index
CREATE INDEX IF NOT EXISTS idx_market_products_stock_status ON market_products(stock_status);

-- Öne çıkan ürünler için index
CREATE INDEX IF NOT EXISTS idx_market_products_featured ON market_products(is_featured);

-- Sıralama için index
CREATE INDEX IF NOT EXISTS idx_market_products_sort_order ON market_products(sort_order);

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_market_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_market_products_updated_at
BEFORE UPDATE ON market_products
FOR EACH ROW
EXECUTE FUNCTION update_market_products_updated_at();

-- Realtime için publication
ALTER PUBLICATION supabase_realtime ADD TABLE market_products;

-- RLS Politikaları
ALTER TABLE market_products ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (müşteriler için)
CREATE POLICY "Herkes market ürünlerini görebilir"
ON market_products FOR SELECT
USING (true);

-- Admin ekleyebilir
CREATE POLICY "Admin market ürünleri ekleyebilir"
ON market_products FOR INSERT
WITH CHECK (true);

-- Admin güncelleyebilir
CREATE POLICY "Admin market ürünleri güncelleyebilir"
ON market_products FOR UPDATE
USING (true);

-- Admin silebilir
CREATE POLICY "Admin market ürünleri silebilir"
ON market_products FOR DELETE
USING (true);

-- Örnek veriler ekle
INSERT INTO market_products (name, category, price, discount_price, discount_percentage, unit, emoji, is_featured) VALUES
-- Haftanın Fırsatları
('Süt 1L', 'firsatlar', 25.90, 20.72, 20, '1 Adet', '🥛', true),
('Ekmek', 'firsatlar', 5.00, 4.25, 15, '1 Adet', '🍞', true),
('Yumurta 10''lu', 'firsatlar', 45.00, 33.75, 25, '1 Paket', '🥚', true),
('Domates', 'firsatlar', 18.90, 13.23, 30, '1 Kg', '🍅', true),
('Peynir Beyaz', 'firsatlar', 89.90, 80.91, 10, '500g', '🧀', true),

-- Yemeklik Malzemeler
('Makarna', 'yemeklik', 12.50, NULL, NULL, '500g', '🍝', false),
('Pirinç', 'yemeklik', 35.00, NULL, NULL, '1 Kg', '🍚', false),
('Bulgur', 'yemeklik', 28.00, NULL, NULL, '1 Kg', '🌾', false),
('Mercimek', 'yemeklik', 32.00, NULL, NULL, '1 Kg', '🫘', false),
('Salça', 'yemeklik', 22.50, NULL, NULL, '700g', '🥫', false),

-- Et & Tavuk & Şarküteri
('Tavuk But', 'et', 89.90, NULL, NULL, '1 Kg', '🍗', false),
('Kıyma', 'et', 249.90, NULL, NULL, '500g', '🥩', false),
('Sosis', 'et', 45.00, NULL, NULL, '500g', '🌭', false),
('Sucuk', 'et', 125.00, NULL, NULL, '500g', '🥓', false),
('Salam', 'et', 65.00, NULL, NULL, '300g', '🍖', false);

COMMENT ON TABLE market_products IS 'Market ürünleri - Admin CMS ile yönetilir';
COMMENT ON COLUMN market_products.category IS 'Kategori: firsatlar, yemeklik, et, meyve, sut, kahvalti, atistirmalik, icecek, ekmek, dondurulmus';
COMMENT ON COLUMN market_products.stock_status IS 'Stok durumu: active, out_of_stock, inactive';
COMMENT ON COLUMN market_products.is_featured IS 'Öne çıkan ürün mü?';
COMMENT ON COLUMN market_products.sort_order IS 'Sıralama önceliği (küçükten büyüğe)';

-- Başarı mesajı
SELECT 'Market ürünler tablosu başarıyla oluşturuldu! 🛒' as message;
