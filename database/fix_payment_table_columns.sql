-- Restaurant Payment Transactions tablosuna eksik kolonları ekle
-- SORUN: Kod toplam_masraf, net_hakedis, package_count, order_ids kolonlarına veri gönderiyor
-- AMA tablo bu kolonları içermiyor!

DO $$
BEGIN
    -- toplam_masraf kolonu ekle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'toplam_masraf'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        ADD COLUMN toplam_masraf NUMERIC(10, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ toplam_masraf kolonu eklendi';
    END IF;

    -- net_hakedis kolonu ekle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'net_hakedis'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        ADD COLUMN net_hakedis NUMERIC(10, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ net_hakedis kolonu eklendi';
    END IF;

    -- package_count kolonu ekle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'package_count'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        ADD COLUMN package_count INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ package_count kolonu eklendi';
    END IF;

    -- order_ids kolonu ekle
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'order_ids'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        ADD COLUMN order_ids INTEGER[] DEFAULT '{}';
        RAISE NOTICE '✅ order_ids kolonu eklendi';
    END IF;

    -- Gereksiz kolonları kaldır (eski mimari)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'net_debt_amount'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        DROP COLUMN IF EXISTS net_debt_amount;
        RAISE NOTICE '🗑️ net_debt_amount kolonu kaldırıldı (artık kullanılmıyor)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurant_payment_transactions' 
        AND column_name = 'payment_to_debts'
    ) THEN
        ALTER TABLE restaurant_payment_transactions 
        DROP COLUMN IF EXISTS payment_to_debts;
        RAISE NOTICE '🗑️ payment_to_debts kolonu kaldırıldı (artık kullanılmıyor)';
    END IF;

    RAISE NOTICE '🎉 Tablo yapısı güncellendi!';
END $$;

-- Kontrol: Güncel şemayı göster
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'restaurant_payment_transactions'
ORDER BY ordinal_position;
