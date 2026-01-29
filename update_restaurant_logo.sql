-- hepbiriz logosunu güncelle
-- Logo dosyası: public/restaurant-logos/hepbiriz.png

UPDATE restaurants 
SET logo_url = '/restaurant-logos/hepbiriz.png'
WHERE name = 'hepbiriz';

-- Veya ID ile güncelle (daha güvenli)
-- UPDATE restaurants 
-- SET logo_url = '/restaurant-logos/egodoner.png'
-- WHERE id = 1;

-- Kontrol et
SELECT id, name, logo_url FROM restaurants WHERE name = 'hepbiriz';
