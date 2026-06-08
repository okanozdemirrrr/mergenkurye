-- =============================================================================
-- Finansal Omurga Sertleştirme (Kurye + Restoran)
-- 1) settled_at ayrıştır: courier_settled_at / restaurant_settled_at
-- 2) Kurye mutabakatını atomik RPC'ye taşı
-- 3) Ücretli iptal kuralını tekleştir (kurye atandığı an ücretli)
-- 4) Restoran masrafını applied_price snapshot üstünden hesapla
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Kolon ayrıştırma
-- ---------------------------------------------------------------------------
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS courier_settled_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS restaurant_settled_at TIMESTAMPTZ NULL;

-- Geriye dönük makul backfill
UPDATE packages
SET courier_settled_at = COALESCE(courier_settled_at, settled_at)
WHERE courier_settlement_id IS NOT NULL
  AND settled_at IS NOT NULL
  AND courier_settled_at IS NULL;

UPDATE packages
SET restaurant_settled_at = COALESCE(restaurant_settled_at, settled_at)
WHERE is_paid_to_restaurant = true
  AND settled_at IS NOT NULL
  AND restaurant_settled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_packages_courier_open_v3
ON packages (delivered_by_courier_id, delivered_at)
WHERE status = 'delivered'
  AND courier_settlement_id IS NULL
  AND courier_settled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_packages_restaurant_unpaid_v2
ON packages (restaurant_id, delivered_at, created_at)
WHERE is_paid_to_restaurant = false;

