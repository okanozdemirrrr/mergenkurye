-- =============================================================================
-- 017 — app_settings: zorunlu güncelleme (min_required_version)
-- Supabase SQL Editor'da çalıştırın.
-- min_required_version'ı yükseltince eski Android APK'lar Force Update görür.
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select_all" ON app_settings;
CREATE POLICY "app_settings_select_all"
  ON app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Yazma: yalnızca service_role / SQL Editor (anon INSERT yok)
DROP POLICY IF EXISTS "app_settings_insert_service" ON app_settings;
DROP POLICY IF EXISTS "app_settings_update_service" ON app_settings;

GRANT SELECT ON app_settings TO anon, authenticated;

-- Varsayılan: mevcut sürümle aynı → kimse kilitlenmez.
-- Force update için örn: UPDATE app_settings SET value = '1.4.13' WHERE key = 'min_required_version';
INSERT INTO app_settings (key, value)
VALUES ('min_required_version', '1.4.12')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_settings IS 'Uygulama geneli ayarlar (force update, feature flags)';
COMMENT ON COLUMN app_settings.key IS 'Ayar anahtarı, örn: min_required_version';
