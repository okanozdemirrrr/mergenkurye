-- KURYE VERİLERİNİ TAMAMEN SIFIRLA VE YENİDEN OLUŞTUR
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- Önce couriers tablosunu sil ve yeniden oluştur
DROP TABLE IF EXISTS couriers CASCADE;

-- Couriers tablosunu yeniden oluştur
CREATE TABLE couriers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'picking_up', 'on_the_way', 'assigned', 'inactive')),
  last_lat DECIMAL(10, 8),
  last_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikalarını ayarla
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view couriers" ON couriers FOR SELECT USING (true);
CREATE POLICY "Couriers can update own data" ON couriers FOR UPDATE USING (true);

-- ZORUNLU: Test verilerini ekle
INSERT INTO couriers (username, password, full_name, is_active, status, last_lat, last_lng) VALUES 
  ('ahmet55', 'ahmet55123', 'Ahmet Abi', true, 'idle', 41.2867, 36.3300),
  ('taha', 'taha123', 'Taha', true, 'idle', 41.2900, 36.3350);

-- Sonucu kontrol et
SELECT 'COURIERS TABLOSU:' as info;
SELECT id, username, full_name, is_active, status, last_lat, last_lng FROM couriers;

-- Toplam sayıyı göster
SELECT COUNT(*) as toplam_kurye FROM couriers;