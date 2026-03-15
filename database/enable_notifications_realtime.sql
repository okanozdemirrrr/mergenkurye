-- ============================================
-- 🔔 NOTIFICATIONS REALTIME AKTIFLEŞTIRME
-- ============================================
-- Bu script notifications tablosunu Supabase Realtime'a bağlar
-- Böylece yeni bildirimler anlık olarak müşterilere ulaşır

-- 1. Realtime için publication'a ekle
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Kontrol et (opsiyonel)
-- Aşağıdaki sorguyu çalıştırarak kontrol edebilirsiniz:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================
-- ✅ TAMAMLANDI!
-- ============================================
-- Artık notifications tablosunda yapılan değişiklikler
-- (INSERT, UPDATE, DELETE) realtime olarak istemcilere iletilecek.

-- Test için:
-- 1. Tarayıcı konsolunu aç (F12)
-- 2. Yeni bir bildirim ekle:
--    INSERT INTO notifications (customer_id, title, message, type)
--    VALUES ('YOUR_CUSTOMER_ID', '🎉 Test', 'Realtime çalışıyor!', 'system');
-- 3. Konsolda "🔔 Yeni bildirim:" mesajını görmelisiniz
-- 4. Zil ikonunda badge otomatik güncellenmelidir
