ALTER TABLE packages
ADD COLUMN IF NOT EXISTS is_delay_warning_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_packages_delay_warning_scan
  ON packages (status, is_delay_warning_sent, assigned_at);
