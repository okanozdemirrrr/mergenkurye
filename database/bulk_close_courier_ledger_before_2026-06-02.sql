-- =============================================================================
-- Toplu kapanış: 02.06.2026 05:00 (GMT+3) ve ÖNCESİ teslim edilen paketler
-- Supabase SQL Editor: Her bölümü TEK SEFERDE seçip çalıştırın (parça parça değil).
-- =============================================================================

-- Kesim sabiti (tüm sorgularda aynı)
-- TIMESTAMPTZ '2026-06-02 05:00:00+03'

-- -----------------------------------------------------------------------------
-- 1) ÖNİZLEME — sadece okur, değiştirmez
-- -----------------------------------------------------------------------------
SELECT 'Açık paket (kapanacak)' AS label, COUNT(*) AS cnt
FROM packages p
WHERE p.status = 'delivered'
  AND p.delivered_at IS NOT NULL
  AND p.delivered_at <= TIMESTAMPTZ '2026-06-02 05:00:00+03'
  AND p.delivered_by_courier_id IS NOT NULL
  AND p.courier_settlement_id IS NULL;

SELECT
  p.delivered_by_courier_id AS courier_id,
  COUNT(*) AS paket,
  COALESCE(SUM(p.amount), 0) AS tahsilat_toplam
FROM packages p
WHERE p.status = 'delivered'
  AND p.delivered_at <= TIMESTAMPTZ '2026-06-02 05:00:00+03'
  AND p.delivered_by_courier_id IS NOT NULL
  AND p.courier_settlement_id IS NULL
GROUP BY p.delivered_by_courier_id
ORDER BY tahsilat_toplam DESC;

-- -----------------------------------------------------------------------------
-- 2) UYGULA — tek transaction (ROLLBACK → önizleme, COMMIT → kalıcı)
--    Tüm bloğu seçip Run (BEGIN … COMMIT/ROLLBACK dahil)
-- -----------------------------------------------------------------------------
BEGIN;

WITH agg AS (
  SELECT
    p.delivered_by_courier_id AS courier_id,
    COALESCE(SUM(p.amount), 0) AS total_collected
  FROM packages p
  WHERE p.status = 'delivered'
    AND p.delivered_at <= TIMESTAMPTZ '2026-06-02 05:00:00+03'
    AND p.delivered_by_courier_id IS NOT NULL
    AND p.courier_settlement_id IS NULL
  GROUP BY p.delivered_by_courier_id
),
ins AS (
  INSERT INTO courier_settlements (
    courier_id,
    start_date,
    end_date,
    amount_paid,
    notes,
    created_by
  )
  SELECT
    a.courier_id,
    DATE '2020-01-01',
    DATE '2026-06-01',
    a.total_collected,
    'Toplu kapanış: 02.06.2026 05:00 öncesi teslimler (migration)',
    'bulk_close_sql'
  FROM agg a
  RETURNING id, courier_id
)
UPDATE packages p
SET
  courier_settlement_id = ins.id,
  courier_settled_at = TIMESTAMPTZ '2026-06-02 05:00:00+03'
FROM ins
WHERE p.delivered_by_courier_id = ins.courier_id
  AND p.status = 'delivered'
  AND p.delivered_at <= TIMESTAMPTZ '2026-06-02 05:00:00+03'
  AND p.courier_settlement_id IS NULL;

SELECT 'Kapanan paket (bu kesimde, mutabakatlı)' AS label, COUNT(*) AS cnt
FROM packages p
WHERE p.status = 'delivered'
  AND p.delivered_at <= TIMESTAMPTZ '2026-06-02 05:00:00+03'
  AND p.courier_settlement_id IS NOT NULL;

-- Önce test: ROLLBACK;  — Sonra kalıcı: COMMIT;
ROLLBACK;
