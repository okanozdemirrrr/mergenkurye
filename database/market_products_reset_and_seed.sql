-- ============================================
-- MARKET ÜRÜNLER - BÜYÜK TEMİZLİK VE YENİ HASAT
-- ============================================

-- ADIM 1: BÜYÜK TEMİZLİK - TÜM ÜRÜNLER SİLİNİYOR
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Mevcut ürün sayısını al
  SELECT COUNT(*) INTO deleted_count FROM market_products;
  
  -- Tüm ürünleri sil
  DELETE FROM market_products;
  
  -- Rapor
  RAISE NOTICE '🗑️ Silinen ürün sayısı: %', deleted_count;
END $$;

-- ADIM 2: SEQUENCE SIFIRLAMA (ID'ler 1'den başlasın)
ALTER SEQUENCE market_products_id_seq RESTART WITH 1;

-- ADIM 3: YENİ ÜRÜN HASADI - YEMEKLİK MALZEMELER
INSERT INTO market_products (
  name, 
  category, 
  price, 
  unit, 
  description, 
  image_url, 
  emoji, 
  stock_status,
  is_featured,
  sort_order
) VALUES
-- Kinoa ve Chia Tohumları
(
  'Folife Kinoa Tohumu 250 g',
  'yemeklik',
  49.90,
  '250g',
  'FOLIFE marka Folife Kinoa Tohumu 250 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/e89a0dd6-49c7-4a35-8842-08a35b0c73bb.jpeg',
  '🌾',
  'active',
  false,
  1
),
(
  'Folife Chia Tohumu 250 g',
  'yemeklik',
  49.90,
  '250g',
  'FOLIFE marka Folife Chia Tohumu 250 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/9dd55f9f-8881-4aa9-9671-2e97836bb048.jpeg',
  '🌱',
  'active',
  false,
  2
),

-- Nohut
(
  'Anadolu Mutfağı Nohut 1 kg',
  'yemeklik',
  59.50,
  '1 Kg',
  'ANADOLU MUTFAĞI marka Anadolu Mutfağı Nohut 1 kg ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/374f482b-abdf-4f10-9ba4-e791ebc29f7b.png',
  '🫘',
  'active',
  false,
  3
),

-- Piyale Makarna Serisi
(
  'Piyale Yüksük Makarna 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale Yüksük Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/5ab61d43-1ad6-4b5a-8ae2-6226d990f1a5.png',
  '🍝',
  'active',
  false,
  4
),
(
  'Piyale Kelebek Makarna 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale Kelebek Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/ab5d9048-3874-4837-9255-da587b5f1778.png',
  '🦋',
  'active',
  false,
  5
),
(
  'Piyale Spagetti 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale Spagetti 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/3a7ab000-3615-4ec8-a83d-c19fadfe2cb8.png',
  '🍝',
  'active',
  true,
  6
),
(
  'Piyale Burgu Makarna 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale Burgu Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/704ca242-c104-4355-a014-d2628a0b2835.png',
  '🌀',
  'active',
  false,
  7
),
(
  'Piyale İnce Uzun Makarna 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale İnce Uzun Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/e73dcfcb-d6c7-4de5-92ff-ac9426f5828d.png',
  '🍝',
  'active',
  false,
  8
),
(
  'Piyale Kuskus 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale Kuskus 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/fd81c87e-8cd5-4837-8a4d-93fce2828f50.jpg',
  '🥘',
  'active',
  false,
  9
),
(
  'Piyale Boncuk Makarna 500 g',
  'yemeklik',
  13.75,
  '500g',
  'PİYALE marka Piyale Boncuk Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/480b4ff0-a703-4dbd-b022-80db272d8a15.png',
  '⚪',
  'active',
  false,
  10
),

