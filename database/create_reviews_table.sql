-- Değerlendirme sistemi tablosu oluştur

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id INTEGER NOT NULL UNIQUE REFERENCES packages(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating_taste INTEGER NOT NULL CHECK (rating_taste >= 1 AND rating_taste <= 5),
  rating_delivery INTEGER NOT NULL CHECK (rating_delivery >= 1 AND rating_delivery <= 5),
  comment TEXT,
  reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replied_at TIMESTAMP WITH TIME ZONE
);

-- Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- RLS (Row Level Security) - Herkese okuma izni
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
ON reviews FOR SELECT
USING (true);

CREATE POLICY "Customers can insert their own reviews"
ON reviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Restaurants can update replies"
ON reviews FOR UPDATE
USING (true);

-- Yorumlar
COMMENT ON TABLE reviews IS 'Müşteri değerlendirmeleri ve restoran cevapları';
COMMENT ON COLUMN reviews.order_id IS 'Değerlendirilen sipariş (benzersiz - bir sipariş için bir yorum)';
COMMENT ON COLUMN reviews.rating_taste IS 'Lezzet puanı (1-5)';
COMMENT ON COLUMN reviews.rating_delivery IS 'Teslimat puanı (1-5)';
COMMENT ON COLUMN reviews.comment IS 'Müşteri yorumu';
COMMENT ON COLUMN reviews.reply IS 'Restoran cevabı';
COMMENT ON COLUMN reviews.replied_at IS 'Restoranın cevap verdiği zaman';
