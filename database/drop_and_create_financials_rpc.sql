-- ===========================================================================
-- FIX: get_restaurant_period_financials RPC Drop & Recreate
--
-- SORUN: PostgreSQL return tipi uyuşmazlığı ya da cache nedeniyle 
-- commission_amount hesaplaması arayüze 0.00 ₺ olarak yansıyabilir.
--
-- ÇÖZÜM: Eski fonksiyonu imzasıyla drop edip temiz bir şekilde baştan 
-- oluşturuyoruz.
-- ===========================================================================

-- 1. ESKİ FONKSİYONU TAMAMEN SİL (TİP UYUŞMAZLIĞI VE OVERLOAD ÇAKIŞMALARINI ÖNLER)
DROP FUNCTION IF EXISTS get_restaurant_period_financials(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- 2. FONKSİYONU GÜNCEL TİPLER VE KOMİSYON KABLOSUYLA OLUŞTUR
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
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    -- Ödenmemiş paketler (filtrelenen tarih aralığı) ve komisyonları
    SELECT
        COALESCE(SUM(amount), 0),
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
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
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
        'unpaid_commission',     v_unpaid_commission,   -- YENİ: Arayüze aktarılan alan
        'net_payable',           v_net_payable,
        'paid_revenue',          v_paid_rev,
        'paid_package_count',    v_paid_count,
        'total_package_count',   v_unpaid_count + v_paid_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
