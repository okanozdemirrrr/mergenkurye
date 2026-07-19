-- =============================================================================
-- 014 — ÖNCÜ DÖNER Legacy Backfill
-- Supabase SQL Editor'da TEK SEFER çalıştırın.
--
-- Ne yapar?
--  1) TX #119 (18.07.2026, 58.412 ₺) → restaurant_settlements fişi
--  2) TX.order_ids paketlerini o fişe bağlar
--  3) Kalan ödenmiş ama fişsiz (orphan) paketler için 2. fiş oluşturur ve bağlar
--
-- Idempotent: aynı notlarla ile tekrar çalıştırırsanız çift fiş açmaz.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_restaurant_id   UUID;
  v_restaurant_name TEXT;
  v_package_fee     NUMERIC(10,2);

  v_tx              RECORD;
  v_settlement_id   UUID;
  v_legacy_id       UUID;

  v_linked_tx       INTEGER;
  v_orphan_count    INTEGER;
  v_orphan_revenue  NUMERIC(10,2);
  v_orphan_courier  NUMERIC(10,2);
  v_orphan_comm     NUMERIC(10,2);
  v_orphan_net      NUMERIC(10,2);
  v_orphan_start    DATE;
  v_orphan_end      DATE;
  v_orphan_linked   INTEGER;
