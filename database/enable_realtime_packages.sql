-- Packages tablosu için Realtime'ı aktifleştir
ALTER PUBLICATION supabase_realtime ADD TABLE packages;

-- Kontrol et
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
