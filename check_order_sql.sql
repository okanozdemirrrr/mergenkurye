-- 1. Sipariş 5819'u kontrol et
SELECT 'Sipariş 5819 Kontrolü:' as info;
SELECT order_number, customer_name, status, created_at 
FROM packages 
WHERE order_number IN ('5819', '005819');

-- 2. Son 10 siparişi listele
SELECT 'Son 10 Sipariş:' as info;
SELECT order_number, customer_name, status, created_at 
FROM packages 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. En yüksek sipariş numarasını bul
SELECT 'En Yüksek Sipariş Numarası:' as info;
SELECT MAX(order_number::integer) as max_order_number 
FROM packages 
WHERE order_number ~ '^\d+$';

-- 4. Sequence mevcut değerini kontrol et
SELECT 'Sequence Mevcut Değeri:' as info;
SELECT last_value FROM order_number_seq;

-- 5. Sequence'i düzelt (en yüksek sipariş numarasına göre)
SELECT 'Sequence Düzeltiliyor...' as info;
SELECT setval('order_number_seq', 
  (SELECT COALESCE(MAX(order_number::integer), 0) FROM packages WHERE order_number ~ '^\d+$'), 
  true
);

-- 6. Yeni sequence değerini kontrol et
SELECT 'Yeni Sequence Değeri:' as info;
SELECT last_value FROM order_number_seq;
