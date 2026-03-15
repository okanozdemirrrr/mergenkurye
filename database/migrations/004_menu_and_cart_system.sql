-- ============================================
-- 🍔 MENÜ VE SEPET SİSTEMİ
-- ============================================

-- 1. Categories tablosu
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products tablosu
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cart items tablosu (sepet)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    item_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Order items için item_note ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2) DEFAULT 0;

-- 5. Restaurants tablosuna minimum sipariş tutarı ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10, 2) DEFAULT 0;

-- 6. Index'ler
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart_items(customer_id);

-- 7. Öküz Burger restoranını bul veya oluştur
INSERT INTO restaurants (name, minimum_order_value, delivery_fee, rating, estimated_delivery_time, category, is_open, latitude, longitude)
VALUES ('Öküz Burger', 300, 0, 4.8, '25-35 dk', 'Burger', true, 41.492892, 36.081592)
ON CONFLICT DO NOTHING;

-- Öküz Burger ID'sini al (manuel olarak değiştir)
-- Aşağıdaki INSERT'lerde 'OKUZ_BURGER_ID' yerine gerçek UUID'yi koy

-- 8. Kategoriler (Öküz Burger için)
-- NOT: Önce Supabase'de restaurants tablosundan Öküz Burger'in ID'sini al
-- Sonra aşağıdaki INSERT'lerde kullan

-- INSERT INTO categories (restaurant_id, name, display_order) VALUES
-- ('OKUZ_BURGER_ID', 'Menüler', 1),
-- ('OKUZ_BURGER_ID', 'Yan Ürünler', 2),
-- ('OKUZ_BURGER_ID', 'İçecekler', 3),
-- ('OKUZ_BURGER_ID', 'Soslar', 4);

-- 9. Ürünler (Kategorileri oluşturduktan sonra eklenecek)
-- Menüler kategorisi için:
-- INSERT INTO products (restaurant_id, category_id, name, description, price, display_order) VALUES
-- ('OKUZ_BURGER_ID', 'MENULER_CATEGORY_ID', 'Öküz Özel Et & Tavuk', '2 adet burger (1 et, 1 tavuk), patates, içecek', 650, 1),
-- ('OKUZ_BURGER_ID', 'MENULER_CATEGORY_ID', '2''li Efsane', '2 adet özel burger, patates, içecek', 680, 2),
-- ('OKUZ_BURGER_ID', 'MENULER_CATEGORY_ID', '2''li Fırsat', '2 adet burger, patates', 600, 3),
-- ('OKUZ_BURGER_ID', 'MENULER_CATEGORY_ID', 'Baböküz', 'Özel babalık burger', 450, 4),
-- ('OKUZ_BURGER_ID', 'MENULER_CATEGORY_ID', 'Cheese Burger', 'Klasik cheeseburger', 400, 5);

-- Yan Ürünler:
-- INSERT INTO products (restaurant_id, category_id, name, price, display_order) VALUES
-- ('OKUZ_BURGER_ID', 'YAN_URUNLER_CATEGORY_ID', 'Patates', 95, 1),
-- ('OKUZ_BURGER_ID', 'YAN_URUNLER_CATEGORY_ID', 'Soğan Halkası', 95, 2),
-- ('OKUZ_BURGER_ID', 'YAN_URUNLER_CATEGORY_ID', 'Kroket', 60, 3),
-- ('OKUZ_BURGER_ID', 'YAN_URUNLER_CATEGORY_ID', 'Çıtır Tavuk (6 Parça)', 180, 4),
-- ('OKUZ_BURGER_ID', 'YAN_URUNLER_CATEGORY_ID', 'Çıtır Tavuk (9 Parça)', 230, 5);

-- İçecekler:
-- INSERT INTO products (restaurant_id, category_id, name, price, display_order) VALUES
-- ('OKUZ_BURGER_ID', 'ICECEKLER_CATEGORY_ID', 'Pepsi 330ml', 45, 1),
-- ('OKUZ_BURGER_ID', 'ICECEKLER_CATEGORY_ID', 'Yedigün Ayran', 35, 2),
-- ('OKUZ_BURGER_ID', 'ICECEKLER_CATEGORY_ID', 'Su 500ml', 15, 3);

-- Soslar:
-- INSERT INTO products (restaurant_id, category_id, name, price, display_order) VALUES
-- ('OKUZ_BURGER_ID', 'SOSLAR_CATEGORY_ID', 'Ketçap', 10, 1),
-- ('OKUZ_BURGER_ID', 'SOSLAR_CATEGORY_ID', 'Mayonez', 10, 2),
-- ('OKUZ_BURGER_ID', 'SOSLAR_CATEGORY_ID', 'Barbekü Sos', 15, 3),
-- ('OKUZ_BURGER_ID', 'SOSLAR_CATEGORY_ID', 'Ranch Sos', 15, 4),
-- ('OKUZ_BURGER_ID', 'SOSLAR_CATEGORY_ID', 'Acı Sos', 12, 5);

-- ============================================
-- BAŞARILI! Menü sistemi hazır.
-- Manuel adımlar için yukarıdaki yorumları takip et.
-- ============================================
