-- TABLO YAPISINI KONTROL ET
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'couriers'
ORDER BY ordinal_position;

-- MEVCUT VERİLERİ GÖSTER
SELECT * FROM couriers;