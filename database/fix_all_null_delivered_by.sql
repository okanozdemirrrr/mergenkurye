-- =====================================================
-- FIX ALL NULL delivered_by_courier_id
-- =====================================================
-- Amaç: Tüm teslim edilmiş paketlerde delivered_by_courier_id NULL ise
--       courier_id'yi kopyala
-- =====================================================

-- Önce kaç paket etkilenecek kontrol et
SELECT 
    COUNT(*) as affected_count,
    COUNT(DISTINCT courier_id) as unique_couriers
FROM packages
WHERE status = 'delivered'
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL;

-- Düzelt
UPDATE packages
SET delivered_by_courier_id = courier_id
WHERE status = 'delivered'
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL;

-- Sonucu kontrol et
SELECT 
    COUNT(*) as total_delivered,
    COUNT(delivered_by_courier_id) as with_delivered_by,
    COUNT(*) - COUNT(delivered_by_courier_id) as still_null
FROM packages
WHERE status = 'delivered';

-- Bugünkü paketleri kontrol et (İş Günü: 05:00 - 04:59)
SELECT 
    COUNT(*) as today_delivered,
    COUNT(delivered_by_courier_id) as today_with_delivered_by,
    COUNT(*) - COUNT(delivered_by_courier_id) as today_still_null
FROM packages
WHERE status = 'delivered'
  AND delivered_at >= (CURRENT_DATE + INTERVAL '5 hours')
  AND delivered_at < (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '5 hours');
