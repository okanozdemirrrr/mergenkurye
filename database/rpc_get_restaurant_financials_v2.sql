/**
 * @file database/rpc_get_restaurant_financials_v2.sql
 * @description Sadeleştirilmiş B2B SaaS Finansal Hesaplama RPC'leri
 * 
 * DEĞİŞİKLİKLER:
 * - Frontend'e sadece 'current_balance' (Kümülatif) ve 'period' (Ekstre) verileri döner.
 * - Tablodaki kafa karıştırıcı kümülatif ödeme kolonları UI'dan ve API'dan temizlendi.
 */

-- 1. TEK RESTORAN İÇİN DETAYLI VERİ (Modal için - Tutarlılık adına güncellendi)
CREATE OR REPLACE FUNCTION get_restaurant_financials_v2(
    p_restaurant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_package_fee NUMERIC(10,2);
    v_cum_rev NUMERIC(10,2);
    v_cum_del INT;
    v_cum_can INT;
    v_cum_pay NUMERIC(10,2);
    
    v_per_rev NUMERIC(10,2) := 0;
    v_per_del INT := 0;
    v_per_can INT := 0;
    v_per_pay NUMERIC(10,2) := 0;
    v_result JSON;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee FROM restaurants WHERE id = p_restaurant_id;
    
    -- Kümülatif (Tüm Zamanlar)
    SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_cum_rev, v_cum_del FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'delivered';
    SELECT COUNT(id) INTO v_cum_can FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'cancelled' AND is_chargeable_cancellation = true;
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_cum_pay FROM restaurant_payment_transactions WHERE restaurant_id = p_restaurant_id;

    -- Periyot (Ekstre)
    IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_per_rev, v_per_del FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date;
        SELECT COUNT(id) INTO v_per_can FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'cancelled' AND is_chargeable_cancellation = true AND created_at >= p_start_date AND created_at <= p_end_date;
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_per_pay FROM restaurant_payment_transactions WHERE restaurant_id = p_restaurant_id AND created_at >= p_start_date AND created_at <= p_end_date;
    ELSE
        v_per_rev := v_cum_rev; v_per_del := v_cum_del; v_per_can := v_cum_can;
    END IF;

    v_result := json_build_object(
        'package_fee', v_package_fee,
        'current_balance', v_cum_rev - ((v_cum_del + v_cum_can) * v_package_fee) - v_cum_pay,
        'period', json_build_object(
            'revenue', v_per_rev,
            'cost', (v_per_del + v_per_can) * v_package_fee,
            'payments', v_per_pay,
            'delivered_count', v_per_del,
            'total_package_count', v_per_del + v_per_can
        )
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 2. TÜM RESTORANLAR İÇİN TOPLU LİSTE (SADELEŞTİRİLMİŞ)
CREATE OR REPLACE FUNCTION get_all_restaurants_financials(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH restaurant_stats AS (
        SELECT 
            r.id,
            r.name,
            r.package_fee,
            -- Kümülatif Hesaplamalar (Bakiye için)
            COALESCE((SELECT SUM(amount) FROM packages WHERE restaurant_id = r.id AND status = 'delivered'), 0) as cum_rev,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'delivered'), 0) as cum_del,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'cancelled' AND is_chargeable_cancellation = true), 0) as cum_can,
            COALESCE((SELECT SUM(amount_paid) FROM restaurant_payment_transactions WHERE restaurant_id = r.id), 0) as cum_pay,
            
            -- Periyot Hesaplamalar (Ekstre için)
            COALESCE((SELECT SUM(amount) FROM packages WHERE restaurant_id = r.id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date), 0) as per_rev,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date), 0) as per_del,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'cancelled' AND is_chargeable_cancellation = true AND created_at >= p_start_date AND created_at <= p_end_date), 0) as per_can
        FROM restaurants r
    )
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'package_fee', s.package_fee,
            'current_balance', s.cum_rev - ((s.cum_del + s.cum_can) * s.package_fee) - s.cum_pay,
            'period', json_build_object(
                'revenue', s.per_rev,
                'cost', (s.per_del + s.per_can) * s.package_fee,
                'total_package_count', s.per_del + s.per_can
            )
        )
    ) INTO v_result
    FROM restaurant_stats s;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
