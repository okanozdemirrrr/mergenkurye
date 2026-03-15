-- ============================================
-- ÖKÜZ BURGER MENÜ DÜZELTMESİ
-- ============================================

-- 1. Önce Öküz Burger'in ID'sini bulalım
DO $$
DECLARE
    okuz_id UUID;
    menuler_cat_id UUID;
    yan_urunler_cat_id UUID;
    icecekler_cat_id UUID;
    soslar_cat_id UUID;
BEGIN
    -- Öküz Burger'i bul veya oluştur
    SELECT id INTO okuz_id FROM restaurants WHERE name ILIKE '%öküz%burger%' OR name ILIKE '%okuz%burger%' LIMIT 1;
    
    IF okuz_id IS NULL THEN
        INSERT INTO restaurants (name, minimum_order_value, delivery_fee, rating, estimated_delivery_time, category, is_open, latitude, longitude)
        VALUES ('Öküz Burger', 300, 0, 4.8, '25-35 dk', 'Burger', true, 41.492892, 36.081592)
        RETURNING id INTO okuz_id;
        
        RAISE NOTICE 'Öküz Burger oluşturuldu: %', okuz_id;
    ELSE
        RAISE NOTICE 'Öküz Burger bulundu: %', okuz_id;
    END IF;

    -- 2. Eski kategorileri ve ürünleri temizle (eğer varsa)
    DELETE FROM products WHERE restaurant_id = okuz_id;
    DELETE FROM categories WHERE restaurant_id = okuz_id;
    
    RAISE NOTICE 'Eski veriler temizlendi';

    -- 3. Kategorileri oluştur
    INSERT INTO categories (restaurant_id, name, display_order)
    VALUES 
        (okuz_id, 'Menüler', 1),
        (okuz_id, 'Yan Ürünler', 2),
        (okuz_id, 'İçecekler', 3),
        (okuz_id, 'Soslar', 4);
    
    -- Kategori ID'lerini al
    SELECT id INTO menuler_cat_id FROM categories WHERE restaurant_id = okuz_id AND name = 'Menüler' LIMIT 1;
    SELECT id INTO yan_urunler_cat_id FROM categories WHERE restaurant_id = okuz_id AND name = 'Yan Ürünler' LIMIT 1;
    SELECT id INTO icecekler_cat_id FROM categories WHERE restaurant_id = okuz_id AND name = 'İçecekler' LIMIT 1;
    SELECT id INTO soslar_cat_id FROM categories WHERE restaurant_id = okuz_id AND name = 'Soslar' LIMIT 1;
    
    RAISE NOTICE 'Kategoriler oluşturuldu';

    -- 4. Menüler kategorisi ürünleri
    INSERT INTO products (restaurant_id, category_id, name, description, price, is_available, display_order)
    VALUES 
        (okuz_id, menuler_cat_id, 'Öküz Özel Et & Tavuk', '2 adet burger (1 et, 1 tavuk), patates, içecek', 650, true, 1),
        (okuz_id, menuler_cat_id, '2''li Efsane', '2 adet özel burger, patates, içecek', 680, true, 2),
        (okuz_id, menuler_cat_id, '2''li Fırsat', '2 adet burger, patates', 600, true, 3),
        (okuz_id, menuler_cat_id, 'Baböküz', 'Özel babalık burger menüsü', 450, true, 4),
        (okuz_id, menuler_cat_id, 'Cheese Burger Menü', 'Klasik cheeseburger menüsü', 400, true, 5),
        (okuz_id, menuler_cat_id, 'Tavuk Burger Menü', 'Tavuk burger, patates, içecek', 380, true, 6),
        (okuz_id, menuler_cat_id, 'Çocuk Menü', 'Mini burger, patates, içecek', 280, true, 7);

    -- 5. Yan Ürünler
    INSERT INTO products (restaurant_id, category_id, name, description, price, is_available, display_order)
    VALUES 
        (okuz_id, yan_urunler_cat_id, 'Patates Kızartması', 'Çıtır patates kızartması', 95, true, 1),
        (okuz_id, yan_urunler_cat_id, 'Soğan Halkası', 'Çıtır soğan halkası', 95, true, 2),
        (okuz_id, yan_urunler_cat_id, 'Kroket', 'Patates kroket', 60, true, 3),
        (okuz_id, yan_urunler_cat_id, 'Çıtır Tavuk (6 Parça)', '6 parça çıtır tavuk', 180, true, 4),
        (okuz_id, yan_urunler_cat_id, 'Çıtır Tavuk (9 Parça)', '9 parça çıtır tavuk', 230, true, 5),
        (okuz_id, yan_urunler_cat_id, 'Mozzarella Stick', 'Çıtır mozzarella çubukları', 120, true, 6);

    -- 6. İçecekler
    INSERT INTO products (restaurant_id, category_id, name, description, price, is_available, display_order)
    VALUES 
        (okuz_id, icecekler_cat_id, 'Pepsi 330ml', 'Soğuk Pepsi', 45, true, 1),
        (okuz_id, icecekler_cat_id, 'Coca Cola 330ml', 'Soğuk Coca Cola', 45, true, 2),
        (okuz_id, icecekler_cat_id, 'Fanta 330ml', 'Soğuk Fanta', 45, true, 3),
        (okuz_id, icecekler_cat_id, 'Sprite 330ml', 'Soğuk Sprite', 45, true, 4),
        (okuz_id, icecekler_cat_id, 'Yedigün Ayran', 'Taze ayran', 35, true, 5),
        (okuz_id, icecekler_cat_id, 'Su 500ml', 'İçme suyu', 15, true, 6);

    -- 7. Soslar
    INSERT INTO products (restaurant_id, category_id, name, description, price, is_available, display_order)
    VALUES 
        (okuz_id, soslar_cat_id, 'Ketçap', 'Domates ketçap', 10, true, 1),
        (okuz_id, soslar_cat_id, 'Mayonez', 'Klasik mayonez', 10, true, 2),
        (okuz_id, soslar_cat_id, 'Barbekü Sos', 'Barbekü sosu', 15, true, 3),
        (okuz_id, soslar_cat_id, 'Ranch Sos', 'Ranch sosu', 15, true, 4),
        (okuz_id, soslar_cat_id, 'Acı Sos', 'Acı biber sosu', 12, true, 5),
        (okuz_id, soslar_cat_id, 'Sarımsaklı Mayonez', 'Sarımsaklı mayonez', 12, true, 6);

    RAISE NOTICE 'Tüm ürünler eklendi!';
    RAISE NOTICE 'Öküz Burger ID: %', okuz_id;
    
    -- Sonuçları göster
    RAISE NOTICE 'Toplam kategori: %', (SELECT COUNT(*) FROM categories WHERE restaurant_id = okuz_id);
    RAISE NOTICE 'Toplam ürün: %', (SELECT COUNT(*) FROM products WHERE restaurant_id = okuz_id);
END $$;

-- Kontrol sorgusu
SELECT 
    r.name as restoran,
    c.name as kategori,
    c.display_order,
    COUNT(p.id) as urun_sayisi
FROM restaurants r
LEFT JOIN categories c ON c.restaurant_id = r.id
LEFT JOIN products p ON p.category_id = c.id
WHERE r.name ILIKE '%öküz%'
GROUP BY r.name, c.name, c.display_order
ORDER BY c.display_order;
