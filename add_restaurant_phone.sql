-- restaurants tablosuna phone kolonu ekle
ALTER TABLE restaurants 
ADD COLUMN phone TEXT;

-- Mevcut restoranlar için örnek numaralar (isteğe bağlı)
-- UPDATE restaurants SET phone = '0532-XXX-XX-XX' WHERE name = 'İlhandöner';
-- UPDATE restaurants SET phone = '0533-XXX-XX-XX' WHERE name = 'egodöner';
-- UPDATE restaurants SET phone = '0534-XXX-XX-XX' WHERE name = 'Velibaba Ekmek';
-- UPDATE restaurants SET phone = '0535-XXX-XX-XX' WHERE name = 'Ömerusta';
