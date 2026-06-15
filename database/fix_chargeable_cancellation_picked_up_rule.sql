-- ===========================================================================
-- MIGRATION: fix_chargeable_cancellation_picked_up_rule.sql
--
-- Ücretli iptal kuralı: kurye ataması değil, fiziksel teslim alma (picked_up_at)
-- Eski yanlış ücretlendirmeleri düzelt + trigger güncelle
-- ===========================================================================

-- 1) Yanlışlıkla ücretli işaretlenen iptalleri düzelt (atanmış ama teslim alınmamış)
UPDATE packages
SET is_chargeable_cancellation = false
WHERE status = 'cancelled'
  AND is_chargeable_cancellation = true
  AND picked_up_at IS NULL;

-- 2) Teslim alınmış ama ücretsiz kalan iptalleri düzelt
UPDATE packages
SET is_chargeable_cancellation = true
WHERE status = 'cancelled'
  AND is_chargeable_cancellation = false
  AND picked_up_at IS NOT NULL;

-- 3) Ücretli iptalde kurye kanıtı eksikse delivered_by_courier_id'yi doldur
UPDATE packages
SET delivered_by_courier_id = courier_id
WHERE status = 'cancelled'
  AND is_chargeable_cancellation = true
  AND delivered_by_courier_id IS NULL
  AND courier_id IS NOT NULL;

-- 4) Trigger: yalnızca fiziksel teslim alma kanıtı
CREATE OR REPLACE FUNCTION set_chargeable_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    NEW.is_chargeable_cancellation := (
      COALESCE(OLD.picked_up_at, NEW.picked_up_at) IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_chargeable_cancellation ON packages;
CREATE TRIGGER trigger_set_chargeable_cancellation
  BEFORE INSERT OR UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION set_chargeable_cancellation();

-- 5) Kontrol
SELECT
  status,
  is_chargeable_cancellation,
  picked_up_at IS NOT NULL AS has_picked_up,
  COUNT(*) AS count
FROM packages
WHERE status = 'cancelled'
GROUP BY status, is_chargeable_cancellation, has_picked_up
ORDER BY is_chargeable_cancellation DESC;
