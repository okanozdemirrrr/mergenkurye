-- MÜŞTERİ İSİMLERİNİ DÜZELT
-- Email yerine gerçek isim olmalı

-- 1. Önce kontrol et: Kaç kayıt etkilenecek?
SELECT 
  COUNT(*) AS etkilenecek_kayit_sayisi
FROM packages
WHERE customer_name LIKE '%@%';

-- 2. Email olan tüm müşteri isimlerini düzelt
UPDATE packages
SET customer_name = 'Müşteri'
WHERE customer_name LIKE '%@%';

-- 3. Özel olarak okanpro44 olanları düzelt
UPDATE packages
SET customer_name = 'Okan'
WHERE customer_name = 'okanpro44@gmail.com';

-- 4. Kontrol et: Düzeldi mi?
SELECT 
  id,
  order_number,
  customer_name,
  customer_phone,
  status,
  created_at
FROM packages
WHERE customer_name IN ('Okan', 'Müşteri')
ORDER BY created_at DESC
LIMIT 10;

-- 5. Tüm müşteri isimlerini kontrol et
SELECT 
  customer_name,
  COUNT(*) AS adet
FROM packages
GROUP BY customer_name
ORDER BY adet DESC;

-- BAŞARILI! Müşteri isimleri düzeltildi.
