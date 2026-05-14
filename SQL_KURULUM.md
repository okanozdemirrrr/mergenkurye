# 🛠️ Supabase Finansal RPC Kurulumu

Yeni B2B SaaS finans mimarisinin çalışması için aşağıdaki SQL kodunu **Supabase SQL Editor** sayfasına yapıştırıp **RUN** butonuna basman gerekiyor.

Bu kodlar veritabanında ağır hesaplamaları (ciro, masraf, bakiye) saniyeler içinde yapacak olan fonksiyonları oluşturur.

```sql
/**
 * 1. TEK RESTORAN İÇİN DETAYLI VERİ (Detail Modal için)
 */
CREATE OR REPLACE FUNCTION get_restaurant_financials_v2(
    p_restaurant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_package_fee NUMERIC(10,2);
    v_cum_revenue NUMERIC(10,2) := 0;
    v_cum_delivered_count INT := 0;
    v_cum_chargeable_count INT := 0;
    v_cum_cost NUMERIC(10,2) := 0;
    v_cum_payments NUMERIC(10,2) := 0;
    v_cum_balance NUMERIC(10,2) := 0;
    v_per_revenue NUMERIC(10,2) := 0;
    v_per_delivered_count INT := 0;
    v_per_chargeable_count INT := 0;
    v_per_cost NUMERIC(10,2) := 0;
    v_per_payments NUMERIC(10,2) := 0;
    v_result JSON;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee FROM restaurants WHERE id = p_restaurant_id;
    
    -- Kümülatif (Tüm Zamanlar)
    SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_cum_revenue, v_cum_delivered_count FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'delivered';
    SELECT COUNT(id) INTO v_cum_chargeable_count FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'cancelled' AND is_chargeable_cancellation = true;
    v_cum_cost := (v_cum_delivered_count + v_cum_chargeable_count) * v_package_fee;
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_cum_payments FROM restaurant_payment_transactions WHERE restaurant_id = p_restaurant_id;
    v_cum_balance := v_cum_revenue - v_cum_cost - v_cum_payments;

    -- Periyot (Filtre Aralığı)
    IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0), COUNT(id) INTO v_per_revenue, v_per_delivered_count FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date;
        SELECT COUNT(id) INTO v_per_chargeable_count FROM packages WHERE restaurant_id = p_restaurant_id AND status = 'cancelled' AND is_chargeable_cancellation = true AND created_at >= p_start_date AND created_at <= p_end_date;
        v_per_cost := (v_per_delivered_count + v_per_chargeable_count) * v_package_fee;
        SELECT COALESCE(SUM(amount_paid), 0) INTO v_per_payments FROM restaurant_payment_transactions WHERE restaurant_id = p_restaurant_id AND created_at >= p_start_date AND created_at <= p_end_date;
    ELSE
        v_per_revenue := v_cum_revenue; v_per_delivered_count := v_cum_delivered_count; v_per_chargeable_count := v_cum_chargeable_count; v_per_cost := v_cum_cost; v_per_payments := v_cum_payments;
    END IF;

    v_result := json_build_object(
        'package_fee', v_package_fee,
        'cumulative', json_build_object('revenue', v_cum_revenue, 'cost', v_cum_cost, 'payments', v_cum_payments, 'balance', v_cum_balance),
        'period', json_build_object('revenue', v_per_revenue, 'cost', v_per_cost, 'payments', v_per_payments, 'delivered_count', v_per_delivered_count, 'chargeable_count', v_per_chargeable_count, 'total_package_count', v_per_delivered_count + v_per_chargeable_count)
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

/**
 * 2. TÜM RESTORANLAR İÇİN TOPLU LİSTE (Payments Tab için)
 */
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
            COALESCE((SELECT SUM(amount) FROM packages WHERE restaurant_id = r.id AND status = 'delivered'), 0) as cum_revenue,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'delivered'), 0) as cum_delivered_count,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'cancelled' AND is_chargeable_cancellation = true), 0) as cum_chargeable_count,
            COALESCE((SELECT SUM(amount_paid) FROM restaurant_payment_transactions WHERE restaurant_id = r.id), 0) as cum_payments,
            COALESCE((SELECT SUM(amount) FROM packages WHERE restaurant_id = r.id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date), 0) as per_revenue,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date), 0) as per_delivered_count,
            COALESCE((SELECT COUNT(id) FROM packages WHERE restaurant_id = r.id AND status = 'cancelled' AND is_chargeable_cancellation = true AND created_at >= p_start_date AND created_at <= p_end_date), 0) as per_chargeable_count
        FROM restaurants r
    )
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'package_fee', s.package_fee,
            'cumulative', json_build_object(
                'revenue', s.cum_revenue,
                'cost', (s.cum_delivered_count + s.cum_chargeable_count) * s.package_fee,
                'payments', s.cum_payments,
                'balance', s.cum_revenue - ((s.cum_delivered_count + s.cum_chargeable_count) * s.package_fee) - s.cum_payments
            ),
            'period', json_build_object(
                'revenue', s.per_revenue,
                'cost', (s.per_delivered_count + s.per_chargeable_count) * s.package_fee,
                'delivered_count', s.per_delivered_count,
                'chargeable_count', s.per_chargeable_count,
                'total_package_count', s.per_delivered_count + s.per_chargeable_count
            )
        )
    ) INTO v_result
    FROM restaurant_stats s;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```
