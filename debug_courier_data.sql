-- KURYE VERİSİ DEBUG
-- okanpro44@gmail.com nereden geliyor?

-- 1. Couriers tablosunun yapısını kontrol et
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'couriers'
ORDER BY ordinal_position;

-- 2. Tüm kuryeler ve kolonları
SELECT * FROM couriers LIMIT 5;

-- 3. okanpro44 içeren kayıtları ara (tüm kolonlarda)
SELECT 
  id,
  full_name,
  phone,
  created_at
FROM couriers
WHERE 
  full_name LIKE '%okanpro44%' 
  OR phone LIKE '%okanpro44%'
  OR CAST(id AS TEXT) LIKE '%okanpro44%';

-- 4. Packages tablosunda bu kurye ile ilişkili siparişler
SELECT 
  p.id,
  p.customer_name,
  p.courier_id,
  c.full_name AS kurye_adi,
  c.phone AS kurye_telefon
FROM packages p
LEFT JOIN couriers c ON p.courier_id = c.id
WHERE p.courier_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- SONUÇ: 
-- Couriers tablosunda hangi kolonlar var göreceğiz
-- okanpro44@gmail.com hangi kolonda saklanıyor bulacağız
