-- ============================================
-- Kurye sıralama: sort_order kolonu + toplu güncelleme RPC
-- Supabase SQL Editor'da çalıştırın
-- ============================================

ALTER TABLE couriers
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Mevcut kuryelere alfabetik başlangıç sırası (opsiyonel, tek seferlik)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY full_name ASC) - 1 AS rn
  FROM couriers
)
UPDATE couriers c
SET sort_order = r.rn
FROM ranked r
WHERE c.id = r.id
  AND c.sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_couriers_sort_order
  ON couriers (sort_order);

COMMENT ON COLUMN couriers.sort_order IS 'Admin panelinde kurye görüntüleme sırası (küçükten büyüğe)';

-- Toplu sıralama güncelleme RPC
CREATE OR REPLACE FUNCTION update_courier_sort_orders(p_updates JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
BEGIN
  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE couriers
    SET sort_order = (item->>'sort_order')::INTEGER
    WHERE id = (item->>'id')::UUID;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_courier_sort_orders(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_courier_sort_orders(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION update_courier_sort_orders(JSONB) TO service_role;
