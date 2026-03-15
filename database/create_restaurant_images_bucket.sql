-- Supabase Storage Bucket Oluşturma
-- Bu script Supabase Dashboard > Storage bölümünden manuel olarak çalıştırılmalı

-- 1. Supabase Dashboard'a git
-- 2. Storage > Create Bucket
-- 3. Bucket adı: restaurant-images
-- 4. Public bucket: AÇIK (true)
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
-- 6. File size limit: 5MB

-- Storage Policy Oluşturma (SQL Editor'den çalıştır)

-- Public Read Policy (Herkes okuyabilir)
CREATE POLICY "Public read access for restaurant images"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-images');

-- Authenticated Upload Policy (Giriş yapmış kullanıcılar yükleyebilir)
CREATE POLICY "Authenticated users can upload restaurant images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND auth.role() = 'authenticated'
);

-- Authenticated Update Policy (Giriş yapmış kullanıcılar güncelleyebilir)
CREATE POLICY "Authenticated users can update restaurant images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'restaurant-images' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND auth.role() = 'authenticated'
);

-- Authenticated Delete Policy (Giriş yapmış kullanıcılar silebilir)
CREATE POLICY "Authenticated users can delete restaurant images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'restaurant-images' 
  AND auth.role() = 'authenticated'
);

-- NOT: Eğer bucket zaten varsa, sadece policy'leri çalıştırın
-- Bucket yoksa önce Dashboard'dan oluşturun, sonra policy'leri ekleyin
