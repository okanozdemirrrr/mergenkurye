-- =============================================================================
-- 016 — TÜM restoranlar: legacy TX → restaurant_settlements backfill
-- ÖNCÜ için 014'ü ÖNCE çalıştırın. Bu script diğer restoranların
-- restaurant_payment_transactions kayıtlarını fişe dönüştürür ve
-- order_ids paketlerini bağlar. Kalan orphan'lar için catch-up fişi açar.
-- Idempotent.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  r_tx              RECORD;
  v_settlement_id   UUID;
  v_package_fee     NUMERIC(10,2);
  v_linked          INTEGER;
  v_resto           RECORD;
  v_orphan_count    INTEGER;
  v_orphan_revenue  NUMERIC(10,2);
  v_orphan_courier  NUMERIC(10,2);
  v_orphan_comm     NUMERIC(10,2);
  v_orphan_net      NUMERIC(10,2);
  v_orphan_start    DATE;
  v_orphan_end      DATE;
  v_legacy_id       UUID;
BEGIN
  -- ── A) Her legacy TX için fiş ────────────────────────────────
  FOR r_tx IN
    SELECT *
    FROM restaurant_payment_transactions
    ORDER BY created_at ASC
  LOOP
    -- Zaten backfill edilmiş mi?
    SELECT id INTO v_settlement_id
    FROM restaurant_settlements
    WHERE restaurant_id = r_tx.restaurant_id
      AND notes LIKE '%legacy_tx_id=' || r_tx.id::TEXT || '%'
    LIMIT 1;

    IF v_settlement_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Aynı dönem+net için yakın zamanda modern fiş varsa TX'i atla
    -- (çift görünmesin); yine de order_ids bağlanacaksa aşağıda güncellenir.
    IF EXISTS (
      SELECT 1 FROM restaurant_settlements rs
      WHERE rs.restaurant_id = r_tx.restaurant_id
        AND rs.start_date IS NOT DISTINCT FROM r_tx.period_start
        AND rs.end_date IS NOT DISTINCT FROM r_tx.period_end
        AND ABS(COALESCE(rs.net_paid, 0) - COALESCE(r_tx.net_hakedis, r_tx.amount_paid, 0)) < 1
        AND rs.notes NOT LIKE '%legacy_tx_id=%'
        AND rs.notes NOT LIKE '%LEGACY_ORPHAN_CATCHUP%'
    ) THEN
      -- Modern fiş var: paketleri o fişe bağla (varsa)
      SELECT id INTO v_settlement_id
      FROM restaurant_settlements rs
      WHERE rs.restaurant_id = r_tx.restaurant_id
        AND rs.start_date IS NOT DISTINCT FROM r_tx.period_start
        AND rs.end_date IS NOT DISTINCT FROM r_tx.period_end
        AND ABS(COALESCE(rs.net_paid, 0) - COALESCE(r_tx.net_hakedis, r_tx.amount_paid, 0)) < 1
      ORDER BY rs.created_at DESC
      LIMIT 1;
    ELSE
      INSERT INTO restaurant_settlements (
        restaurant_id, start_date, end_date,
        total_revenue, courier_cost, commission_amount, net_paid,
        package_count, created_at, created_by, notes
      ) VALUES (
        r_tx.restaurant_id,
        COALESCE(r_tx.period_start, (r_tx.created_at AT TIME ZONE 'Europe/Istanbul')::DATE),
        COALESCE(r_tx.period_end, (r_tx.created_at AT TIME ZONE 'Europe/Istanbul')::DATE),
        COALESCE(r_tx.brut_ciro, 0),
        COALESCE(r_tx.toplam_masraf, 0),
        GREATEST(
          COALESCE(r_tx.brut_ciro, 0)
            - COALESCE(r_tx.toplam_masraf, 0)
            - COALESCE(r_tx.net_hakedis, r_tx.amount_paid, 0),
          0
        ),
        COALESCE(r_tx.net_hakedis, r_tx.amount_paid, 0),
        COALESCE(r_tx.package_count, COALESCE(cardinality(r_tx.order_ids), 0)),
        COALESCE(r_tx.created_at, NOW()),
        'legacy_backfill',
        format(
          'LEGACY BACKFILL — TX#%s — %s [legacy_tx_id=%s]',
          r_tx.id,
          COALESCE(r_tx.notes, 'Eski ödeme'),
          r_tx.id
        )
      )
      RETURNING id INTO v_settlement_id;
    END IF;

    IF v_settlement_id IS NOT NULL AND r_tx.order_ids IS NOT NULL THEN
      UPDATE packages p
      SET
        restaurant_settlement_id = v_settlement_id,
        restaurant_settled_at = COALESCE(p.restaurant_settled_at, r_tx.created_at, NOW()),
        is_paid_to_restaurant = true
      WHERE p.restaurant_id = r_tx.restaurant_id
        AND p.restaurant_settlement_id IS NULL
        AND p.id = ANY (r_tx.order_ids);

      GET DIAGNOSTICS v_linked = ROW_COUNT;
      RAISE NOTICE 'TX#%s → settlement % — % paket bağlandı',
        r_tx.id, v_settlement_id, v_linked;
    END IF;
  END LOOP;

  -- ── B) Restoran bazında kalan orphan catch-up ────────────────
  FOR v_resto IN
    SELECT r.id, r.name, COALESCE(r.package_fee, 100) AS package_fee
    FROM restaurants r
  LOOP
    SELECT
      COUNT(*),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(COALESCE(applied_price, v_resto.package_fee)), 0),
      COALESCE(SUM(
        CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END
      ), 0),
      MIN(COALESCE(
        (delivered_at AT TIME ZONE 'Europe/Istanbul')::DATE,
        (created_at AT TIME ZONE 'Europe/Istanbul')::DATE
      )),
      MAX(COALESCE(
        (delivered_at AT TIME ZONE 'Europe/Istanbul')::DATE,
        (created_at AT TIME ZONE 'Europe/Istanbul')::DATE
      ))
    INTO
      v_orphan_count, v_orphan_revenue, v_orphan_courier, v_orphan_comm,
      v_orphan_start, v_orphan_end
    FROM packages
    WHERE restaurant_id = v_resto.id
      AND is_paid_to_restaurant = true
      AND restaurant_settlement_id IS NULL;

    IF COALESCE(v_orphan_count, 0) = 0 THEN
      CONTINUE;
    END IF;

    v_orphan_net := v_orphan_revenue - v_orphan_courier - v_orphan_comm;

    SELECT id INTO v_legacy_id
    FROM restaurant_settlements
    WHERE restaurant_id = v_resto.id
      AND notes LIKE '%LEGACY_ORPHAN_CATCHUP%'
    LIMIT 1;

    IF v_legacy_id IS NULL THEN
      INSERT INTO restaurant_settlements (
        restaurant_id, start_date, end_date,
        total_revenue, courier_cost, commission_amount, net_paid,
        package_count, created_at, created_by, notes
      ) VALUES (
        v_resto.id,
        COALESCE(v_orphan_start, CURRENT_DATE),
        COALESCE(v_orphan_end, CURRENT_DATE),
        v_orphan_revenue,
        v_orphan_courier,
        v_orphan_comm,
        v_orphan_net,
        v_orphan_count,
        NOW(),
        'legacy_backfill',
        format(
          'LEGACY_ORPHAN_CATCHUP — %s adet eski ödenmiş paket [restaurant=%s]',
          v_orphan_count,
          v_resto.id
        )
      )
      RETURNING id INTO v_legacy_id;
    END IF;

    UPDATE packages
    SET
      restaurant_settlement_id = v_legacy_id,
      restaurant_settled_at = COALESCE(restaurant_settled_at, NOW())
    WHERE restaurant_id = v_resto.id
      AND is_paid_to_restaurant = true
      AND restaurant_settlement_id IS NULL;

    RAISE NOTICE 'Orphan catch-up % (%): % paket → %',
      v_resto.name, v_resto.id, v_orphan_count, v_legacy_id;
  END LOOP;

  RAISE NOTICE '── GLOBAL DOĞRULAMA ──';
  RAISE NOTICE 'Paid orphans remaining (all): %',
    (SELECT COUNT(*) FROM packages
     WHERE is_paid_to_restaurant = true AND restaurant_settlement_id IS NULL);
END $$;

COMMIT;

SELECT
  r.name,
  COUNT(rs.id) AS settlement_count,
  (
    SELECT COUNT(*) FROM packages p
    WHERE p.restaurant_id = r.id
      AND p.is_paid_to_restaurant = true
      AND p.restaurant_settlement_id IS NULL
  ) AS paid_orphans_left,
  (
    SELECT COUNT(*) FROM packages p
    WHERE p.restaurant_id = r.id
      AND p.is_paid_to_restaurant = false
      AND p.status = 'delivered'
  ) AS unpaid_delivered
FROM restaurants r
LEFT JOIN restaurant_settlements rs ON rs.restaurant_id = r.id
GROUP BY r.id, r.name
ORDER BY r.name;
