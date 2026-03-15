-- Sadece Storage bucket'larını oluştur (Policy'ler zaten var)

-- Restaurant images bucket (logo ve cover)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Menu item images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket'ların oluşturulduğunu kontrol et
SELECT id, name, public FROM storage.buckets WHERE id IN ('restaurant-images', 'menu-images');
