-- Packages tablosuna settled_at sütunu ekle
ALTER TABLE packages ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;

-- İndeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_settled_at ON packages(settled_at);

-- Açıklama: 
-- settled_at: Paketin gün sonu işleminde kapatıldığı tarih
-- NULL ise henüz kapatılmamış (genel toplama dahil)
-- Dolu ise kapatılmış (genel toplama dahil değil, sadece nakit/kart toplamda görünür)
