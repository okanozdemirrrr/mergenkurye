-- ===========================================================================
-- FIX: commission_amount komisyon kesintisi RPC entegrasyonu
--
-- Güncellenecek Fonksiyonlar:
--   1. get_restaurant_period_financials  — komisyon toplamı eklendi, net_payable düzeltildi
--   2. get_all_restaurants_unpaid_balances — komisyon dahil current_balance düzeltildi
--
-- Supabase SQL Editor'de çalıştırın.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. get_restaurant_period_financials — komisyon entegrasyonu
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
    v_unpaid_commission  NUMERIC(10,2) := 0;   -- YENİ: ödenmemiş komisyon toplamı
    v_paid_rev           NUMERIC(10,2) := 0;
    v_paid_count         INT           := 0;
    v_unpaid_cost        NUMERIC(10,2);
    v_net_payable        NUMERIC(10,2);
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    -- Ciro: sadece delivered | Adet: delivered + ücretli iptal (masraf için)
    SELECT
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
        COUNT(*),
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN COALESCE(commission_amount, 0) ELSE 0 END), 0)
    INTO v_unpaid_rev, v_unpaid_count, v_unpaid_commission
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered'
         AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    -- Ödenmiş paketler (bilgi amaçlı)
    SELECT
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0),
        COUNT(*)
    INTO v_paid_rev, v_paid_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = true
      AND (
        (status = 'delivered'
         AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    -- Net hesap: Ciro - Kurye Masrafı - Komisyon Kesintisi
    v_unpaid_cost  := v_unpaid_count * v_package_fee;
    v_net_payable  := v_unpaid_rev - v_unpaid_cost - v_unpaid_commission;

    RETURN json_build_object(
        'package_fee',           v_package_fee,
        'unpaid_revenue',        v_unpaid_rev,
        'unpaid_package_count',  v_unpaid_count,
        'unpaid_cost',           v_unpaid_cost,
        'unpaid_commission',     v_unpaid_commission,   -- YENİ alan
        'net_payable',           v_net_payable,
        'paid_revenue',          v_paid_rev,
        'paid_package_count',    v_paid_count,
        'total_package_count',   v_unpaid_count + v_paid_count
    );
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- 2. get_all_restaurants_unpaid_balances — komisyon dahil current_balance
--    (Önce DROP çakışma önlemi için)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_all_restaurants_unpaid_balances();
DROP FUNCTION IF EXISTS get_all_restaurants_unpaid_balances(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

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
            COALESCE(SUM(CASE WHEN p.status = 'delivered' THEN p.amount ELSE 0 END), 0)     AS unpaid_rev,
            COUNT(*)                                                                           AS unpaid_count,
            COALESCE(SUM(CASE WHEN p.status = 'delivered'
                              THEN COALESCE(p.commission_amount, 0)
                              ELSE 0 END), 0)                                                 AS unpaid_commission
        FROM packages p
        WHERE p.is_paid_to_restaurant = false
          AND (
            (p.status = 'delivered'
             AND (p_start_date IS NULL OR p.delivered_at >= p_start_date)
             AND (p_end_date   IS NULL OR p.delivered_at <= p_end_date)
            )
            OR
            (p.status = 'cancelled' AND p.is_chargeable_cancellation = true
             AND (p_start_date IS NULL OR p.created_at >= p_start_date)
             AND (p_end_date   IS NULL OR p.created_at <= p_end_date)
            )
          )
        GROUP BY p.restaurant_id
    )
    SELECT json_agg(
        json_build_object(
            'id',                   r.id,
            'name',                 r.name,
            'package_fee',          COALESCE(r.package_fee, 100),
            'unpaid_revenue',       COALESCE(u.unpaid_rev, 0),
            'unpaid_package_count', COALESCE(u.unpaid_count, 0),
            'unpaid_cost',          COALESCE(u.unpaid_count, 0) * COALESCE(r.package_fee, 100),
            'unpaid_commission',    COALESCE(u.unpaid_commission, 0),
            -- current_balance = Ciro - Kurye Masrafı - Komisyon
            'current_balance',      COALESCE(u.unpaid_rev, 0)
                                    - (COALESCE(u.unpaid_count, 0) * COALESCE(r.package_fee, 100))
                                    - COALESCE(u.unpaid_commission, 0)
        )
    ) INTO v_result
    FROM restaurants r
    LEFT JOIN unpaid u ON u.restaurant_id = r.id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
