-- =====================================================
-- Migration 005: READY Status Sistemi
-- Restoran "Hazır" onayı olmadan kurye atanamaz
-- =====================================================

-- ADIM 1: Mevcut constraint'i kaldır
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_status_check;

-- ADIM 2: Yeni status constraint ekle (ready dahil)
ALTER TABLE packages 
ADD CONSTRAINT packages_status_check 
CHECK (status IN ('new_order', 'ready', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled'));

-- ADIM 3: ready_at timestamp sütunu ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;

-- ADIM 4: Mevcut 'waiting' statuslerini 'new_order'a çevir
UPDATE packages 
SET status = 'new_order' 
WHERE status = 'waiting';

-- ADIM 5: Restaurants tablosuna minimum_order_value ekle (yoksa)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2) DEFAULT 300.00;

-- ADIM 6: Products tablosuna is_available (stok durumu) ekle
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- ADIM 7: Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_status_ready ON packages(status) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_packages_restaurant_status ON packages(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_restaurant_available ON products(restaurant_id, is_available);

-- ADIM 8: Realtime için packages tablosunu yayınla
ALTER PUBLICATION supabase_realtime ADD TABLE packages;

COMMENT ON COLUMN packages.ready_at IS 'Restoranın "Teslimata Hazır" butonuna bastığı zaman';
COMMENT ON COLUMN products.is_available IS 'Ürün stokta var mı? (false ise müşteri görmez)';
COMMENT ON COLUMN restaurants.minimum_order_value IS 'Restoran minimum sepet tutarı (TL)';
