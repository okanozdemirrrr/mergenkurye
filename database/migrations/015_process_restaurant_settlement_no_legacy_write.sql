-- =============================================================================
-- 015 — process_restaurant_settlement: legacy dual-write KALDIRILDI
-- Artık sadece restaurant_settlements + packages güncellenir.
-- restaurant_payment_transactions'a INSERT YOK.
-- =============================================================================

CREATE OR REPLACE FUNCTION process_restaurant_settlement(
  p_restaurant_id UUID,
  p_start_date    TIMESTAMP WITH TIME ZONE,
  p_end_date      TIMESTAMP WITH TIME ZONE,
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_package_fee       NUMERIC(10,2);
  v_affected_ids      INTEGER[];
  v_total_revenue     NUMERIC(10,2);
  v_package_count     INTEGER;
  v_courier_cost      NUMERIC(10,2);
  v_commission        NUMERIC(10,2);
  v_net_paid          NUMERIC(10,2);
  v_settlement_id     UUID;
  v_start_date        DATE;
  v_end_date          DATE;
BEGIN
  IF p_restaurant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Restoran ID zorunludur.');
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Başlangıç ve bitiş tarihi zorunludur.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = p_restaurant_id) THEN
    RETURN json_build_object('success', false, 'error', 'Restoran bulunamadı.');
  END IF;

  SELECT COALESCE(package_fee, 100) INTO v_package_fee
  FROM restaurants
  WHERE id = p_restaurant_id;

  v_start_date := (p_start_date AT TIME ZONE 'Europe/Istanbul')::DATE;
  v_end_date   := (p_end_date   AT TIME ZONE 'Europe/Istanbul')::DATE;

  SELECT
    array_agg(id),
    COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
    COUNT(*),
    COALESCE(SUM(COALESCE(applied_price, v_package_fee)), 0),
    COALESCE(SUM(
      CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END
    ), 0)
  INTO
    v_affected_ids,
    v_total_revenue,
    v_package_count,
    v_courier_cost,
    v_commission
  FROM packages
  WHERE restaurant_id = p_restaurant_id
    AND is_paid_to_restaurant = false
    AND (
      (status = 'delivered'
        AND delivered_at >= p_start_date
        AND delivered_at <= p_end_date)
      OR
      (status = 'cancelled'
        AND is_chargeable_cancellation = true
        AND created_at >= p_start_date
        AND created_at <= p_end_date)
    );

  IF v_package_count = 0 OR v_affected_ids IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bu tarih aralığında ödenmemiş paket bulunamadı.'
    );
  END IF;

  v_net_paid := v_total_revenue - v_courier_cost - v_commission;

  INSERT INTO restaurant_settlements (
    restaurant_id,
    start_date,
    end_date,
    total_revenue,
    courier_cost,
    commission_amount,
    net_paid,
    package_count,
    notes
  ) VALUES (
    p_restaurant_id,
    v_start_date,
    v_end_date,
    v_total_revenue,
    v_courier_cost,
    v_commission,
    v_net_paid,
    v_package_count,
    COALESCE(
      p_notes,
      'Donem mutabakati - ' || to_char(NOW() AT TIME ZONE 'Europe/Istanbul', 'DD.MM.YYYY HH24:MI')
    )
  )
  RETURNING id INTO v_settlement_id;

  UPDATE packages
  SET
    is_paid_to_restaurant = true,
    restaurant_settled_at = NOW(),
    restaurant_settlement_id = v_settlement_id
  WHERE id = ANY(v_affected_ids);

  -- NOT: restaurant_payment_transactions dual-write kaldırıldı (legacy).
  -- Tek kaynak: restaurant_settlements.

  RETURN json_build_object(
    'success', true,
    'message', v_package_count || ' paket mutabakata alindi.',
    'settlement_id', v_settlement_id,
    'package_count', v_package_count,
    'revenue', v_total_revenue,
    'cost', v_courier_cost,
    'commission', v_commission,
    'net_paid', v_net_paid,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$function$;

REVOKE ALL ON FUNCTION process_restaurant_settlement(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_restaurant_settlement(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_restaurant_settlement(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION process_restaurant_settlement(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;
