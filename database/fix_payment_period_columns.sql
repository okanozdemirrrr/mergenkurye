/**
 * @file database/fix_payment_period_columns.sql
 * @description restaurant_payment_transactions tablosuna period_start ve period_end kolonlarını ekle
 * 
 * SORUN: Frontend period_start ve period_end gönderiyordu ama tablo şemasında bu kolonlar yoktu.
 * Supabase bilinmeyen kolon gönderildiğinde boş {} hatası dönüyordu.
 * 
 * ÇÖZÜM: Bu kolonları tabloya ekle (opsiyonel alanlar, NULL olabilir).
 */

-- period_start kolonu ekle (yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'period_start'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        ADD COLUMN period_start DATE DEFAULT NULL;
        
        COMMENT ON COLUMN restaurant_payment_transactions.period_start IS 'Ödemenin kapsadığı dönem başlangıcı (opsiyonel)';
        RAISE NOTICE '✅ period_start kolonu eklendi';
    ELSE
        RAISE NOTICE 'ℹ️ period_start kolonu zaten mevcut';
    END IF;
END $$;

-- period_end kolonu ekle (yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'period_end'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        ADD COLUMN period_end DATE DEFAULT NULL;
        
        COMMENT ON COLUMN restaurant_payment_transactions.period_end IS 'Ödemenin kapsadığı dönem bitişi (opsiyonel)';
        RAISE NOTICE '✅ period_end kolonu eklendi';
    ELSE
        RAISE NOTICE 'ℹ️ period_end kolonu zaten mevcut';
    END IF;
END $$;

-- Doğrulama
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurant_payment_transactions'
ORDER BY ordinal_position;
