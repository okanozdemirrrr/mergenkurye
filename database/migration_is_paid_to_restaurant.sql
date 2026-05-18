/**
 * @file database/migration_is_paid_to_restaurant.sql
 * @description Paket Bazlı is_paid_to_restaurant Finansal Mimari Migrasyonu
 *
 * BU DOSYAYI SUPABASE SQL EDITOR'DA ÇALIŞTIRIN.
 *
 * ADIMLAR:
 *   1. packages tablosuna is_paid_to_restaurant kolonu ekle
 *   2. Geçmiş ödeme verilerine göre eski paketleri "ödendi" işaretle
 *   3. Eski CHECK constraint'i kaldır
 *   4. Yeni RPC fonksiyonları oluştur
 */

-- ============================================================================
-- 1. KOLON EKLE
-- ============================================================================
ALTER TABLE packages ADD COLUMN IF NOT EXISTS is_paid_to_restaurant BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_pkg_is_paid_restaurant ON packages(is_paid_to_restaurant);

-- ============================================================================
-- 2. GEÇMİŞ VERİ MİGRASYONU
-- ============================================================================
-- Her restoran için: toplam ödenen tutara göre en eski paketlerden başlayarak
-- "net değer" (amount - package_fee) kümülatif toplamı ödenen tutarı aşana kadar
-- paketleri is_paid_to_restaurant = true olarak işaretle.
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_running_net NUMERIC := 0;
  pkg RECORD;
  v_marked INT := 0;
BEGIN
  FOR r IN
    SELECT
      rpt.restaurant_id,
      SUM(rpt.amount_paid) as total_paid,
      COALESCE(rest.package_fee, 100) as package_fee
    FROM restaurant_payment_transactions rpt
    JOIN restaurants rest ON rest.id = rpt.restaurant_id
    GROUP BY rpt.restaurant_id, rest.package_fee
  LOOP
    v_running_net := 0;
    v_marked := 0;

    FOR pkg IN
      SELECT id, amount
      FROM packages
      WHERE restaurant_id = r.restaurant_id
        AND (status = 'delivered' OR (status = 'cancelled' AND is_chargeable_cancellation = true))
      ORDER BY COALESCE(delivered_at, created_at) ASC
    LOOP
      v_running_net := v_running_net + (pkg.amount - r.package_fee);
      IF v_running_net <= r.total_paid THEN
        UPDATE packages SET is_paid_to_restaurant = true WHERE id = pkg.id;
        v_marked := v_marked + 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;

    RAISE NOTICE '✅ Restaurant %: % paket ödendi olarak işaretlendi (toplam ödenen: % TL)',
      r.restaurant_id, v_marked, r.total_paid;
  END LOOP;
END $$;

-- ============================================================================
-- 3. ESKİ CHECK CONSTRAINT'İ KALDIR
-- ============================================================================
ALTER TABLE restaurant_payment_transactions DROP CONSTRAINT IF EXISTS valid_payment_amounts;

-- ============================================================================
-- 4. YENİ RPC: DÖNEM FİNANSALLARI (RestaurantDetailModal için)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_restaurant_period_financials(
    p_restaurant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
    v_package_fee NUMERIC(10,2);
    v_unpaid_rev NUMERIC(10,2) := 0;
    v_unpaid_count INT := 0;
    v_paid_rev NUMERIC(10,2) := 0;
    v_paid_count INT := 0;
BEGIN
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    -- Ödenmemiş paketler (filtrelenen tarih aralığı)
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_unpaid_rev, v_unpaid_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
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
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    RETURN json_build_object(
        'package_fee', v_package_fee,
        'unpaid_revenue', v_unpaid_rev,
        'unpaid_package_count', v_unpaid_count,
        'unpaid_cost', v_unpaid_count * v_package_fee,
        'net_payable', v_unpaid_rev - (v_unpaid_count * v_package_fee),
        'paid_revenue', v_paid_rev,
        'paid_package_count', v_paid_count,
        'total_package_count', v_unpaid_count + v_paid_count
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. YENİ RPC: TÜM RESTORANLARIN GLOBAL ÖDENMEMİŞ BAKİYELERİ (RestaurantsTab)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_restaurants_unpaid_balances()
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
            p.status = 'delivered'
            OR (p.status = 'cancelled' AND p.is_chargeable_cancellation = true)
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

-- ============================================================================
-- 6. YENİ RPC: ÖDEME İŞLEMİ (Atomik Transaction)
-- ============================================================================
CREATE OR REPLACE FUNCTION process_restaurant_payment(
    p_restaurant_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_package_fee NUMERIC(10,2);
    v_affected_ids INTEGER[];
    v_total_revenue NUMERIC(10,2);
    v_package_count INTEGER;
    v_total_cost NUMERIC(10,2);
    v_net_amount NUMERIC(10,2);
BEGIN
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;

    -- Filtrelenen aralıktaki ödenmemiş paketleri bul
    SELECT
        array_agg(id),
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO v_affected_ids, v_total_revenue, v_package_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND is_paid_to_restaurant = false
      AND (
        (status = 'delivered' AND delivered_at >= p_start_date AND delivered_at <= p_end_date)
        OR
        (status = 'cancelled' AND is_chargeable_cancellation = true
         AND created_at >= p_start_date AND created_at <= p_end_date)
      );

    -- Ödenmemiş paket yoksa hata dön
    IF v_package_count = 0 OR v_affected_ids IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Bu tarih aralığında ödenmemiş paket bulunamadı.'
        );
    END IF;

    -- Hesapla
    v_total_cost := v_package_count * v_package_fee;
    v_net_amount := v_total_revenue - v_total_cost;

    -- Paketleri ödendi olarak işaretle
    UPDATE packages
    SET is_paid_to_restaurant = true
    WHERE id = ANY(v_affected_ids);

    -- Ödeme makbuzu kaydet (audit log)
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
        COALESCE(p_notes, 'Dönem Ödemesi — ' || to_char(NOW(), 'DD.MM.YYYY')),
        p_start_date::DATE, p_end_date::DATE
    );

    RETURN json_build_object(
        'success', true,
        'message', v_package_count || ' paket ödendi olarak işaretlendi.',
        'package_count', v_package_count,
        'revenue', v_total_revenue,
        'cost', v_total_cost,
        'net_paid', v_net_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BAŞARILI
-- ============================================================================
DO $$ BEGIN
    RAISE NOTICE '✅ Migration tamamlandı!';
    RAISE NOTICE '📦 packages.is_paid_to_restaurant kolonu eklendi';
    RAISE NOTICE '📊 Geçmiş paketler migre edildi';
    RAISE NOTICE '🔧 Yeni RPC fonksiyonları oluşturuldu:';
    RAISE NOTICE '   - get_restaurant_period_financials()';
    RAISE NOTICE '   - get_all_restaurants_unpaid_balances()';
    RAISE NOTICE '   - process_restaurant_payment()';
END $$;
