-- ===========================================================================
-- FIX: process_restaurant_payment — start_date kaldırıldı
--
-- KURAL (Muhasebe Doğruluğu):
--   Ödeme işlemi sadece p_restaurant_id ve p_end_date parametrelerini alır.
--   p_end_date'e kadar (dahil) teslim edilmiş/oluşturulmuş TÜM ödenmemiş
--   paketleri kapatır. Böylece önceki dönemlerden kalan bakiyeler asılı kalmaz.
-- ===========================================================================

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
    v_net_amount    NUMERIC(10,2);
    v_oldest_date   DATE;
BEGIN
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    -- p_end_date'e kadar (dahil) tüm ödenmemiş paketleri bul
    -- (is_paid_to_restaurant = false ve tarih <= p_end_date)
    SELECT
        array_agg(id),
        COALESCE(SUM(amount), 0),
        COUNT(*),
        MIN(COALESCE(delivered_at, created_at))::DATE
    INTO v_affected_ids, v_total_revenue, v_package_count, v_oldest_date
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        -- Teslim edilmiş paketler: delivered_at <= p_end_date
        (status = 'delivered' AND delivered_at <= p_end_date)
        OR
        -- Ücretli iptal: created_at <= p_end_date
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at <= p_end_date)
      );

    -- Ödenmemiş paket yoksa hata dön
    IF v_package_count = 0 OR v_affected_ids IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error',   'Bu tarihe kadar ödenmemiş paket bulunamadı.'
        );
    END IF;

    -- Net bakiye hesapla
    v_total_cost := v_package_count * v_package_fee;
    v_net_amount := v_total_revenue - v_total_cost;

    -- Tüm ödenmemiş paketleri kapalı olarak işaretle
    UPDATE packages
    SET
        is_paid_to_restaurant = true,
        settled_at            = NOW()
    WHERE id = ANY(v_affected_ids);

    -- Ödeme makbuzu kaydet (audit log)
    INSERT INTO restaurant_payment_transactions (
        restaurant_id, transaction_date,
        brut_ciro, toplam_masraf, net_hakedis, amount_paid,
        package_count, order_ids, notes,
        period_start, period_end
    ) VALUES (
        p_restaurant_id,  CURRENT_DATE,
        v_total_revenue,  v_total_cost,
        GREATEST(v_net_amount, 0),  GREATEST(v_net_amount, 0),
        v_package_count,  v_affected_ids,
        COALESCE(
            p_notes,
            'Geçmiş Tüm Bakiye Kapatıldı — ' || to_char(NOW(), 'DD.MM.YYYY HH24:MI')
        ),
        v_oldest_date,    p_end_date::DATE   -- gerçek kapsanan dönem
    );

    RETURN json_build_object(
        'success',       true,
        'message',       v_package_count || ' paket ödendi olarak işaretlendi.',
        'package_count', v_package_count,
        'revenue',       v_total_revenue,
        'cost',          v_total_cost,
        'net_paid',      v_net_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
