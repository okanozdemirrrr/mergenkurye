-- Supabase Storage bucket'larını oluştur (Basitleştirilmiş - Auth olmadan)

-- Restaurant images bucket (logo ve cover)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-images', 'restaurant-images', true)
ON CONFLICT (id) DO NOTHING;

-- Menu item images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - Herkes her şeyi yapabilir (development için)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'restaurant-images' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'restaurant-images' );
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'restaurant-images' );

CREATE POLICY "Public Access Menu" ON storage.objects FOR SELECT USING ( bucket_id = 'menu-images' );
CREATE POLICY "Public Upload Menu" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'menu-images' );
CREATE POLICY "Public Delete Menu" ON storage.objects FOR DELETE USING ( bucket_id = 'menu-images' );
