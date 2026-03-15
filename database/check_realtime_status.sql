-- ============================================
-- 🔍 REALTIME DURUM KONTROLÜ
-- ============================================

-- 1. Realtime publication'da notifications var mı?
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'notifications';

-- Beklenen sonuç:
-- schemaname | tablename     | pubname
-- -----------|---------------|------------------
-- public     | notifications | supabase_realtime

-- Eğer boş gelirse, şunu çalıştır:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================

-- 2. Notifications tablosu var mı?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
) as table_exists;

-- ============================================

-- 3. RLS aktif mi?
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'notifications';

-- ============================================

-- 4. Test bildirimi gönder (opsiyonel)
-- Kendi customer_id'nizi buraya yazın:
-- INSERT INTO notifications (customer_id, title, message, type)
-- VALUES ('YOUR_CUSTOMER_ID', '🔔 Test', 'Realtime test bildirimi', 'system');
