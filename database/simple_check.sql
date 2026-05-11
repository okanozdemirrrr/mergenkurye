-- Basit Kontrol Sorguları (Supabase SQL Editor için)

-- 1. restaurant_debts tablosu var mı?
SELECT 'restaurant_debts' as table_name, 
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_debts') as exists;

-- 2. restaurant_payment_transactions tablosu var mı?
SELECT 'restaurant_payment_transactions' as table_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_payment_transactions') as exists;

-- 3. Trigger var mı?
SELECT 'trigger_create_restaurant_debt' as trigger_name,
       EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_create_restaurant_debt') as exists;

-- 4. Fonksiyon var mı?
SELECT 'get_restaurant_financial_summary' as function_name,
       EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_restaurant_financial_summary') as exists;

-- 5. restaurant_debts kolonları
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurant_debts' 
ORDER BY ordinal_position;
