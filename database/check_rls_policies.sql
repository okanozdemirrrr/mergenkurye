-- =====================================================
-- CHECK RLS POLICIES ON COURIERS TABLE
-- =====================================================
-- Amaç: couriers tablosunda hangi RLS policy'leri var kontrol et
-- =====================================================

-- 1. RLS aktif mi?
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'couriers';

-- 2. Hangi policy'ler var?
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
WHERE tablename = 'couriers';

-- 3. Eğer is_active kontrolü varsa göster
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'couriers'
  AND qual LIKE '%is_active%';
