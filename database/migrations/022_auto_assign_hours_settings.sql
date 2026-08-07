-- =============================================================================
-- 022 — Otomatik atama saatleri (app_settings + dinamik trigger)
-- Mevcut app_settings key/value tablosunu kullanır.
-- Supabase SQL Editor'da çalıştırın.
-- =============================================================================

-- 1) Varsayılan saatler (mevcut davranış: 00:30 – 02:00 Europe/Istanbul)
INSERT INTO app_settings (key, value)
VALUES
  ('auto_assign_start_time', '00:30'),
  ('auto_assign_end_time', '02:00')
ON CONFLICT (key) DO NOTHING;

-- 2) Admin panelinden saat kaydetme (SECURITY DEFINER — anon/authenticated upsert)
CREATE OR REPLACE FUNCTION set_auto_assign_hours(
  p_start_time TEXT,
  p_end_time   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIME;
  v_end   TIME;
BEGIN
  IF p_start_time IS NULL OR btrim(p_start_time) = '' THEN
    RAISE EXCEPTION 'Başlangıç saati zorunludur';
  END IF;
  IF p_end_time IS NULL OR btrim(p_end_time) = '' THEN
    RAISE EXCEPTION 'Bitiş saati zorunludur';
  END IF;

  BEGIN
    v_start := btrim(p_start_time)::time;
    v_end   := btrim(p_end_time)::time;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Geçersiz saat formatı. Örn: 00:30 veya 02:00';
  END;

  INSERT INTO app_settings (key, value, updated_at)
  VALUES
    ('auto_assign_start_time', to_char(v_start, 'HH24:MI'), NOW()),
    ('auto_assign_end_time',   to_char(v_end,   'HH24:MI'), NOW())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'start_time', to_char(v_start, 'HH24:MI'),
    'end_time',   to_char(v_end,   'HH24:MI')
  );
END;
$$;

REVOKE ALL ON FUNCTION set_auto_assign_hours(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_auto_assign_hours(TEXT, TEXT) TO anon, authenticated;

-- 3) Trigger: saat aralığını app_settings'ten oku (statik 00:30-02:00 kaldırıldı)
CREATE OR REPLACE FUNCTION auto_assign_night_shift_courier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_night_courier_id UUID;
  v_local_time       TIME;
  v_start_time       TIME;
  v_end_time         TIME;
  v_in_window        BOOLEAN := false;
BEGIN
  -- Zaten kurye atanmışsa dokunma
  IF NEW.courier_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_local_time := (NOW() AT TIME ZONE 'Europe/Istanbul')::time;

  -- Ayarlar yoksa eski varsayılanlara düş
  SELECT COALESCE(
    (SELECT value::time FROM app_settings WHERE key = 'auto_assign_start_time' LIMIT 1),
    TIME '00:30'
  ) INTO v_start_time;

  SELECT COALESCE(
    (SELECT value::time FROM app_settings WHERE key = 'auto_assign_end_time' LIMIT 1),
    TIME '02:00'
  ) INTO v_end_time;

  -- Gece yarısını aşmayan aralık (örn. 00:30–02:00 veya 09:00–17:00)
  IF v_start_time <= v_end_time THEN
    v_in_window := (v_local_time >= v_start_time AND v_local_time <= v_end_time);
  ELSE
    -- Gece yarısını aşan aralık (örn. 22:00–06:00)
    v_in_window := (v_local_time >= v_start_time OR v_local_time <= v_end_time);
  END IF;

  IF v_in_window THEN
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

COMMENT ON FUNCTION auto_assign_night_shift_courier() IS
  'Gece vardiyası otomatik atama. Saat aralığı app_settings (auto_assign_start_time / auto_assign_end_time) üzerinden okunur.';

COMMENT ON COLUMN couriers.is_night_shift IS
  'Gece vardiyacısı kurye. Ayarlanan otomatik atama saatleri arasında gelen paketler otomatik atanır.';
