-- Timestamp kolonlarını TIMESTAMPTZ'ye çevir
-- Bu, timezone bilgisini saklar ve otomatik UTC'ye çevirir

-- 1. getting_ready_at kolonunu TIMESTAMPTZ yap
ALTER TABLE packages 
ALTER COLUMN getting_ready_at TYPE TIMESTAMPTZ 
USING getting_ready_at AT TIME ZONE 'UTC';

-- 2. ready_at kolonunu TIMESTAMPTZ yap
ALTER TABLE packages 
ALTER COLUMN ready_at TYPE TIMESTAMPTZ 
USING ready_at AT TIME ZONE 'UTC';

-- 3. Diğer timestamp kolonlarını da kontrol et ve TIMESTAMPTZ yap
ALTER TABLE packages 
ALTER COLUMN created_at TYPE TIMESTAMPTZ 
USING created_at AT TIME ZONE 'UTC';

ALTER TABLE packages 
ALTER COLUMN assigned_at TYPE TIMESTAMPTZ 
USING assigned_at AT TIME ZONE 'UTC';

ALTER TABLE packages 
ALTER COLUMN picked_up_at TYPE TIMESTAMPTZ 
USING picked_up_at AT TIME ZONE 'UTC';

ALTER TABLE packages 
ALTER COLUMN delivered_at TYPE TIMESTAMPTZ 
USING delivered_at AT TIME ZONE 'UTC';

ALTER TABLE packages 
ALTER COLUMN cancelled_at TYPE TIMESTAMPTZ 
USING cancelled_at AT TIME ZONE 'UTC';

ALTER TABLE packages 
ALTER COLUMN settled_at TYPE TIMESTAMPTZ 
USING settled_at AT TIME ZONE 'UTC';

ALTER TABLE packages 
ALTER COLUMN restaurant_settled_at TYPE TIMESTAMPTZ 
USING restaurant_settled_at AT TIME ZONE 'UTC';

-- 4. Yorumları güncelle
COMMENT ON COLUMN packages.getting_ready_at IS 'Restoran siparişi hazırlamaya başladığında (TIMESTAMPTZ - UTC)';
COMMENT ON COLUMN packages.ready_at IS 'Restoran siparişi hazır olarak işaretlediğinde (TIMESTAMPTZ - UTC)';

-- 5. Kontrol et
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name LIKE '%_at'
ORDER BY ordinal_position;
