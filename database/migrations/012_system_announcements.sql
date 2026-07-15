-- =============================================================================
-- Sistem duyuruları — restoran, kurye ve admin panelleri için tek yönlü bildirimler
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS read_announcements (
  user_id           TEXT NOT NULL,
  announcement_id   UUID NOT NULL REFERENCES system_announcements(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_system_announcements_created_at
  ON system_announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_read_announcements_user_id
  ON read_announcements (user_id);

-- RLS (proje genelinde anon erişim modeli)
ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_announcements_select_all" ON system_announcements;
CREATE POLICY "system_announcements_select_all"
  ON system_announcements FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "system_announcements_insert_all" ON system_announcements;
CREATE POLICY "system_announcements_insert_all"
  ON system_announcements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "read_announcements_select_all" ON read_announcements;
CREATE POLICY "read_announcements_select_all"
  ON read_announcements FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "read_announcements_insert_all" ON read_announcements;
CREATE POLICY "read_announcements_insert_all"
  ON read_announcements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON system_announcements TO anon, authenticated;
GRANT SELECT, INSERT ON read_announcements TO anon, authenticated;
