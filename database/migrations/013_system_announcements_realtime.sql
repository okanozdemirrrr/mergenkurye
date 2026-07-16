-- =============================================================================
-- system_announcements tablosunu Supabase Realtime yayınına ekle
-- Supabase SQL Editor'da çalıştırın (012 migration sonrası)
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE system_announcements;

-- Doğrulama (isteğe bağlı):
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
