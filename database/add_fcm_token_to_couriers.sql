-- ============================================
-- FCM Token Sütunu Ekleme (Push Notifications)
-- ============================================
-- Tarih: 2026-04-16
-- Amaç: Kuryelere native push notification göndermek için FCM token'ı saklamak

-- Couriers tablosuna fcm_token sütunu ekle
ALTER TABLE couriers
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_couriers_fcm_token ON couriers(fcm_token);

-- Yorum ekle
COMMENT ON COLUMN couriers.fcm_token IS 'Firebase Cloud Messaging token for push notifications';

-- Doğrulama
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'couriers' AND column_name = 'fcm_token';
