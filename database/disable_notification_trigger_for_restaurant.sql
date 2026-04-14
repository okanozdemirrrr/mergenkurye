-- ============================================
-- 🔧 RESTORAN PANELİ İÇİN BİLDİRİM TRİGGER'INI DEVRE DIŞI BIRAK
-- ============================================
-- Sorun: Restoran panelinden sipariş durumu güncellendiğinde
-- customer_id NULL olduğu için bildirim trigger'ı hata veriyor
-- Çözüm: Trigger'ı tamamen kaldır veya sadece customer_id varsa çalıştır

-- SEÇENEK 1: Trigger'ı tamamen kaldır (Önerilen)
-- Restoran panelinde müşteri bildirimi gerekmez
DROP TRIGGER IF EXISTS trigger_order_status_notification ON packages;

-- SEÇENEK 2: Trigger'ı güncelle (customer_id kontrolü ile)
-- Eğer trigger'ı tutmak istiyorsanız bu versiyonu kullanın
CREATE OR REPLACE FUNCTION notify_customer_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- customer_id NULL ise hiçbir şey yapma
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sadece belirli durum değişikliklerinde bildirim gönder
  IF NEW.status != OLD.status THEN
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
    
    -- Bildirim ekle (sadece customer_id varsa)
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        -- Hata durumunda trigger'ı çökertme
        RAISE WARNING 'Bildirim oluşturulamadı: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı yeniden oluştur (sadece customer_id varsa çalışır)
-- DROP TRIGGER IF EXISTS trigger_order_status_notification ON packages;
-- CREATE TRIGGER trigger_order_status_notification
-- AFTER UPDATE ON packages
-- FOR EACH ROW
-- WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.customer_id IS NOT NULL)
-- EXECUTE FUNCTION notify_customer_on_order_status_change();

-- ============================================
-- ✅ TAMAMLANDI!
-- ============================================
-- Seçenek 1 kullanıldı: Trigger tamamen kaldırıldı
-- Restoran panelinden sipariş durumu güncellenirken artık hata vermeyecek
-- 
-- NOT: Müşteri uygulaması için bildirim gerekiyorsa,
-- admin panelinden veya kurye uygulamasından durum güncellendiğinde
-- customer_id'yi manuel olarak kontrol edip bildirim gönderebilirsiniz.
