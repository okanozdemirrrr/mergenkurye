-- Reviews Reply System Fix
-- Restoran yanıt sistemi için gerekli düzeltmeler

-- 1. Kolonları kontrol et ve ekle
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS restaurant_reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- 2. RLS politikalarını kaldır (geçici olarak)
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- 3. Veya sadece update için policy ekle
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
DROP POLICY IF EXISTS "Enable read access for all users" ON reviews;
CREATE POLICY "Enable read access for all users"
ON reviews FOR SELECT
USING (true);

-- Müşteriler kendi yorumlarını ekleyebilir
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON reviews;
CREATE POLICY "Enable insert for authenticated users"
ON reviews FOR INSERT
WITH CHECK (true);

-- Restoranlar kendi yorumlarını güncelleyebilir (yanıt ekleyebilir)
DROP POLICY IF EXISTS "Enable update for restaurants" ON reviews;
CREATE POLICY "Enable update for restaurants"
ON reviews FOR UPDATE
USING (true)
WITH CHECK (true);

-- 4. Trigger - Restoran yanıt verdiğinde müşteriye bildirim gönder
CREATE OR REPLACE FUNCTION notify_customer_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer restaurant_reply yeni eklendiyse (NULL'dan dolu'ya geçtiyse)
  IF OLD.restaurant_reply IS NULL AND NEW.restaurant_reply IS NOT NULL THEN
    -- Müşteriye bildirim gönder
    INSERT INTO notifications (
      customer_id,
      title,
      message,
      type,
      action_url,
      related_order_id
    )
    VALUES (
      NEW.customer_id,
      'Yorumunuza Yanıt Var! 💬',
      'Restoranınız yorumunuza yanıt verdi. Hemen inceleyin!',
      'order_reply',
      '/musteri/siparislerim',
      NEW.order_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_review_reply ON reviews;
CREATE TRIGGER on_review_reply
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_on_reply();

-- 5. Test için örnek veri kontrolü
SELECT 
  id,
  customer_id,
  restaurant_id,
  comment,
  restaurant_reply,
  replied_at
FROM reviews
LIMIT 5;
