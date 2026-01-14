-- KURYE ATAMA SORUNUNU DEBUG ET

-- 1. Couriers tablosundaki tüm ID'ler
SELECT 'COURIERS TABLOSU - MEVCUT KURYELER:' as info;
SELECT id, username, full_name, is_active FROM couriers ORDER BY full_name;

-- 2. Packages tablosundaki foreign key kontrolü
SELECT 'FOREIGN KEY DURUMU:' as info;
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'packages' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'courier_id';

-- 3. Profiles tablosunda kurye var mı? (eski sistem)
SELECT 'PROFILES TABLOSU - ESKİ SİSTEM:' as info;
SELECT id, full_name FROM profiles WHERE full_name IS NOT NULL ORDER BY full_name;
