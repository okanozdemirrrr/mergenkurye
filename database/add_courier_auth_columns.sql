-- ============================================
-- Courier Authentication Columns
-- ============================================
-- Tarih: 2026-05-04
-- Amaç: Couriers tablosuna username ve password alanları eklemek

-- Username ve password sütunları ekle
ALTER TABLE couriers
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_couriers_username ON couriers(username);

-- Test verisi ekle
INSERT INTO couriers (full_name, phone, username, password, is_active) 
VALUES 
  ('Okan Baba', '05551234567', 'okanbaba44', 'şifre', true),
  ('Test Kurye', '05559876543', 'testkurye', '123456', true)
ON CONFLICT (username) DO NOTHING;

-- Doğrulama
SELECT id, full_name, username, is_active FROM couriers WHERE username IS NOT NULL;