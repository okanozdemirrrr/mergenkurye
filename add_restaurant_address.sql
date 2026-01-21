-- restaurants tablosuna address kolonu ekle
ALTER TABLE restaurants 
ADD COLUMN address TEXT;

-- Restoran adreslerini güncelle (gerçek adresleri gir)
-- UPDATE restaurants SET address = 'Pazar, Palmiye Sk. No:15, 55450 19 Mayıs/Samsun' WHERE name = 'İlhandöner';
-- UPDATE restaurants SET address = 'Pazar, 55420 19 Mayıs/Samsun' WHERE name = 'egodöner';
-- UPDATE restaurants SET address = 'Fırat, Turgut Özal Cd., 44320 Malatya Merkez/Malatya' WHERE name = 'Velibaba Ekmek';
-- UPDATE restaurants SET address = 'Pazar, Samsun Sinop Yolu Samsun- no:119, 55420 19 Mayıs/Samsun' WHERE name = 'Ömerusta';
