/**
 * @file database/update_rpc_unpaid_balances_with_dates.sql
 * @description Function Overloading çakışmasını çöz.
 * 
 * SORUN: Aynı isimde iki fonksiyon var:
 *   1. get_all_restaurants_unpaid_balances()          — parametresiz
 *   2. get_all_restaurants_unpaid_balances(p_start_date, p_end_date) — parametreli
 * PostgreSQL hangisini çağıracağını bilemiyor.
 * 
 * ÇÖZÜM: İkisini de SİL, TEK bir fonksiyon oluştur (DEFAULT NULL).
 * 
 * BU DOSYAYI SUPABASE SQL EDITOR'DA ÇALIŞTIRIN.
 */

-- 1. ÇAKIŞAN FONKSİYONLARI SİL
DROP FUNCTION IF EXISTS get_all_restaurants_unpaid_balances();
DROP FUNCTION IF EXISTS get_all_restaurants_unpaid_balances(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- 2. TEK FONKSİYON OLUŞTUR (Opsiyonel tarih parametreleri)
CREATE OR REPLACE FUNCTION get_all_restaurants_unpaid_balances(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH unpaid AS (
        SELECT
            p.restaurant_id,
            COALESCE(SUM(p.amount), 0) as unpaid_rev,
            COUNT(*) as unpaid_count
        FROM packages p
        WHERE p.is_paid_to_restaurant = false
          AND (
            (p.status = 'delivered'
             AND (p_start_date IS NULL OR p.delivered_at >= p_start_date)
             AND (p_end_date IS NULL OR p.delivered_at <= p_end_date)
            )
            OR
            (p.status = 'cancelled' AND p.is_chargeable_cancellation = true
             AND (p_start_date IS NULL OR p.created_at >= p_start_date)
             AND (p_end_date IS NULL OR p.created_at <= p_end_date)
            )
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
            'unpaid_cost', COALESCE(u.unpaid_count, 0) * COALESCE(r.package_fee, 100),
            'current_balance', COALESCE(u.unpaid_rev, 0) - (COALESCE(u.unpaid_count, 0) * COALESCE(r.package_fee, 100))
        )
    ) INTO v_result
    FROM restaurants r
    LEFT JOIN unpaid u ON u.restaurant_id = r.id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
