-- Asaf'ı ekle

INSERT INTO couriers (username, password, full_name, is_active, status, last_lat, last_lng)
VALUES ('asaf', 'asaf123', 'Asaf', true, 'idle', 41.0082, 28.9784);

-- Kontrol
SELECT 'ASAF EKLENDİ!' as mesaj;
SELECT id, username, full_name, password, is_active, last_lat, last_lng FROM couriers ORDER BY full_name;
