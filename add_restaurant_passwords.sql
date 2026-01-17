-- Restaurants tablosuna password kolonu ekle
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Mevcut restoranlar için şifreler ekle
UPDATE restaurants SET password = 'ilhan123' WHERE name = 'İlhandöner';
UPDATE restaurants SET password = 'ego123' WHERE name = 'egodöner';
UPDATE restaurants SET password = 'veli123' WHERE name = 'Velibaba Ekmek';
UPDATE restaurants SET password = 'omer123' WHERE name = 'Ömerusta';

-- Kontrol et
SELECT id, name, password FROM restaurants;