BEGIN
  -- ── 1) Restoran ─────────────────────────────────────────────
  SELECT id, name, COALESCE(package_fee, 100)
  INTO v_restaurant_id, v_restaurant_name, v_package_fee
  FROM restaurants
  WHERE name ILIKE '%ÖNCÜ%DÖNER%'
     OR name ILIKE '%ONCU%DONER%'
     OR id = '84bf23b6-c191-4a1f-b8b7-254f7ff1625b'
  ORDER BY CASE WHEN id = '84bf23b6-c191-4a1f-b8b7-254f7ff1625b' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'ÖNCÜ DÖNER bulunamadı';
  END IF;

  RAISE NOTICE 'Restoran: % (%)', v_restaurant_name, v_restaurant_id;

  -- ── 2) Eski ödeme kaydı (TX #119 / 18.07.2026) ───────────────
  SELECT *
  INTO v_tx
  FROM restaurant_payment_transactions
  WHERE restaurant_id = v_restaurant_id
    AND (
      id = 119
      OR (
        period_start = DATE '2026-07-13'
        AND period_end = DATE '2026-07-18'
        AND ABS(COALESCE(amount_paid, 0) - 58412) < 0.01
      )
    )
  ORDER BY CASE WHEN id = 119 THEN 0 ELSE 1 END, created_at DESC
  LIMIT 1;

  IF v_tx.id IS NULL THEN
    RAISE EXCEPTION 'ÖNCÜ DÖNER için 18.07.2026 legacy ödeme kaydı bulunamadı';
  END IF;

  RAISE NOTICE 'Legacy TX id=% amount=% packages=%',
    v_tx.id, v_tx.amount_paid, v_tx.package_count;

  -- ── 3) TX → restaurant_settlements (yoksa oluştur) ──────────
  SELECT id INTO v_settlement_id
  FROM restaurant_settlements
  WHERE restaurant_id = v_restaurant_id
    AND notes LIKE '%legacy_tx_id=' || v_tx.id::TEXT || '%'
  LIMIT 1;

  IF v_settlement_id IS NULL THEN
    INSERT INTO restaurant_settlements (
      restaurant_id,
      start_date,
      end_date,
      total_revenue,
      courier_cost,
      commission_amount,
      net_paid,
      package_count,
      created_at,
      created_by,
      notes
    ) VALUES (
      v_restaurant_id,
      COALESCE(v_tx.period_start, DATE '2026-07-13'),
      COALESCE(v_tx.period_end, DATE '2026-07-18'),
      COALESCE(v_tx.brut_ciro, 0),
      COALESCE(v_tx.toplam_masraf, 0),
      GREATEST(
        COALESCE(v_tx.brut_ciro, 0)
          - COALESCE(v_tx.toplam_masraf, 0)
          - COALESCE(v_tx.net_hakedis, v_tx.amount_paid, 0),
        0
      ),
      COALESCE(v_tx.net_hakedis, v_tx.amount_paid, 0),
      COALESCE(v_tx.package_count, COALESCE(cardinality(v_tx.order_ids), 0)),
      COALESCE(v_tx.created_at, TIMESTAMPTZ '2026-07-18 06:48:40.947874+00'),
      'legacy_backfill',
      format(
        'LEGACY BACKFILL — TX#%s — %s [legacy_tx_id=%s]',
        v_tx.id,
        COALESCE(v_tx.notes, 'Bakiye Kapatıldı'),
        v_tx.id
      )
    )
    RETURNING id INTO v_settlement_id;

    RAISE NOTICE 'Yeni mutabakat fişi oluşturuldu: %', v_settlement_id;
  ELSE
    RAISE NOTICE 'TX fişi zaten var, atlanıyor: %', v_settlement_id;
  END IF;

  -- ── 4) TX.order_ids paketlerini fişe bağla ──────────────────
  UPDATE packages p
  SET
    restaurant_settlement_id = v_settlement_id,
    restaurant_settled_at = COALESCE(p.restaurant_settled_at, v_tx.created_at, NOW()),
    is_paid_to_restaurant = true
  WHERE p.restaurant_id = v_restaurant_id
    AND p.restaurant_settlement_id IS NULL
    AND (
      (v_tx.order_ids IS NOT NULL AND p.id = ANY (v_tx.order_ids))
      OR (
        p.is_paid_to_restaurant = true
        AND p.restaurant_settled_at IS NOT NULL
        AND p.restaurant_settled_at = v_tx.created_at
      )
    );

  GET DIAGNOSTICS v_linked_tx = ROW_COUNT;
  RAISE NOTICE 'TX paketleri bağlandı: %', v_linked_tx;

  -- Fiş package_count'u gerçek bağlanan sayıya hizala (TX + bu adım)
  UPDATE restaurant_settlements rs
  SET package_count = (
    SELECT COUNT(*) FROM packages WHERE restaurant_settlement_id = rs.id
  )
  WHERE rs.id = v_settlement_id;

  -- ── 5) Kalan orphan paketler (ödendi, fişsiz) → 2. fiş ──────
  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0),
    COALESCE(SUM(
      CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END
    ), 0),
    MIN(
      COALESCE(
        (delivered_at AT TIME ZONE 'Europe/Istanbul')::DATE,
        (created_at AT TIME ZONE 'Europe/Istanbul')::DATE
      )
    ),
    MAX(
      COALESCE(
        (delivered_at AT TIME ZONE 'Europe/Istanbul')::DATE,
        (created_at AT TIME ZONE 'Europe/Istanbul')::DATE
      )
    )
  INTO
    v_orphan_count,
    v_orphan_revenue,
    v_orphan_courier,
    v_orphan_comm,
    v_orphan_start,
    v_orphan_end
  FROM packages
  WHERE restaurant_id = v_restaurant_id
    AND is_paid_to_restaurant = true
    AND restaurant_settlement_id IS NULL;

  IF COALESCE(v_orphan_count, 0) > 0 THEN
    v_orphan_net := v_orphan_revenue - v_orphan_courier - v_orphan_comm;

    SELECT id INTO v_legacy_id
    FROM restaurant_settlements
    WHERE restaurant_id = v_restaurant_id
      AND notes LIKE '%LEGACY_ORPHAN_CATCHUP%'
    LIMIT 1;

    IF v_legacy_id IS NULL THEN
      INSERT INTO restaurant_settlements (
        restaurant_id,
        start_date,
        end_date,
        total_revenue,
        courier_cost,
        commission_amount,
        net_paid,
        package_count,
        created_at,
        created_by,
        notes
      ) VALUES (
        v_restaurant_id,
        COALESCE(v_orphan_start, DATE '2026-07-06'),
        COALESCE(v_orphan_end, DATE '2026-07-17'),
        v_orphan_revenue,
        v_orphan_courier,
        v_orphan_comm,
        v_orphan_net,
        v_orphan_count,
        COALESCE(v_tx.created_at, NOW()) - INTERVAL '1 second',
        'legacy_backfill',
        format(
          'LEGACY_ORPHAN_CATCHUP — %s adet eski ödenmiş paket (TX dışı) [restaurant=%s]',
          v_orphan_count,
          v_restaurant_id
        )
      )
      RETURNING id INTO v_legacy_id;

      RAISE NOTICE 'Orphan catch-up fişi: % (% paket, net %)',
        v_legacy_id, v_orphan_count, v_orphan_net;
    ELSE
      RAISE NOTICE 'Orphan catch-up fişi zaten var: %', v_legacy_id;
    END IF;

    UPDATE packages
    SET
      restaurant_settlement_id = v_legacy_id,
      restaurant_settled_at = COALESCE(restaurant_settled_at, NOW())
    WHERE restaurant_id = v_restaurant_id
      AND is_paid_to_restaurant = true
      AND restaurant_settlement_id IS NULL;

    GET DIAGNOSTICS v_orphan_linked = ROW_COUNT;
    RAISE NOTICE 'Orphan paketler bağlandı: %', v_orphan_linked;

    UPDATE restaurant_settlements rs
    SET
      package_count = (SELECT COUNT(*) FROM packages WHERE restaurant_settlement_id = rs.id),
      total_revenue = (
        SELECT COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0)
        FROM packages WHERE restaurant_settlement_id = rs.id
      ),
      courier_cost = (
        SELECT COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0)
        FROM packages WHERE restaurant_settlement_id = rs.id
      ),
      commission_amount = (
        SELECT COALESCE(SUM(
          CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END
        ), 0)
        FROM packages WHERE restaurant_settlement_id = rs.id
      ),
      net_paid = (
        SELECT
          COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0)
          - COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0)
          - COALESCE(SUM(
              CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END
            ), 0)
        FROM packages WHERE restaurant_settlement_id = rs.id
      )
    WHERE rs.id = v_legacy_id;
  ELSE
    RAISE NOTICE 'Orphan paket kalmadı — catch-up atlandı';
  END IF;

  -- ── 6) Doğrulama ────────────────────────────────────────────
  RAISE NOTICE '── DOĞRULAMA ──';
  RAISE NOTICE 'Settlements: %',
    (SELECT COUNT(*) FROM restaurant_settlements WHERE restaurant_id = v_restaurant_id);
  RAISE NOTICE 'Paid orphans remaining: %',
    (SELECT COUNT(*) FROM packages
     WHERE restaurant_id = v_restaurant_id
       AND is_paid_to_restaurant = true
       AND restaurant_settlement_id IS NULL);
  RAISE NOTICE 'Unpaid delivered remaining: %',
    (SELECT COUNT(*) FROM packages
     WHERE restaurant_id = v_restaurant_id
       AND is_paid_to_restaurant = false
       AND status = 'delivered');
END $$;

COMMIT;

-- Hızlı kontrol (Editor sonuç paneli)
SELECT
  rs.id,
  rs.created_at AT TIME ZONE 'Europe/Istanbul' AS created_tr,
  rs.start_date,
  rs.end_date,
  rs.package_count,
  rs.total_revenue,
  rs.courier_cost,
  rs.commission_amount,
  rs.net_paid,
  rs.notes,
  (SELECT COUNT(*) FROM packages p WHERE p.restaurant_settlement_id = rs.id) AS linked_packages
FROM restaurant_settlements rs
WHERE rs.restaurant_id = '84bf23b6-c191-4a1f-b8b7-254f7ff1625b'
ORDER BY rs.created_at DESC;
