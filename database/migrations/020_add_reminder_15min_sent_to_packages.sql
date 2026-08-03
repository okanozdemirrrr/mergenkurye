-- =============================================================================
-- packages.reminder_15min_sent — 15 dk ikinci gecikme uyarısı (spam engeli)
-- =============================================================================

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_packages_reminder_15min_scan
  ON packages (status, reminder_15min_sent, assigned_at);
