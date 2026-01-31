-- SAHİPSİZ PAKET TEMİZLİĞİ
-- Courier_id NULL ama status 'on_the_way' olan hatalı kayıtları düzelt

-- 1. Hatalı kayıtları kontrol et
SELECT 
  id,
  order_number,
  customer_name,
  status,
  courier_id,
  created_at
FROM packages
WHERE status = 'on_the_way' 
  AND courier_id IS NULL
ORDER BY created_at DESC;

-- 2. Hatalı kayıtları 'waiting' durumuna çek
UPDATE packages 
SET status = 'waiting' 
WHERE status = 'on_the_way' 
  AND courier_id IS NULL;

-- 3. Diğer hatalı durumları da kontrol et ve düzelt
UPDATE packages 
SET status = 'waiting' 
WHERE status IN ('assigned', 'picking_up', 'on_the_way') 
  AND courier_id IS NULL;

-- 4. Sonuç kontrolü
SELECT 
  status,
  COUNT(*) as adet,
  COUNT(CASE WHEN courier_id IS NULL THEN 1 END) as kuryesiz_adet
FROM packages
WHERE status NOT IN ('delivered', 'cancelled')
GROUP BY status
ORDER BY status;

-- BAŞARILI! Sahipsiz paketler 'waiting' durumuna çekildi.
