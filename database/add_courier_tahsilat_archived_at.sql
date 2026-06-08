-- Geçmiş tahsilat sıfırlama: mutabakat fişi silinse bile paket caride açık görünmesin
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS courier_tahsilat_archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN packages.courier_tahsilat_archived_at IS
  'Tahsilat geçmişi sıfırlandığında eski teslimler arşivlenir; ledger açık cari saymaz';

CREATE INDEX IF NOT EXISTS idx_packages_open_ledger_v2
ON packages (delivered_by_courier_id, status)
WHERE status = 'delivered'
  AND courier_settlement_id IS NULL
  AND courier_tahsilat_archived_at IS NULL
  AND courier_settled_at IS NULL;
