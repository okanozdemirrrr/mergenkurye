-- Checkout için gerekli sütunları kontrol et ve ekle

-- 1. items sütunu (JSONB) - sipariş öğeleri
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- 2. subtotal - ara toplam
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0;

-- 3. delivery_fee - teslimat ücreti
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 0;

-- 4. payment_method - ödeme yöntemi
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('cash', 'card', 'iban');
    END IF;
END $$;

ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS payment_method payment_method_enum DEFAULT 'cash';

-- 5. order_number - sipariş numarası
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- 6. platform - sipariş platformu
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

-- 7. customer_id - müşteri ID'si (UUID)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 8. Index'ler
CREATE INDEX IF NOT EXISTS idx_packages_customer ON packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_order_number ON packages(order_number);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

-- Kontrol sorgusu
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'packages'
AND column_name IN ('items', 'subtotal', 'delivery_fee', 'payment_method', 'order_number', 'platform', 'customer_id')
ORDER BY column_name;
