/**
 * @file database/check_financial_architecture.sql
 * @description Finansal mimari kontrol sorguları
 * 
 * Supabase SQL Editor'de çalıştırılabilir
 */

-- ============================================================================
-- 1. RESTAURANT_DEBTS TABLOSU KONTROLÜ
-- ============================================================================

-- Tablo var mı?
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'restaurant_debts'
) as table_exists;

-- Kolonları kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_debts'
ORDER BY ordinal_position;

-- Örnek kayıt var mı?
SELECT COUNT(*) as total_records FROM restaurant_debts;

-- Son 5 kayıt
SELECT 
    id,
    restaurant_id,
    debt_date,
    amount,
    package_count,
    package_fee,
    status,
    created_at
FROM restaurant_debts
ORDER BY created_at DESC
LIMIT 5;


-- ============================================================================
-- 2. RESTAURANT_PAYMENT_TRANSACTIONS TABLOSU KONTROLÜ
-- ============================================================================

-- Tablo var mı?
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'restaurant_payment_transactions'
) as table_exists;

-- Kolonları kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_payment_transactions'
ORDER BY ordinal_position;

-- Örnek kayıt var mı?
SELECT COUNT(*) as total_records FROM restaurant_payment_transactions;


-- ============================================================================
-- 3. TRIGGER KONTROLÜ
-- ============================================================================

-- Trigger var mı?
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_restaurant_debt';

-- Fonksiyon var mı?
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'create_restaurant_debt_on_delivery';


-- ============================================================================
-- 4. SQL FONKSİYON KONTROLÜ
-- ============================================================================

-- Fonksiyon var mı?
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'get_restaurant_financial_summary';

-- Fonksiyonu test et (örnek restaurant_id ile)
-- NOT: Gerçek bir restaurant_id kullanın
-- SELECT * FROM get_restaurant_financial_summary(
--     'your-restaurant-uuid-here'::UUID,
--     '2024-01-01'::DATE,
--     CURRENT_DATE
-- );


-- ============================================================================
-- 5. PACKAGES TABLOSU KONTROLÜ
-- ============================================================================

-- picked_up_at kolonu var mı?
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'packages' 
    AND column_name = 'picked_up_at'
) as picked_up_at_exists;

-- courier_id kolonu var mı?
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'packages' 
    AND column_name = 'courier_id'
) as courier_id_exists;

-- İptal edilmiş ama kurye almış paketler var mı?
SELECT 
    COUNT(*) as cancelled_with_courier,
    SUM(CASE WHEN picked_up_at IS NOT NULL THEN 1 ELSE 0 END) as with_picked_up,
    SUM(CASE WHEN courier_id IS NOT NULL THEN 1 ELSE 0 END) as with_courier_id
FROM packages
WHERE status = 'cancelled';


-- ============================================================================
-- 6. TEST SENARYOSU - İPTAL EDGE-CASE
-- ============================================================================

-- İptal edilmiş ama kurye almış paketlerin masraf kayıtları
SELECT 
    p.id as package_id,
    p.order_number,
    p.status,
    p.picked_up_at,
    p.courier_id,
    rd.id as debt_id,
    rd.amount as debt_amount,
    rd.package_count,
    rd.package_fee,
    rd.created_at as debt_created_at
FROM packages p
LEFT JOIN restaurant_debts rd ON rd.restaurant_id = p.restaurant_id 
    AND rd.debt_date = p.delivered_at::DATE
WHERE p.status = 'cancelled'
  AND (p.picked_up_at IS NOT NULL OR p.courier_id IS NOT NULL)
ORDER BY p.created_at DESC
LIMIT 10;


-- ============================================================================
-- 7. FİNANSAL ÖZET - TÜM RESTORANLAR
-- ============================================================================

-- Her restoranın finansal durumu
SELECT 
    r.id,
    r.name,
    r.package_fee,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'delivered') as delivered_count,
    COUNT(DISTINCT rd.id) as debt_count,
    COALESCE(SUM(rd.amount), 0) as total_debt,
    COALESCE(SUM(rpt.amount_paid), 0) as total_paid
FROM restaurants r
LEFT JOIN packages p ON p.restaurant_id = r.id
LEFT JOIN restaurant_debts rd ON rd.restaurant_id = r.id AND rd.status = 'pending'
LEFT JOIN restaurant_payment_transactions rpt ON rpt.restaurant_id = r.id
GROUP BY r.id, r.name, r.package_fee
ORDER BY total_debt DESC;


-- ============================================================================
-- BAŞARILI KONTROL MESAJI
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Finansal Mimari Kontrol Sorguları Tamamlandı!';
    RAISE NOTICE '📊 Yukarıdaki sonuçları inceleyin';
    RAISE NOTICE '⚠️ Eğer tablo/trigger/fonksiyon yoksa migration çalıştırın';
END $$;
