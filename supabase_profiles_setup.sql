-- Profiles tablosuna gerekli alanları ekle (eğer yoksa)
-- Bu scripti Supabase SQL Editor'da çalıştır

-- Önce profiles tablosunun var olup olmadığını kontrol et
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status ve is_active alanlarını ekle (eğer yoksa)
DO $$ 
BEGIN
  -- Status alanını ekle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'busy'));
  END IF;
  
  -- is_active alanını ekle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT false;
  END IF;
END $$;

-- RLS (Row Level Security) politikalarını ayarla
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi profillerini görebilir ve güncelleyebilir
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Kurye kullanıcıları için örnek veri ekle (isteğe bağlı)
-- Bu kısmı sadece test için kullan, gerçek kullanıcılar auth.users'dan gelecek

-- Trigger fonksiyonu: Yeni kullanıcı kaydolduğunda otomatik profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, status, is_active)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'idle', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at alanını otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Packages tablosuna content (paket içeriği) sütunu ekle
DO $$ 
BEGIN
  -- Content alanını ekle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'packages' AND column_name = 'content') THEN
    ALTER TABLE packages ADD COLUMN content TEXT;
  END IF;
END $$;

-- Restaurants tablosunu oluştur ve örnek restoranları ekle
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Örnek restoranları ekle (eğer yoksa)
INSERT INTO restaurants (name) VALUES 
  ('egodöner'),
  ('ömerusta'), 
  ('ikramdöner')
ON CONFLICT (name) DO NOTHING;

-- RLS (Row Level Security) politikalarını ayarla
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Herkes restoranları görebilir (okuma)
CREATE POLICY IF NOT EXISTS "Everyone can view restaurants" ON restaurants
  FOR SELECT USING (true);

-- Sadece authenticated kullanıcılar restoran ekleyebilir/güncelleyebilir
CREATE POLICY IF NOT EXISTS "Authenticated users can insert restaurants" ON restaurants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can update restaurants" ON restaurants
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Paketlerin teslim edilme zamanını tutmak için eksik sütun
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Şemayı yenile ki hata anında gitsin
NOTIFY pgrst, 'reload schema';