-- ============================================
-- 🔔 BİLDİRİM SİSTEMİ - VERITABANI ŞEMASI
-- ============================================

-- 1. Notifications tablosu oluştur
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('order_reply', 'campaign', 'system', 'order_update')),
    is_read BOOLEAN DEFAULT FALSE,
    related_order_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    related_review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 2. Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_unread ON notifications(customer_id, is_read) WHERE is_read = FALSE;

-- 3. RLS (Row Level Security) politikaları
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Müşteriler sadece kendi bildirimlerini görebilir
CREATE POLICY "Customers can view own notifications"
ON notifications FOR SELECT
USING (true);

-- Sistem bildirimleri ekleyebilir
CREATE POLICY "Enable insert for all users"
ON notifications FOR INSERT
WITH CHECK (true);

-- Müşteriler kendi bildirimlerini güncelleyebilir (okundu işaretleme)
CREATE POLICY "Customers can update own notifications"
ON notifications FOR UPDATE
USING (true)
WITH CHECK (true);

-- 4. İzinleri ver
GRANT SELECT, INSERT, UPDATE ON notifications TO anon;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

-- 5. Trigger: Restoran yoruma yanıt verdiğinde bildirim oluştur
CREATE OR REPLACE FUNCTION notify_customer_on_review_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer reply eklendiyse ve önceden yoksa
  IF NEW.reply IS NOT NULL AND (OLD.reply IS NULL OR OLD.reply = '') THEN
    INSERT INTO notifications (
      customer_id,
      title,
      message,
      type,
      related_review_id,
      related_order_id,
      action_url
    )
    SELECT 
      NEW.customer_id,
      '🎉 Yorumunuza Yanıt Var!',
      'Restoranınız yorumunuza yanıt verdi. Hemen inceleyin!',
      'order_reply',
      NEW.id,
      NEW.order_id,
      '/musteri/siparislerim'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE related_review_id = NEW.id 
      AND type = 'order_reply'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_reply_notification ON reviews;
CREATE TRIGGER trigger_review_reply_notification
AFTER UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION notify_customer_on_review_reply();

-- 6. Trigger: Sipariş durumu değiştiğinde bildirim oluştur
CREATE OR REPLACE FUNCTION notify_customer_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Sadece belirli durum değişikliklerinde bildirim gönder
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'ready' THEN
        notification_title := '👨‍🍳 Siparişiniz Hazır!';
        notification_message := 'Siparişiniz ' || NEW.order_number || ' hazırlandı ve kurye ataması bekleniyor.';
      WHEN 'assigned' THEN
        notification_title := '🛵 Kurye Atandı!';
        notification_message := 'Siparişiniz ' || NEW.order_number || ' için kurye atandı. Yakında yola çıkacak.';
      WHEN 'on_the_way' THEN
        notification_title := '🚀 Siparişiniz Yolda!';
        notification_message := 'Kurye siparişinizi ' || NEW.order_number || ' getiriyor. Hazır olun!';
      WHEN 'delivered' THEN
        notification_title := '✅ Teslim Edildi!';
        notification_message := 'Siparişiniz ' || NEW.order_number || ' teslim edildi. Afiyet olsun!';
      ELSE
        RETURN NEW;
    END CASE;
    
    INSERT INTO notifications (
      customer_id,
      title,
      message,
      type,
      related_order_id,
      action_url
    ) VALUES (
      NEW.customer_id,
      notification_title,
      notification_message,
      'order_update',
      NEW.id,
      '/musteri/siparislerim'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_status_notification ON packages;
CREATE TRIGGER trigger_order_status_notification
AFTER UPDATE ON packages
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_customer_on_order_status_change();

-- 7. Fonksiyon: Toplu kampanya bildirimi gönder (Admin için)
CREATE OR REPLACE FUNCTION send_campaign_notification(
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO notifications (customer_id, title, message, type, action_url)
  SELECT id, p_title, p_message, 'campaign', p_action_url
  FROM customers;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Realtime için publication'a ekle (ÖNEMLI!)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- ✅ TAMAMLANDI!
-- ============================================
-- Realtime aktif! Yeni bildirimler anlık gelecek.
-- 
-- Test için:
-- SELECT send_campaign_notification('🎉 %20 İndirim!', 'Bugün tüm siparişlerde %20 indirim var!', '/musteri');
