-- =============================================================================
-- Gece vardiyası kurye atama sistemi (00:30 - 02:00 Europe/Istanbul)
-- Supabase SQL Editor'da veya migration pipeline ile çalıştırın.
-- =============================================================================

-- 1) couriers tablosuna gece vardiyası bayrağı
ALTER TABLE couriers
ADD COLUMN IF NOT EXISTS is_night_shift BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN couriers.is_night_shift IS
  'Gece vardiyacısı kurye. 00:30-02:00 (Europe/Istanbul) arası gelen paketler otomatik atanır.';

CREATE INDEX IF NOT EXISTS idx_couriers_night_shift
ON couriers (id)
WHERE is_night_shift = true;

-- 2) RPC: Tek gece vardiyacısı kurye seç (önce hepsini sıfırla, sonra seçileni işaretle)
CREATE OR REPLACE FUNCTION set_night_shift_courier(p_courier_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_courier_id IS NULL THEN
    RAISE EXCEPTION 'Kurye ID zorunludur';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM couriers WHERE id = p_courier_id) THEN
    RAISE EXCEPTION 'Kurye bulunamadı: %', p_courier_id;
  END IF;

  UPDATE couriers
  SET is_night_shift = false
  WHERE is_night_shift = true;

  UPDATE couriers
  SET is_night_shift = true
  WHERE id = p_courier_id;
END;
$$;

REVOKE ALL ON FUNCTION set_night_shift_courier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_night_shift_courier(UUID) TO anon, authenticated;

-- 3) BEFORE INSERT trigger: Gece vardiyası saatinde otomatik kurye atama
CREATE OR REPLACE FUNCTION auto_assign_night_shift_courier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_night_courier_id UUID;
  v_local_time TIME;
BEGIN
  -- Zaten kurye atanmışsa dokunma
  IF NEW.courier_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_local_time := (NOW() AT TIME ZONE 'Europe/Istanbul')::time;

  -- 00:30 (dahil) ile 02:00 (dahil) arası
  IF v_local_time >= TIME '00:30' AND v_local_time <= TIME '02:00' THEN
    SELECT id
    INTO v_night_courier_id
    FROM couriers
    WHERE is_night_shift = true
    LIMIT 1;

    IF v_night_courier_id IS NOT NULL THEN
      NEW.courier_id := v_night_courier_id;
      NEW.status := 'assigned';
      NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_night_shift_courier ON packages;

CREATE TRIGGER trigger_auto_assign_night_shift_courier
  BEFORE INSERT ON packages
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_night_shift_courier();
