-- Ledger/Cari: paket ↔ mutabakat bağlantısı
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS courier_settlement_id UUID NULL
REFERENCES courier_settlements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_packages_open_ledger
ON packages (delivered_by_courier_id, status)
WHERE status = 'delivered' AND courier_settlement_id IS NULL;
