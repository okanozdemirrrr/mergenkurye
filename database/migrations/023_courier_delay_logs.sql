-- =============================================================================
-- courier_delay_logs — 10 dk teslim alınmayan paket bildirim logları
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.courier_delay_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id  UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  order_id    BIGINT NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courier_delay_logs_order_id_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_courier_delay_logs_created_at
  ON public.courier_delay_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_courier_delay_logs_courier_id
  ON public.courier_delay_logs (courier_id);

COMMENT ON TABLE public.courier_delay_logs IS
  'Kuryenin paketi 10 dakikadır teslim almadığı durumlarda atılan FCM bildirim logları. order_id unique: aynı sipariş tekrar loglanmaz.';

-- RLS (proje genelinde anon SELECT erişim modeli; yazma yalnızca service_role)
ALTER TABLE public.courier_delay_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_delay_logs_select_all" ON public.courier_delay_logs;
CREATE POLICY "courier_delay_logs_select_all"
  ON public.courier_delay_logs FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.courier_delay_logs TO anon, authenticated;
GRANT ALL ON public.courier_delay_logs TO service_role;
