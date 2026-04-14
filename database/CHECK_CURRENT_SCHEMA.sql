-- ============================================
-- 🔍 MEVCUT VERİTABANI YAPISINI KONTROL ET
-- ============================================
-- Bu sorguyu Supabase SQL Editor'de çalıştır
-- Sonuçları Kiro'ya göster

-- 1. Products tablosu sütunları
SELECT 
    '=== PRODUCTS TABLOSU ===' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 2. Restaurants tablosu sütunları
SELECT 
    '=== RESTAURANTS TABLOSU ===' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
ORDER BY ordinal_position;

-- 3. Eksik sütunları kontrol et
SELECT 
    'upsell_product_ids (products)' as sutun,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'upsell_product_ids'
        ) THEN '✅ VAR'
        ELSE '❌ YOK - EKLEMEN GEREKİYOR'
    END as durum
UNION ALL
SELECT 
    'is_active (restaurants)' as sutun,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'restaurants' AND column_name = 'is_active'
        ) THEN '✅ VAR'
        ELSE '❌ YOK - EKLEMEN GEREKİYOR'
    END as durum;

-- 4. Trigger kontrolü
SELECT 
    'trigger_order_status_notification' as trigger_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_order_status_notification'
        ) THEN '⚠️ VAR - KALDIRILMALI'
        ELSE '✅ YOK - SORUN YOK'
    END as durum;
