-- ============================================
-- WEB PLATFORM KOMİSYON RAPORU RPC FONKSİYONU
-- ============================================
-- Bu fonksiyon sadece platform='web' ve status='delivered' olan
-- siparişleri restoranlara göre gruplar ve komisyon hesabı için
-- özet veri döner (Egress optimizasyonu için).

CREATE OR REPLACE FUNCTION get_platform_commissions(
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  restaurant_id BIGINT,
  restaurant_name TEXT,
  total_web_orders BIGINT,
  total_web_amount NUMERIC(10, 2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    COUNT(p.id) AS total_web_orders,
    COALESCE(SUM(p.amount), 0)::NUMERIC(10, 2) AS total_web_amount
  FROM 
    packages p
  INNER JOIN 
    restaurants r ON p.restaurant_id = r.id
  WHERE 
    p.platform = 'web'
    AND p.status = 'delivered'
    AND (p_start_date IS NULL OR p.delivered_at >= p_start_date)
    AND (p_end_date IS NULL OR p.delivered_at <= p_end_date)
  GROUP BY 
    r.id, r.name
  ORDER BY 
    total_web_amount DESC;
END;
$$;

-- Test sorgusu (Tüm zamanlar)
-- SELECT * FROM get_platform_commissions(NULL, NULL);

-- Test sorgusu (Bugün)
-- SELECT * FROM get_platform_commissions(
--   CURRENT_DATE::TIMESTAMP,
--   (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP
-- );

-- Test sorgusu (Son 30 gün)
-- SELECT * FROM get_platform_commissions(
--   (CURRENT_DATE - INTERVAL '30 days')::TIMESTAMP,
--   CURRENT_TIMESTAMP
-- );
