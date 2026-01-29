-- okanpro44@gmail.com'u bul

-- 1. full_name'de ara
SELECT 
  id,
  full_name,
  password,
  status,
  is_active
FROM couriers
WHERE full_name LIKE '%okanpro%';

-- 2. password'de ara (eğer yanlışlıkla oraya yazılmışsa)
SELECT 
  id,
  full_name,
  password,
  status
FROM couriers
WHERE password LIKE '%okanpro%';

-- 3. Tüm kuryeler
SELECT 
  id,
  full_name,
  status,
  is_active,
  created_at
FROM couriers
ORDER BY created_at DESC;
