-- ============================================
-- FIX: delivered_by_courier_id NULL olan paketleri düzelt
-- ============================================
-- Problem: 5 paket teslim edilmiş ama delivered_by_courier_id NULL
-- Çözüm: courier_id'yi delivered_by_courier_id'ye kopyala
-- ============================================

-- 1. Önce kontrol et (kaç paket etkilenecek)
SELECT 
    id,
    order_number,
    customer_name,
    courier_id,
    delivered_by_courier_id,
    delivered_at
FROM packages
WHERE status = 'delivered'
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL
ORDER BY delivered_at DESC;

-- 2. Düzeltme yap
UPDATE packages
SET delivered_by_courier_id = courier_id
WHERE status = 'delivered'
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL;

-- 3. Sonucu kontrol et
SELECT 
    COUNT(*) as fixed_count
FROM packages
WHERE status = 'delivered'
  AND delivered_by_courier_id IS NULL;
-- Sonuç: 0 olmalı

-- ============================================
-- AÇIKLAMA:
-- ============================================
-- Bu 5 paket muhtemelen delivered_by_courier_id kolonu eklenmeden
-- önce teslim edilmiş paketler. Şimdi courier_id'lerini
-- delivered_by_courier_id'ye kopyalayarak düzeltiyoruz.
--
-- Etkilenen Paketler:
-- - #005943 (Ahmet Sak)
-- - #005944 (Erkan Atik)
-- - #005942 (Mete Buğra Aslan)
-- - #005945 (Mete Buğra Aslan)
-- - #005940 (Mete Buğra Aslan)
-- ============================================
