-- =============================================================================
-- Zaten tahsil edilmiş hesap caride tekrar çıkıyorsa
-- Sebep: courier_settlements silinince courier_settlement_id NULL oluyor;
--         yeni mutabakat settled_at yazmıyordu → tüm eski teslimler "açık" sayılıyordu.
--
-- Bu script: TÜM mevcut teslimleri settled_at ile kapatır.
-- Bundan sonra sadece YENİ teslimler (settled_at boş) caride görünür.
-- Supabase SQL Editor → COMMIT
-- =============================================================================

BEGIN;

SELECT 'açık sayılan teslim (önce)' AS label, COUNT(*)::bigint AS cnt
FROM packages p
WHERE p.status = 'delivered'
  AND p.delivered_by_courier_id IS NOT NULL
  AND p.courier_settlement_id IS NULL
  AND COALESCE(p.courier_settled_at, p.settled_at) IS NULL;

UPDATE packages p
SET courier_settled_at = COALESCE(p.courier_settled_at, p.settled_at, NOW())
WHERE p.status = 'delivered'
  AND p.delivered_by_courier_id IS NOT NULL;

-- İsteğe bağlı (kolon varsa): add_courier_tahsilat_archived_at.sql sonrası
-- UPDATE packages p
-- SET courier_tahsilat_archived_at = COALESCE(p.courier_tahsilat_archived_at, NOW())
-- WHERE p.status = 'delivered' AND p.delivered_by_courier_id IS NOT NULL;

SELECT 'açık sayılan teslim (sonra)' AS label, COUNT(*)::bigint AS cnt
FROM packages p
WHERE p.status = 'delivered'
  AND p.delivered_by_courier_id IS NOT NULL
  AND p.courier_settlement_id IS NULL
  AND COALESCE(p.courier_settled_at, p.settled_at) IS NULL;

COMMIT;
