-- BASIT KURYE KONTROLÜ

-- 1. Couriers tablosu yapısı
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'couriers'
ORDER BY ordinal_position;
