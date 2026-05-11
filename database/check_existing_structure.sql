-- Mevcut restaurant_debts yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_debts'
ORDER BY ordinal_position;
