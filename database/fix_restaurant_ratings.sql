-- Restoran Rating Tutarsızlığı Düzeltmesi
-- Öküz Burger ve diğer restoranların doğru puanlarını ayarla

-- 1. Öküz Burger'in rating'ini 4.0 yap
UPDATE restaurants 
SET rating = 4.0
WHERE name = 'öküzburger' OR name LIKE '%öküz%' OR name LIKE '%Öküz%';

-- 2. Tüm restoranların rating'lerini kontrol et ve null olanları 0 yap
UPDATE restaurants 
SET rating = 0.0
WHERE rating IS NULL;

-- 3. Rating sütununun varsayılan değerini ayarla
ALTER TABLE restaurants 
ALTER COLUMN rating SET DEFAULT 0.0;

-- 4. Kontrol: Tüm restoranların rating'lerini listele
SELECT 
  id,
  name,
  rating,
  CASE 
    WHEN rating IS NULL THEN '⚠️ NULL'
    WHEN rating = 0 THEN '⚠️ Sıfır'
    ELSE '✅ OK'
  END as status
FROM restaurants
ORDER BY name;
