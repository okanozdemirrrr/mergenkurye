-- =============================================================================
-- Kurye mutabakat geçmişini sıfırla (kalıcı)
-- 1) Tüm teslim edilmiş paketleri tahsilat arşivine al (cari tekrar şişmesin)
-- 2) Paket ↔ mutabakat bağını kaldır
-- 3) courier_settlements tablosunu boşalt
--
-- ÖNCE: database/add_courier_tahsilat_archived_at.sql
-- ÖNCE: database/fix_courier_settlements_rls.sql (gerekirse)
-- Supabase SQL Editor — tek seferde veya adım adım.
-- Son satırı COMMIT yapın (ROLLBACK sadece deneme içindir).
-- =============================================================================

BEGIN;

-- Özet (önce)
SELECT 'courier_settlements (önce)' AS label, COUNT(*)::bigint AS cnt FROM courier_settlements
UNION ALL
SELECT 'mutabakatlı paket (önce)', COUNT(*) FROM packages WHERE courier_settlement_id IS NOT NULL
UNION ALL
SELECT 'açık ledger paket (önce)', COUNT(*) FROM packages
  WHERE status = 'delivered'
    AND delivered_by_courier_id IS NOT NULL
    AND courier_settlement_id IS NULL
    AND courier_tahsilat_archived_at IS NULL
    AND courier_settled_at IS NULL;

-- Eski teslimler: tahsilat carisinde sayılmasın
UPDATE packages
SET
  courier_tahsilat_archived_at = NOW(),
  courier_settled_at = COALESCE(courier_settled_at, settled_at, NOW())
WHERE status = 'delivered'
  AND delivered_by_courier_id IS NOT NULL
  AND courier_tahsilat_archived_at IS NULL;

-- Mutabakat bağlantısını kaldır (FK: settlement silinince zaten NULL olur; açıkça da temizle)
UPDATE packages
SET courier_settlement_id = NULL
WHERE courier_settlement_id IS NOT NULL;

-- Tüm mutabakat fişlerini sil
DELETE FROM courier_settlements;

-- Özet (sonra)
SELECT 'courier_settlements (sonra)' AS label, COUNT(*)::bigint AS cnt FROM courier_settlements
UNION ALL
SELECT 'mutabakatlı paket (sonra)', COUNT(*) FROM packages WHERE courier_settlement_id IS NOT NULL
UNION ALL
SELECT 'arşivli teslim (sonra)', COUNT(*) FROM packages
  WHERE status = 'delivered' AND courier_tahsilat_archived_at IS NOT NULL
UNION ALL
SELECT 'açık ledger paket (sonra)', COUNT(*) FROM packages
  WHERE status = 'delivered'
    AND delivered_by_courier_id IS NOT NULL
    AND courier_settlement_id IS NULL
    AND courier_tahsilat_archived_at IS NULL
    AND courier_settled_at IS NULL;

-- Deneme: ROLLBACK;
COMMIT;
