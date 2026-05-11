-- Restaurant Payment Transactions tablosunun gerçek şemasını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_payment_transactions'
ORDER BY ordinal_position;

-- RLS politikalarını kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'restaurant_payment_transactions';
