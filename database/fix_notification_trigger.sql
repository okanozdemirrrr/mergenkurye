-- ============================================
-- 🔧 BİLDİRİM TRİGGER'I DÜZELTMESİ
-- ============================================
-- Sorun: packages tablosunda customer_id sütunu yok
-- Çözüm: customer_id kontrolü ekle, yoksa bildirim gönderme

-- Güncellenmiş trigger fonksiyonu
CREATE OR REPLACE FUNCTION notify_customer_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  v_customer_id UUID;
BEGIN
  -- Sadece belirli durum değişikliklerinde bildirim gönder
  IF NEW.status != OLD.status THEN
    -- customer_id sütunu var mı kontrol et
    BEGIN
      v_customer_id := NEW.customer_id;
    EXCEPTION
      WHEN undefined_column THEN
        -- customer_id sütunu yoksa, bildirim gönderme
        RETURN NEW;
    END;
    
    -- customer_id NULL ise bildirim gönderme
    IF v_customer_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    CASE NEW.status
      WHEN 'ready' THEN
        notification_title := '👨‍🍳 Siparişiniz Hazır!';
        notification_message := 'Siparişiniz ' || COALESCE(NEW.order_number, '#' || NEW.id::TEXT) || ' hazırlandı ve kurye ataması bekleniyor.';
      WHEN 'assigned' THEN
        notification_title := '🛵 Kurye Atandı!';
        notification_message := 'Siparişiniz ' || COALESCE(NEW.order_number, '#' || NEW.id::TEXT) || ' için kurye atandı. Yakında yola çıkacak.';
      WHEN 'on_the_way' THEN
        notification_title := '🚀 Siparişiniz Yolda!';
        notification_message := 'Kurye siparişinizi ' || COALESCE(NEW.order_number, '#' || NEW.id::TEXT) || ' getiriyor. Hazır olun!';
      WHEN 'delivered' THEN
        notification_title := '✅ Teslim Edildi!';
        notification_message := 'Siparişiniz ' || COALESCE(NEW.order_number, '#' || NEW.id::TEXT) || ' teslim edildi. Afiyet olsun!';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Bildirim ekle
    INSERT INTO notifications (
      customer_id,
      title,
      message,
      type,
      related_order_id,
      action_url
    ) VALUES (
      v_customer_id,
      notification_title,
      notification_message,
      'order_update',
      NEW.id,
      '/musteri/siparislerim'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Herhangi bir hata durumunda trigger'ı çökertme
    RAISE WARNING 'Bildirim oluşturulamadı: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS trigger_order_status_notification ON packages;
CREATE TRIGGER trigger_order_status_notification
AFTER UPDATE ON packages
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_customer_on_order_status_change();

-- ============================================
-- ✅ TAMAMLANDI!
-- ============================================
-- Artık customer_id yoksa veya NULL ise trigger hata vermeyecek
