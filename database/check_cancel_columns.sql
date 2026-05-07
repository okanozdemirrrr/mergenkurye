-- Packages tablosunda iptal kolonlarını kontrol et
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'packages'
  AND column_name IN ('cancelled_at', 'cancelled_by', 'cancellation_reason')
ORDER BY column_name;

-- Eğer yoksa ekle
DO $$ 
BEGIN
    -- cancelled_at kolonu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE packages ADD COLUMN cancelled_at TIMESTAMPTZ;
        RAISE NOTICE 'cancelled_at kolonu eklendi';
    END IF;

    -- cancelled_by kolonu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE packages ADD COLUMN cancelled_by TEXT;
        RAISE NOTICE 'cancelled_by kolonu eklendi';
    END IF;

    -- cancellation_reason kolonu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE packages ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'cancellation_reason kolonu eklendi';
    END IF;
END $$;
