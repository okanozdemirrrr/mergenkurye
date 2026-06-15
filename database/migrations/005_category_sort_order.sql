-- ============================================
-- Kategori sıralama: sort_order kolonu + toplu güncelleme RPC
-- ============================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Mevcut display_order değerlerini sort_order'a taşı
UPDATE categories
SET sort_order = COALESCE(display_order, 0);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_sort_order
  ON categories (restaurant_id, sort_order);

COMMENT ON COLUMN categories.sort_order IS 'Kategori görüntüleme sırası (küçükten büyüğe)';

-- Toplu sıralama güncelleme RPC
CREATE OR REPLACE FUNCTION update_category_sort_orders(
  p_restaurant_id UUID,
  p_updates JSONB
)
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
    UPDATE categories
    SET
      sort_order = (item->>'sort_order')::INTEGER,
      display_order = (item->>'sort_order')::INTEGER
    WHERE id = (item->>'id')::UUID
      AND restaurant_id = p_restaurant_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_category_sort_orders(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_category_sort_orders(UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION update_category_sort_orders(UUID, JSONB) TO service_role;