-- ---------------------------------------------------------------------------
-- 2) Kurye mutabakatı için atomik RPC (ya hep ya hiç)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS save_courier_settlement_transactional(
  UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, DATE, DATE, TIMESTAMPTZ, TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION save_courier_settlement_transactional(
  p_courier_id UUID,
  p_received_amount NUMERIC,
  p_total_cash NUMERIC,
  p_total_card NUMERIC,
  p_total_iban NUMERIC,
  p_total_earned NUMERIC,
  p_remaining_debt NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT 'admin',
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_scope_start TIMESTAMPTZ DEFAULT NULL,
  p_scope_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (settlement_id UUID, packages_marked INTEGER) AS $$
DECLARE
  v_settlement_id UUID;
  v_marked_count INTEGER;
BEGIN
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'courier_id gerekli';
  END IF;
  IF p_received_amount IS NULL OR p_received_amount <= 0 THEN
    RAISE EXCEPTION 'received_amount geçersiz';
  END IF;

  INSERT INTO courier_settlements (
    courier_id,
    start_date,
    end_date,
    amount_paid,
    received_amount,
    total_cash,
    total_card,
    total_iban,
    total_earned,
    remaining_debt,
    notes,
    created_by
  )
  VALUES (
    p_courier_id,
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_end_date, CURRENT_DATE),
    p_received_amount,
    p_received_amount,
    COALESCE(p_total_cash, 0),
    COALESCE(p_total_card, 0),
    COALESCE(p_total_iban, 0),
    COALESCE(p_total_earned, 0),
    COALESCE(p_remaining_debt, 0),
    p_notes,
    COALESCE(p_created_by, 'admin')
  )
  RETURNING id INTO v_settlement_id;

  WITH updated AS (
    UPDATE packages p
    SET
      courier_settlement_id = v_settlement_id,
      courier_settled_at = NOW()
    WHERE p.status = 'delivered'
      AND p.delivered_by_courier_id = p_courier_id
      AND p.courier_settlement_id IS NULL
      AND p.courier_settled_at IS NULL
      AND (
        p_scope_start IS NULL OR p_scope_end IS NULL
        OR (p.delivered_at >= p_scope_start AND p.delivered_at <= p_scope_end)
      )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_marked_count FROM updated;

  IF COALESCE(v_marked_count, 0) = 0 THEN
    RAISE EXCEPTION 'Mutabakat için işaretlenecek açık paket bulunamadı';
  END IF;

  RETURN QUERY SELECT v_settlement_id, v_marked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3) Ücretli iptal kuralı: kurye atandıysa ücretli
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_chargeable_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    NEW.is_chargeable_cancellation := (
      COALESCE(OLD.courier_id, NEW.courier_id) IS NOT NULL
      OR COALESCE(OLD.assigned_at, NEW.assigned_at) IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_chargeable_cancellation ON packages;
CREATE TRIGGER trigger_set_chargeable_cancellation
  BEFORE INSERT OR UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION set_chargeable_cancellation();

-- ---------------------------------------------------------------------------
-- 4) Restoran RPC'leri: masraf = applied_price snapshot
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_restaurant_period_financials(
    p_restaurant_id UUID,
    p_start_date    TIMESTAMP WITH TIME ZONE,
    p_end_date      TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
    v_package_fee        NUMERIC(10,2);
    v_unpaid_rev         NUMERIC(10,2) := 0;
    v_unpaid_count       INT           := 0;
    v_unpaid_commission  NUMERIC(10,2) := 0;
    v_unpaid_cost        NUMERIC(10,2) := 0;
    v_paid_rev           NUMERIC(10,2) := 0;
    v_paid_count         INT           := 0;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    SELECT
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COUNT(*),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END), 0),
      COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0)
    INTO v_unpaid_rev, v_unpaid_count, v_unpaid_commission, v_unpaid_cost
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    SELECT
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COUNT(*)
    INTO v_paid_rev, v_paid_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = true
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    RETURN json_build_object(
      'package_fee', v_package_fee,
      'unpaid_revenue', v_unpaid_rev,
      'unpaid_package_count', v_unpaid_count,
      'unpaid_cost', v_unpaid_cost,
      'unpaid_commission', v_unpaid_commission,
      'net_payable', v_unpaid_rev - v_unpaid_cost - v_unpaid_commission,
      'paid_revenue', v_paid_rev,
      'paid_package_count', v_paid_count,
      'total_package_count', v_unpaid_count + v_paid_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_all_restaurants_unpaid_balances(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date   TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH unpaid AS (
        SELECT
            p.restaurant_id,
            COALESCE(SUM(CASE WHEN p.status = 'delivered' THEN p.amount ELSE 0 END), 0) AS unpaid_rev,
            COUNT(*) AS unpaid_count,
            COALESCE(SUM(CASE WHEN p.status = 'delivered' THEN COALESCE(p.commission_amount, 0) ELSE 0 END), 0) AS unpaid_commission,
            COALESCE(SUM(COALESCE(p.applied_price, r.package_fee, 100)), 0) AS unpaid_cost
        FROM packages p
        JOIN restaurants r ON r.id = p.restaurant_id
        WHERE p.is_paid_to_restaurant = false
          AND (
            (p.status = 'delivered'
             AND (p_start_date IS NULL OR p.delivered_at >= p_start_date)
             AND (p_end_date   IS NULL OR p.delivered_at <= p_end_date))
            OR
            (p.status = 'cancelled' AND p.is_chargeable_cancellation = true
             AND (p_start_date IS NULL OR p.created_at >= p_start_date)
             AND (p_end_date   IS NULL OR p.created_at <= p_end_date))
          )
        GROUP BY p.restaurant_id
    )
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'name', r.name,
        'package_fee', COALESCE(r.package_fee, 100),
        'unpaid_revenue', COALESCE(u.unpaid_rev, 0),
        'unpaid_package_count', COALESCE(u.unpaid_count, 0),
        'unpaid_cost', COALESCE(u.unpaid_cost, 0),
        'unpaid_commission', COALESCE(u.unpaid_commission, 0),
        'current_balance', COALESCE(u.unpaid_rev, 0) - COALESCE(u.unpaid_cost, 0) - COALESCE(u.unpaid_commission, 0)
      )
    ) INTO v_result
    FROM restaurants r
    LEFT JOIN unpaid u ON u.restaurant_id = r.id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_restaurant_payment(
    p_restaurant_id UUID,
    p_end_date      TIMESTAMP WITH TIME ZONE,
    p_notes         TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_package_fee   NUMERIC(10,2);
    v_affected_ids  INTEGER[];
    v_total_revenue NUMERIC(10,2);
    v_package_count INTEGER;
    v_total_cost    NUMERIC(10,2);
    v_total_commission NUMERIC(10,2);
    v_net_amount    NUMERIC(10,2);
    v_oldest_date   DATE;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    SELECT
      array_agg(id),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
      COUNT(*),
      COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0),
      COALESCE(SUM(CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END), 0),
      MIN(COALESCE(delivered_at, created_at))::DATE
    INTO v_affected_ids, v_total_revenue, v_package_count, v_total_cost, v_total_commission, v_oldest_date
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true AND created_at <= p_end_date)
      );

    IF v_package_count = 0 OR v_affected_ids IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Bu tarihe kadar ödenmemiş paket bulunamadı.'
      );
    END IF;

    v_net_amount := v_total_revenue - v_total_cost - v_total_commission;

    UPDATE packages
    SET
      is_paid_to_restaurant = true,
      restaurant_settled_at = NOW()
    WHERE id = ANY(v_affected_ids);

    INSERT INTO restaurant_payment_transactions (
      restaurant_id, transaction_date,
      brut_ciro, toplam_masraf, net_hakedis, amount_paid,
      package_count, order_ids, notes,
      period_start, period_end
    ) VALUES (
      p_restaurant_id, CURRENT_DATE,
      v_total_revenue, v_total_cost,
      GREATEST(v_net_amount, 0), GREATEST(v_net_amount, 0),
      v_package_count, v_affected_ids,
      COALESCE(p_notes, 'Bakiye kapatma — ' || to_char(NOW(), 'DD.MM.YYYY HH24:MI')),
      v_oldest_date, p_end_date::DATE
    );

    RETURN json_build_object(
      'success', true,
      'message', v_package_count || ' paket ödendi olarak işaretlendi.',
      'package_count', v_package_count,
      'revenue', v_total_revenue,
      'cost', v_total_cost,
      'commission', v_total_commission,
      'net_paid', v_net_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
