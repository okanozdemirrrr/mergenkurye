-- Eski adres formatını (örn. "Yurt - Mahalle, İlçe, Kat: 1, No: 1")
-- yeni formata çevirir: "İlçe, Mahalle, Kat: 1, No: 1 [| Tarif: ...]"

CREATE OR REPLACE FUNCTION normalize_delivery_address()
RETURNS TRIGGER AS $$
DECLARE
  v_tarif TEXT;
  v_core TEXT;
  v_match TEXT[];
BEGIN
  IF NEW.delivery_address IS NULL OR btrim(NEW.delivery_address) = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.delivery_address ~* '\|\s*Tarif:' THEN
    v_tarif := btrim(substring(NEW.delivery_address FROM '\|\s*Tarif:\s*(.+)$'));
    v_core := btrim(substring(NEW.delivery_address FROM '^(.+?)(?:\s*\|\s*Tarif:)'));
  ELSE
    v_core := btrim(NEW.delivery_address);
    v_tarif := NULL;
  END IF;

  v_match := regexp_match(
    v_core,
    '^[^-]+\s*-\s*([^,]+),\s*([^,]+),\s*Kat:\s*([^,]+),\s*No:\s*(.+)$',
    'i'
  );

  IF v_match IS NOT NULL THEN
    v_core := btrim(v_match[2]) || ', ' || btrim(v_match[1]) || ', Kat: ' || btrim(v_match[3]) || ', No: ' || btrim(v_match[4]);
  END IF;

  IF v_tarif IS NOT NULL AND v_tarif <> '' THEN
    NEW.delivery_address := v_core || ' | Tarif: ' || v_tarif;
  ELSE
    NEW.delivery_address := v_core;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_packages_delivery_address ON packages;

CREATE TRIGGER normalize_packages_delivery_address
BEFORE INSERT OR UPDATE OF delivery_address ON packages
FOR EACH ROW
EXECUTE FUNCTION normalize_delivery_address();

-- Mevcut kayıtları da güncelle
UPDATE packages
SET delivery_address = delivery_address
WHERE delivery_address ~* '^[^-]+\s*-\s*[^,]+,\s*[^,]+,\s*Kat:\s*[^,]+,\s*No:\s*.+$';
