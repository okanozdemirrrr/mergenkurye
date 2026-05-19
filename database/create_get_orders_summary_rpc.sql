-- ==========================================
-- SQL RPC: get_orders_summary
-- Açıklama: Belirtilen tarih aralığı ve durum filtresine göre 
-- toplam sipariş adedi, toplam tutar, toplam nakit ve toplam kart tutarını hesaplar.
-- Veritabanı seviyesinde çalıştığı için API limiti veya network darboğazı yaşanmaz.
-- ==========================================

CREATE OR REPLACE FUNCTION get_orders_summary(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_status_filter text DEFAULT 'all'
)
RETURNS TABLE (
  total_orders bigint,
  total_amount numeric,
  total_cash numeric,
  total_card numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(COUNT(id), 0)::bigint as total_orders,
    COALESCE(SUM(CASE WHEN status != 'cancelled' THEN amount ELSE 0 END), 0)::numeric as total_amount,
    COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_method = 'cash' THEN amount ELSE 0 END), 0)::numeric as total_cash,
    COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_method IN ('card', 'iban') THEN amount ELSE 0 END), 0)::numeric as total_card
  FROM packages
  WHERE 
    -- Durum filtresi (delivered, cancelled veya all)
    (
      CASE 
        WHEN p_status_filter = 'all' THEN status IN ('delivered', 'cancelled')
        ELSE status = p_status_filter
      END
    )
    -- Tarih aralığı filtreleri (NULL ise tüm zamanları getirir)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;
