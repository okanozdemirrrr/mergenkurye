-- Restaurants tablosuna password kolonu ekle
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştır

-- Password kolonunu ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Mevcut restoranlar için şifre ekle
UPDATE restaurants SET password = 'gökhan123' WHERE name = 'egodöner';
UPDATE restaurants SET password = 'omerusta123' WHERE name = 'ömerusta';
UPDATE restaurants SET password = 'ikramdöner123' WHERE name = 'ikramdöner';

-- Kontrol et
SELECT id, name, password FROM restaurants;