-- Barilla Premium Makarna Serisi
(
  'Barilla Casarecce Makarna 500 g',
  'yemeklik',
  79.90,
  '500g',
  'BARİLLA marka Barilla Casarecce Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/0884a598-7b6f-4c2f-a222-bda6227791e5.png',
  '🍝',
  'active',
  true,
  11
),
(
  'Barilla Spagetti Makarna No:5 500 g',
  'yemeklik',
  52.95,
  '500g',
  'BARİLLA marka Barilla Spagetti Makarna No:5 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/ca87b94a-077f-42d2-9f5b-7ca0bcd0870f.jpg',
  '🍝',
  'active',
  true,
  12
),
(
  'Barilla Fusilli (Burgu) Makarna 500 g',
  'yemeklik',
  52.95,
  '500g',
  'BARİLLA marka Barilla Fusilli (Burgu) Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/2a2fbd67-11e7-462b-810c-89af1ade071b.jpg',
  '🌀',
  'active',
  false,
  13
),
(
  'Barilla Penne Rigate (Kalem) Makarna 500 g',
  'yemeklik',
  52.95,
  '500g',
  'BARİLLA marka Barilla Penne Rigate (Kalem) Makarna 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/2afced0c-2466-4d4e-9bf0-488538561288.jpg',
  '🖊️',
  'active',
  false,
  14
),

-- Dola Glutensiz
(
  'Dola Glutensiz Arpa Şehriye 250 g',
  'yemeklik',
  85.00,
  '250g',
  'DOLA marka Dola Glutensiz Arpa Şehriye 250 G ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/b0abfa8a-fab8-4d2d-99c0-7e97aa0f2d47.jpg',
  '🌾',
  'active',
  false,
  15
),

-- Filiz Makarna Serisi
(
  'Filiz Yumurtalı Uzun Erişte 350 g',
  'yemeklik',
  40.95,
  '350g',
  'FİLİZ marka Filiz Yumurtalı Uzun Erişte 350 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/c3c8ea22-381a-4be5-a9be-53df536cc99c.png',
  '🍜',
  'active',
  false,
  16
),
(
  'Filiz Makarna Spaghetti 500 g',
  'yemeklik',
  30.00,
  '500g',
  'FİLİZ marka Filiz Makarna Spaghetti 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/2f44078a-6440-4733-9772-d1d8ec594e3a.png',
  '🍝',
  'active',
  false,
  17
),
(
  'Filiz Makarna İnce Uzun 500 g',
  'yemeklik',
  30.00,
  '500g',
  'FİLİZ marka Filiz Makarna İnce Uzun 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/bfbe173a-8924-4826-bbd9-94728ab8c662.png',
  '🍝',
  'active',
  false,
  18
),
(
  'Filiz Makarna Burgu 500 g',
  'yemeklik',
  30.00,
  '500g',
  'FİLİZ marka Filiz Makarna Burgu 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/de463ea5-03c9-4fb3-a515-168e191be8a0.png',
  '🌀',
  'active',
  false,
  19
),
(
  'Filiz Makarna Fiyonk 500 g',
  'yemeklik',
  30.00,
  '500g',
  'FİLİZ marka Filiz Makarna Fiyonk 500 g ürünü.',
  'https://images.ceptesok.com/product-assets/sub-folder/0859b5cc-037f-44a1-a81c-4cb07865c281.png',
  '🎀',
  'active',
  false,
  20
);

-- ADIM 4: RAPOR
DO $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Yeni eklenen ürün sayısını al
  SELECT COUNT(*) INTO new_count FROM market_products WHERE category = 'yemeklik';
  
  -- Rapor
  RAISE NOTICE '✅ Eklenen yeni ürün sayısı: %', new_count;
  RAISE NOTICE '📦 Kategori: Yemeklik Malzemeler';
  RAISE NOTICE '🎯 Tüm ürünler gerçek resimlerle eklendi!';
END $$;

-- ADIM 5: KONTROL - Eklenen ürünleri listele
SELECT 
  id,
  name,
  price,
  unit,
  CASE 
    WHEN image_url IS NOT NULL THEN '✅ Resim Var'
    ELSE '❌ Resim Yok'
  END as image_status,
  stock_status,
  CASE 
    WHEN is_featured THEN '⭐ Öne Çıkan'
    ELSE ''
  END as featured_status
FROM market_products
WHERE category = 'yemeklik'
ORDER BY sort_order;

-- BAŞARI MESAJI
SELECT 
  '🎉 BÜYÜK TEMİZLİK VE HASAT TAMAMLANDI!' as message,
  (SELECT COUNT(*) FROM market_products WHERE category = 'yemeklik') as total_products,
  'Yemeklik Malzemeler' as category,
  '✅ Tüm ürünler gerçek resimlerle eklendi' as status;
