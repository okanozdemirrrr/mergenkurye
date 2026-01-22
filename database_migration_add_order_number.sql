-- Packages tablosuna order_number kolonu ekle
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Mevcut paketlere sıralı numara ata (id'ye göre sıralı)
DO $$
DECLARE
  pkg RECORD;
  counter INTEGER := 1;
BEGIN
  FOR pkg IN 
    SELECT id FROM packages ORDER BY id ASC
  LOOP
    UPDATE packages 
    SET order_number = LPAD(counter::TEXT, 6, '0')
    WHERE id = pkg.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Yeni paketler için otomatik numara atama fonksiyonu
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  max_number INTEGER;
BEGIN
  -- En yüksek order_number'ı bul
  SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) INTO max_number
  FROM packages
  WHERE order_number IS NOT NULL AND order_number ~ '^\d+$';
  
  -- Yeni numara ata
  NEW.order_number := LPAD((max_number + 1)::TEXT, 6, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
DROP TRIGGER IF EXISTS set_order_number ON packages;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON packages
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_order_number ON packages(order_number);
