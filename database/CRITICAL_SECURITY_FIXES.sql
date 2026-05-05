-- ============================================
-- 🔒 KRİTİK GÜVENLİK DÜZELTMELERİ
-- ============================================
-- Bu SQL dosyası sistemdeki kritik güvenlik açıklarını kapatır
-- 
-- SORUN: Kurye veya restoran silindiğinde tüm sipariş geçmişi kaybolur!
-- ÇÖZÜM: Foreign key'leri RESTRICT yap (silme işlemini engelle)

-- ============================================
-- 1. KURYE SİLME KORUMASINI EKLE
-- ============================================

-- Mevcut foreign key'leri kaldır
ALTER TABLE packages 
DROP CONSTRAINT IF EXISTS packages_courier_id_fkey;

ALTER TABLE packages 
DROP CONSTRAINT IF EXISTS packages_delivered_by_courier_id_fkey;

-- Yeni foreign key'leri RESTRICT ile ekle
ALTER TABLE packages 
ADD CONSTRAINT packages_courier_id_fkey 
  FOREIGN KEY (courier_id) 
  REFERENCES couriers(id) 
  ON DELETE RESTRICT  -- ← Kurye silinemez!
  ON UPDATE CASCADE;

ALTER TABLE packages 
ADD CONSTRAINT packages_delivered_by_courier_id_fkey 
  FOREIGN KEY (delivered_by_courier_id) 
  REFERENCES couriers(id) 
  ON DELETE RESTRICT  -- ← Kurye silinemez!
  ON UPDATE CASCADE;

-- ============================================
-- 2. RESTORAN SİLME KORUMASINI EKLE
-- ============================================

-- Mevcut foreign key'i kaldır
ALTER TABLE packages 
DROP CONSTRAINT IF EXISTS packages_restaurant_id_fkey;

-- Yeni foreign key'i RESTRICT ile ekle
ALTER TABLE packages 
ADD CONSTRAINT packages_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) 
  REFERENCES restaurants(id) 
  ON DELETE RESTRICT  -- ← Restoran silinemez!
  ON UPDATE CASCADE;

-- ============================================
-- 3. ÖDEME YÖNTEMİ DEĞİŞİKLİĞİNİ ENGELLE
-- ============================================

CREATE OR REPLACE FUNCTION prevent_payment_method_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Teslim edilmiş paketlerde ödeme yöntemi değiştirilemez
  IF OLD.status = 'delivered' AND NEW.payment_method != OLD.payment_method THEN
    RAISE EXCEPTION 'Teslim edilmiş paketlerde ödeme yöntemi değiştirilemez!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_payment_method_change ON packages;

CREATE TRIGGER trg_prevent_payment_method_change
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION prevent_payment_method_change();

-- ============================================
-- 4. TESLİMAT ZAMANI DEĞİŞİKLİĞİNİ ENGELLE
-- ============================================

CREATE OR REPLACE FUNCTION prevent_delivered_at_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Teslim edilmiş paketlerde teslimat zamanı değiştirilemez
  IF OLD.status = 'delivered' AND 
     OLD.delivered_at IS NOT NULL AND 
     NEW.delivered_at != OLD.delivered_at THEN
    RAISE EXCEPTION 'Teslim edilmiş paketlerde teslimat zamanı değiştirilemez!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_delivered_at_change ON packages;

CREATE TRIGGER trg_prevent_delivered_at_change
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION prevent_delivered_at_change();

-- ============================================
-- 5. TESLİMAT SONRASI KURYE DEĞİŞİKLİĞİNİ ENGELLE
-- ============================================

CREATE OR REPLACE FUNCTION prevent_courier_change_after_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Teslim edilmiş paketlerde courier_id değiştirilemez
  IF OLD.status = 'delivered' AND 
     OLD.courier_id IS NOT NULL AND 
     NEW.courier_id != OLD.courier_id THEN
    RAISE EXCEPTION 'Teslim edilmiş paketlerde kurye değiştirilemez!';
  END IF;
  
  -- Teslim edilmiş paketlerde delivered_by_courier_id değiştirilemez
  IF OLD.status = 'delivered' AND 
     OLD.delivered_by_courier_id IS NOT NULL AND 
     NEW.delivered_by_courier_id != OLD.delivered_by_courier_id THEN
    RAISE EXCEPTION 'Teslim edilmiş paketlerde teslimat yapan kurye değiştirilemez!';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_courier_change_after_delivery ON packages;

CREATE TRIGGER trg_prevent_courier_change_after_delivery
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION prevent_courier_change_after_delivery();

-- ============================================
-- 6. DUPLICATE TESLİMAT KORUMASINI EKLE
-- ============================================

CREATE OR REPLACE FUNCTION prevent_duplicate_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Zaten delivered ise tekrar delivered yapılamaz
  IF OLD.status = 'delivered' AND NEW.status = 'delivered' THEN
    RAISE EXCEPTION 'Bu paket zaten teslim edilmiş!';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_delivery ON packages;

CREATE TRIGGER trg_prevent_duplicate_delivery
BEFORE UPDATE ON packages
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_delivery();

-- ============================================
-- 7. YORUM EKLE
-- ============================================

COMMENT ON CONSTRAINT packages_courier_id_fkey ON packages IS 
'Kurye silinemez - önce tüm paketleri başka kuryeye devret veya iptal et';

COMMENT ON CONSTRAINT packages_delivered_by_courier_id_fkey ON packages IS 
'Teslimat yapan kurye silinemez - geçmiş kayıtlar korunmalı';

COMMENT ON CONSTRAINT packages_restaurant_id_fkey ON packages IS 
'Restoran silinemez - önce tüm paketleri iptal et veya tamamla';

-- ============================================
-- ✅ TAMAMLANDI!
-- ============================================
-- Artık:
-- 1. Kurye silinmeye çalışılırsa → HATA
-- 2. Restoran silinmeye çalışılırsa → HATA
-- 3. Teslim edilmiş pakette ödeme yöntemi değiştirilmeye çalışılırsa → HATA
-- 4. Teslim edilmiş pakette teslimat zamanı değiştirilmeye çalışılırsa → HATA
-- 5. Teslim edilmiş pakette kurye değiştirilmeye çalışılırsa → HATA
-- 6. Zaten teslim edilmiş paket tekrar teslim edilmeye çalışılırsa → HATA
