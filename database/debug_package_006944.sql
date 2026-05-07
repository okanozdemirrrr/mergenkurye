-- Sipariş #006944'ü kontrol et
-- Bu sorgu ile paketin var olup olmadığını ve detaylarını görebiliriz

-- 1. Order number ile ara
SELECT 
  id,
  order_number,
  restaurant_id,
  customer_name,
  amount,
  status,
  courier_id,
  created_at
FROM packages
WHERE order_number = '006944';

-- 2. Eğer bulunamazsa, benzer order number'ları ara
SELECT 
  id,
  order_number,
  restaurant_id,
  customer_name,
  amount,
  status,
  courier_id,
  created_at
FROM packages
WHERE order_number LIKE '%6944%'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Son oluşturulan paketleri göster (belki yeni bir test paketi)
SELECT 
  id,
  order_number,
  restaurant_id,
  customer_name,
  amount,
  status,
  courier_id,
  created_at
FROM packages
ORDER BY created_at DESC
LIMIT 20;
