-- =============================================================================
-- Pasif kurye (is_active = false) giriş yapabilsin
-- is_active = vardiya durumu; giriş engeli olmamalı (account_status ayrı kontrol edilir)
-- Supabase SQL Editor'da çalıştırın.
-- =============================================================================

-- 1) is_active şartı olan RLS policy'lerini kaldır
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'couriers'
      AND (
        COALESCE(qual, '') ILIKE '%is_active%'
        OR COALESCE(with_check, '') ILIKE '%is_active%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON couriers', pol.policyname);
  END LOOP;
END $$;

-- 2) Giriş ve profil için anon/authenticated erişimi (is_active filtresi yok)
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couriers_select_all" ON couriers;
DROP POLICY IF EXISTS "couriers_update_all" ON couriers;

CREATE POLICY "couriers_select_all"
  ON couriers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "couriers_update_all"
  ON couriers
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE ON couriers TO anon;
GRANT SELECT, UPDATE ON couriers TO authenticated;

-- 3) RLS'den bağımsız güvenli giriş RPC'si
CREATE OR REPLACE FUNCTION courier_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  account_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.username,
    COALESCE(c.account_status, 'active')
  FROM couriers c
  WHERE c.username = p_username
    AND c.password = p_password;

  IF FOUND THEN
    UPDATE couriers
    SET
      is_active = true,
      status = 'idle',
      updated_at = NOW()
    WHERE couriers.username = p_username
      AND couriers.password = p_password
      AND COALESCE(couriers.account_status, 'active') = 'active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION courier_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION courier_login(TEXT, TEXT) TO anon, authenticated;
