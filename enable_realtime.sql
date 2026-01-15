-- Supabase Realtime'ı packages ve couriers tabloları için aktif et
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştır

-- Packages tablosu için realtime aktif et
ALTER PUBLICATION supabase_realtime ADD TABLE packages;

-- Couriers tablosu için realtime aktif et
ALTER PUBLICATION supabase_realtime ADD TABLE couriers;

-- Kontrol et (opsiyonel)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
