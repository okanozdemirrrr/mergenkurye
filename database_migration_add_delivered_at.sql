-- packages tablosuna delivered_at sütunu ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Yorum ekle
COMMENT ON COLUMN packages.delivered_at IS 'Paketin müşteriye teslim edildiği zaman';

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_delivered_at ON packages(delivered_at);

-- Mevcut delivered paketler için delivered_at'ı created_at'tan kopyala (geçici çözüm)
UPDATE packages 
SET delivered_at = created_at 
WHERE status = 'delivered' AND delivered_at IS NULL;
