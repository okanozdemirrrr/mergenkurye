-- =============================================================================
-- Kurye Mutabakat / Hakediş - Flag Bazlı RPC'ler
-- =============================================================================

-- 1) Gün Sonu Tahsilat (Atomik)
DROP FUNCTION IF EXISTS process_courier_settlement_flags(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION process_courier_settlement_flags(
  p_courier_id UUID,
  p_created_by TEXT DEFAULT 'admin',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_package_ids INTEGER[];
  v_package_count INTEGER := 0;
  v_total_amount NUMERIC(12,2) := 0;
  v_start_date DATE;
  v_end_date DATE;
  v_total_cash NUMERIC(12,2) := 0;
  v_total_card NUMERIC(12,2) := 0;
  v_total_iban NUMERIC(12,2) := 0;
  v_settlement_id UUID;
BEGIN
  IF p_courier_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'courier_id zorunlu');
  END IF;

  WITH open_rows AS (
    SELECT
      p.id,
      p.amount,
      p.payment_method,
      p.delivered_at
    FROM packages p
    WHERE p.status = 'delivered'
      AND p.delivered_by_courier_id = p_courier_id
      AND COALESCE(p.is_courier_settled, false) = false
    FOR UPDATE
  )
  SELECT
    array_agg(id),
    COUNT(*),
    COALESCE(SUM(amount), 0),
    MIN(delivered_at)::DATE,
    MAX(delivered_at)::DATE,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'iban' THEN amount ELSE 0 END), 0)
  INTO
    v_package_ids,
    v_package_count,
    v_total_amount,
    v_start_date,
    v_end_date,
    v_total_cash,
    v_total_card,
    v_total_iban
  FROM open_rows;

  IF v_package_count = 0 OR v_package_ids IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Mutabakat için açık (is_courier_settled=false) delivered paket yok'
    );
  END IF;

  UPDATE packages
  SET
    is_courier_settled = true,
    courier_settled_at = NOW()
  WHERE id = ANY(v_package_ids);

  INSERT INTO courier_settlements (
    courier_id,
    start_date,
    end_date,
    amount_paid,
    received_amount,
    total_cash,
    total_card,
    total_iban,
    notes,
    created_by
  )
  VALUES (
    p_courier_id,
    COALESCE(v_start_date, CURRENT_DATE),
    COALESCE(v_end_date, CURRENT_DATE),
    v_total_amount,
    v_total_amount,
    v_total_cash,
    v_total_card,
    v_total_iban,
    COALESCE(p_notes, 'Flag bazlı gün sonu tahsilatı'),
    COALESCE(p_created_by, 'admin')
  )
  RETURNING id INTO v_settlement_id;

  RETURN json_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'package_count', v_package_count,
    'total_amount', v_total_amount,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2) Hakediş Ödemesi (Flag Güncelleme)
DROP FUNCTION IF EXISTS process_courier_earnings_payment_flags(UUID, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION process_courier_earnings_payment_flags(
  p_courier_id UUID,
  p_package_rate NUMERIC DEFAULT 0,
  p_created_by TEXT DEFAULT 'admin',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_package_ids INTEGER[];
  v_package_count INTEGER := 0;
  v_earnings_amount NUMERIC(12,2) := 0;
BEGIN
  IF p_courier_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'courier_id zorunlu');
  END IF;

  WITH unpaid_earnings AS (
    SELECT p.id
    FROM packages p
    WHERE p.status = 'delivered'
      AND p.delivered_by_courier_id = p_courier_id
      AND COALESCE(p.is_courier_earned_paid, false) = false
    FOR UPDATE
  )
  SELECT array_agg(id), COUNT(*)
  INTO v_package_ids, v_package_count
  FROM unpaid_earnings;

  IF v_package_count = 0 OR v_package_ids IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Hakediş ödemesi için açık (is_courier_earned_paid=false) delivered paket yok'
    );
  END IF;

  UPDATE packages
  SET is_courier_earned_paid = true
  WHERE id = ANY(v_package_ids);

  v_earnings_amount := v_package_count * COALESCE(p_package_rate, 0);

  RETURN json_build_object(
    'success', true,
    'package_count', v_package_count,
    'earnings_amount', v_earnings_amount,
    'created_by', COALESCE(p_created_by, 'admin'),
    'notes', p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
