-- Termal yazici scripti icin (thermal_printer/main.py)
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS is_printed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_packages_web_unprinted
ON packages (platform, status, is_printed)
WHERE platform = 'web' AND is_printed = FALSE;
