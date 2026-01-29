-- Hepbiriz logosunu güncelle
-- Dosya adı: hepbiriznew.png

UPDATE restaurants 
SET logo_url = '/restaurant-logos/hepbiriznew.png'
WHERE name = 'hepbiriz';

-- Kontrol et
SELECT id, name, logo_url FROM restaurants WHERE name = 'hepbiriz';
