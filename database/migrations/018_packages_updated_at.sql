-- =============================================================================
-- packages.updated_at — Admin Smart Fallback delta fetch için
-- Supabase SQL Editor'da çalıştırın (yoksa delta created_at + status timestamp'e düşer).
-- =============================================================================

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.set_packages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_packages_set_updated_at ON packages;
CREATE TRIGGER trg_packages_set_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_packages_updated_at();

CREATE INDEX IF NOT EXISTS idx_packages_updated_at
  ON packages (updated_at DESC);
