-- Kurye konumu için last_location kolonu ekle
-- Bu kolon JSON formatında latitude, longitude ve updated_at bilgilerini tutar

ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS last_location JSONB DEFAULT NULL;

-- İndeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_couriers_last_location 
ON couriers USING GIN (last_location);

-- Örnek veri yapısı:
-- {
--   "latitude": 38.3552,
--   "longitude": 38.3095,
--   "updated_at": "2024-01-31T10:30:00Z"
-- }

COMMENT ON COLUMN couriers.last_location IS 'Kuryenin son bilinen konumu (JSON: latitude, longitude, updated_at)';
