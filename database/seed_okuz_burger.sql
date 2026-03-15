-- ============================================
-- 🍔 ÖKÜZ BURGER SEED DATA
-- ============================================
-- Bu dosyayı çalıştırmadan önce:
-- 1. migration 004'ü çalıştır
-- 2. Aşağıdaki 'RESTAURANT_ID_BURAYA' kısmını Öküz Burger'in gerçek UUID'si ile değiştir

-- Öküz Burger'i bul veya oluştur
DO $$
DECLARE
    restaurant_uuid UUID;
    menuler_cat_id UUID;
    yan_urunler_cat_id UUID;
    icecekler_cat_id UUID;
    soslar_cat_id UUID;
BEGIN
    -- Öküz Burger'i bul veya oluştur
    INSERT INTO restaurants (name, minimum_order_value, delivery_fee, rating, estimated_delivery_time, category, is_open, latitude, longitude)
    VALUES ('Öküz Burger', 300, 0, 4.8, '25-35 dk', 'Burger', true, 41.492892, 36.081592)
    ON CONFLICT (name) DO UPDATE SET minimum_order_value = 300
    RETURNING id INTO restaurant_uuid;

    -- Eğer INSERT çalışmadıysa (conflict), ID'yi SELECT ile al
    IF restaurant_uuid IS NULL THEN
        SELECT id INTO restaurant_uuid FROM restaurants WHERE name = 'Öküz Burger' LIMIT 1;
    END IF;

    -- Kategorileri oluştur
    INSERT INTO categories (restaurant_id, name, display_order) VALUES
    (restaurant_uuid, 'Menüler', 1) RETURNING id INTO menuler_cat_id;
    
    INSERT INTO categories (restaurant_id, name, display_order) VALUES
    (restaurant_uuid, 'Yan Ürünler', 2) RETURNING id INTO yan_urunler_cat_id;
    
    INSERT INTO categories (restaurant_id, name, display_order) VALUES
    (restaurant_uuid, 'İçecekler', 3) RETURNING id INTO icecekler_cat_id;
    
    INSERT INTO categories (restaurant_id, name, display_order) VALUES
    (restaurant_uuid, 'Soslar', 4) RETURNING id INTO soslar_cat_id;

    -- MENÜLER
    INSERT INTO products (restaurant_id, category_id, name, description, price, display_order) VALUES
    (restaurant_uuid, menuler_cat_id, 'Öküz Özel Et & Tavuk', '2 adet burger (1 et, 1 tavuk), patates, içecek', 650, 1),
    (restaurant_uuid, menuler_cat_id, '2''li Efsane', '2 adet özel burger, patates, içecek', 680, 2),
    (restaurant_uuid, menuler_cat_id, '2''li Fırsat', '2 adet burger, patates', 600, 3),
    (restaurant_uuid, menuler_cat_id, 'Baböküz', 'Özel babalık burger, patates, içecek', 450, 4),
    (restaurant_uuid, menuler_cat_id, 'Cheese Burger', 'Klasik cheeseburger, cheddar peyniri', 400, 5);

    -- YAN ÜRÜNLER
    INSERT INTO products (restaurant_id, category_id, name, description, price, display_order) VALUES
    (restaurant_uuid, yan_urunler_cat_id, 'Patates', 'Çıtır patates kızartması', 95, 1),
    (restaurant_uuid, yan_urunler_cat_id, 'Soğan Halkası', 'Çıtır soğan halkaları', 95, 2),
    (restaurant_uuid, yan_urunler_cat_id, 'Kroket', 'Patates kroket', 60, 3),
    (restaurant_uuid, yan_urunler_cat_id, 'Çıtır Tavuk (6 Parça)', '6 parça çıtır tavuk', 180, 4),
    (restaurant_uuid, yan_urunler_cat_id, 'Çıtır Tavuk (9 Parça)', '9 parça çıtır tavuk', 230, 5);

    -- İÇECEKLER
    INSERT INTO products (restaurant_id, category_id, name, description, price, display_order) VALUES
    (restaurant_uuid, icecekler_cat_id, 'Pepsi 330ml', 'Soğuk Pepsi', 45, 1),
    (restaurant_uuid, icecekler_cat_id, 'Yedigün Ayran', 'Taze ayran', 35, 2),
    (restaurant_uuid, icecekler_cat_id, 'Su 500ml', 'İçme suyu', 15, 3);

    -- SOSLAR
    INSERT INTO products (restaurant_id, category_id, name, description, price, display_order) VALUES
    (restaurant_uuid, soslar_cat_id, 'Ketçap', 'Domates ketçap', 10, 1),
    (restaurant_uuid, soslar_cat_id, 'Mayonez', 'Kremsi mayonez', 10, 2),
    (restaurant_uuid, soslar_cat_id, 'Barbekü Sos', 'Özel barbekü sosu', 15, 3),
    (restaurant_uuid, soslar_cat_id, 'Ranch Sos', 'Ranch sos', 15, 4),
    (restaurant_uuid, soslar_cat_id, 'Acı Sos', 'Acı biber sosu', 12, 5);

    RAISE NOTICE 'Öküz Burger menüsü başarıyla oluşturuldu! Restaurant ID: %', restaurant_uuid;
END $$;
