-- ============================================
-- FIX: Bugün teslim edilen NULL delivered_by_courier_id paketleri
-- ============================================
-- Problem: Bugün (6 Mayıs 2026) teslim edilen 23 paketin
--          delivered_by_courier_id değeri NULL
-- Çözüm: courier_id'yi delivered_by_courier_id'ye kopyala
-- ============================================

-- 1. Önce kontrol et (bugün kaç paket NULL)
SELECT 
    COUNT(*) as null_count,
    MIN(delivered_at) as first_delivery,
    MAX(delivered_at) as last_delivery
FROM packages
WHERE status = 'delivered'
  AND delivered_at >= '2026-05-06T02:00:00.000Z'  -- Bugün sabah 05:00 (UTC+3 = 02:00 UTC)
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL;

-- 2. Detaylı liste
SELECT 
    id,
    order_number,
    customer_name,
    courier_id,
    delivered_by_courier_id,
    delivered_at
FROM packages
WHERE status = 'delivered'
  AND delivered_at >= '2026-05-06T02:00:00.000Z'
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL
ORDER BY delivered_at DESC;

-- 3. Düzeltme yap
UPDATE packages
SET delivered_by_courier_id = courier_id
WHERE status = 'delivered'
  AND delivered_at >= '2026-05-06T02:00:00.000Z'
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL;

-- 4. Sonucu kontrol et (0 olmalı)
SELECT 
    COUNT(*) as remaining_null
FROM packages
WHERE status = 'delivered'
  AND delivered_at >= '2026-05-06T02:00:00.000Z'
  AND delivered_by_courier_id IS NULL;

-- ============================================
-- NOT: Bu SQL'i çalıştırdıktan sonra admin panelini
-- yenile (Ctrl+F5), kuryelerin günlük teslimat sayıları
-- doğru gösterilecek!
-- ============================================
