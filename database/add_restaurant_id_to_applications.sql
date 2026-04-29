-- Applications tablosuna restaurant_id kolonu ekle
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by UUID;