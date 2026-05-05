-- Order Logs Tablosu - Sipariş işlemlerini loglamak için
-- Admin panelinde restoran iptallerini görmek için kullanılır

CREATE TABLE IF NOT EXISTS order_logs (
  id BIGSERIAL PRIMARY KEY,
  package_id BIGINT REFERENCES packages(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_order_logs_package_id ON order_logs(package_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_action ON order_logs(action);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at ON order_logs(created_at DESC);

-- RLS Politikaları
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

-- Admin her şeyi görebilir
CREATE POLICY "Admin can view all logs" ON order_logs
  FOR SELECT
  USING (true);

-- Sistem her şeyi ekleyebilir
CREATE POLICY "System can insert logs" ON order_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE order_logs IS 'Sipariş işlem logları - İptal, durum değişikliği vb.';
COMMENT ON COLUMN order_logs.action IS 'İşlem tipi: cancelled_by_restaurant, cancelled_by_admin, status_changed vb.';
COMMENT ON COLUMN order_logs.details IS 'İşlem detayları JSON formatında';
