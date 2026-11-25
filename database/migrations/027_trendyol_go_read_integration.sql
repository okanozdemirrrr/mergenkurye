-- =============================================================================
-- Trendyol Go (TGO) Yemek — salt okuma entegrasyonu
-- Yazma servisleri (picked/invoiced/manual-*/unsupplied/test) YOK
-- =============================================================================

-- 1) packages: Trendyol alanları + operasyon bayrakları
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS gecmis_veri boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_test_order boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_address_masked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_courier_queue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trendyol_package_id text,
  ADD COLUMN IF NOT EXISTS trendyol_order_code text,
  ADD COLUMN IF NOT EXISTS trendyol_order_id text,
  ADD COLUMN IF NOT EXISTS trendyol_order_number text,
  ADD COLUMN IF NOT EXISTS delivery_type text,
  ADD COLUMN IF NOT EXISTS call_center_phone text,
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS adres_tarifinden_bulunan_telefon text,
  ADD COLUMN IF NOT EXISTS mutfak_notu text,
  ADD COLUMN IF NOT EXISTS kurye_notu text,
  ADD COLUMN IF NOT EXISTS genel_not text,
  ADD COLUMN IF NOT EXISTS customer_note_ham text,
  ADD COLUMN IF NOT EXISTS servis_istiyor_mu boolean,
  ADD COLUMN IF NOT EXISTS address_description text,
  ADD COLUMN IF NOT EXISTS payment_type_raw text,
  ADD COLUMN IF NOT EXISTS meal_card_source text,
  ADD COLUMN IF NOT EXISTS on_delivery_type text,
  ADD COLUMN IF NOT EXISTS courier_collects_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coupon_seller_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS cancel_info jsonb,
  ADD COLUMN IF NOT EXISTS ham_payload jsonb,
  ADD COLUMN IF NOT EXISTS package_creation_at timestamptz,
  ADD COLUMN IF NOT EXISTS package_modification_at timestamptz;

COMMENT ON COLUMN public.packages.gecmis_veri IS 'Geçmiş içe aktarım; kuyruk/bildirim/ciro dışı';
COMMENT ON COLUMN public.packages.exclude_from_courier_queue IS 'GO/maskeli/test/geçmiş: kurye atama kuyruğuna düşmez';
COMMENT ON COLUMN public.packages.trendyol_package_id IS 'Trendyol packageId (64-char string), integer değil';
COMMENT ON COLUMN public.packages.trendyol_order_code IS 'Kısa kod (örn 006) — kurye/restoran ekranı';
COMMENT ON COLUMN public.packages.adres_tarifinden_bulunan_telefon IS 'addressDescription içinden yakalanan; doğrulanmış müşteri telefonu değil';
COMMENT ON COLUMN public.packages.customer_note_ham IS 'customerNote ham metin; ayrıştırma başarısız olsa bile saklanır';

CREATE UNIQUE INDEX IF NOT EXISTS uq_packages_trendyol_package_id
  ON public.packages (trendyol_package_id)
  WHERE trendyol_package_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_packages_gecmis_veri
  ON public.packages (restaurant_id, gecmis_veri)
  WHERE gecmis_veri = true;

CREATE INDEX IF NOT EXISTS idx_packages_exclude_courier_queue
  ON public.packages (restaurant_id, exclude_from_courier_queue)
  WHERE exclude_from_courier_queue = true;

-- payment_method: online (zaten migration varsa no-op)
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_payment_method_check;
ALTER TABLE public.packages
  ADD CONSTRAINT packages_payment_method_check
  CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'iban'::text, 'online'::text]));

-- 2) Entegrasyon ayarları (restoran başına)
CREATE TABLE IF NOT EXISTS public.trendyol_go_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_id bigint NOT NULL,
  store_id text NOT NULL,
  api_key text NOT NULL,
  api_secret_encrypted text,
  basic_token_encrypted text,
  key_version integer NOT NULL DEFAULT 1,
  agent_name text NOT NULL DEFAULT 'Regon',
  executor_email text NOT NULL,
  ortam text NOT NULL DEFAULT 'prod' CHECK (ortam = ANY (ARRAY['prod'::text, 'stage'::text])),
  aktif_mi boolean NOT NULL DEFAULT false,
  polling_araligi_sn integer NOT NULL DEFAULT 15 CHECK (polling_araligi_sn >= 5 AND polling_araligi_sn <= 120),
  son_polling_imleci bigint,
  son_basarili_baglanti timestamptz,
  son_hata text,
  durum text NOT NULL DEFAULT 'ok' CHECK (durum = ANY (ARRAY['ok'::text, 'sorunlu'::text])),
  kilitleyen_worker_id text,
  kilit_bitis timestamptz,
  import_kilitleyen_worker_id text,
  import_kilit_bitis timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_trendyol_go_integrations_restaurant UNIQUE (restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_trendyol_go_integrations_aktif
  ON public.trendyol_go_integrations (aktif_mi)
  WHERE aktif_mi = true;

COMMENT ON TABLE public.trendyol_go_integrations IS 'Trendyol Go salt-okuma entegrasyon ayarları; secret alanlar şifreli';

-- 3) Idempotency / olay izi
CREATE TABLE IF NOT EXISTS public.trendyol_go_package_events (
  id bigserial PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  trendyol_package_id text NOT NULL,
  package_status text NOT NULL,
  local_package_id bigint REFERENCES public.packages(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  gecmis_veri boolean NOT NULL DEFAULT false,
  processed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_trendyol_go_package_events UNIQUE (trendyol_package_id, package_status)
);

CREATE INDEX IF NOT EXISTS idx_trendyol_go_package_events_local
  ON public.trendyol_go_package_events (local_package_id);

-- 4) Ürün eşleme
CREATE TABLE IF NOT EXISTS public.trendyol_go_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  trendyol_product_id text NOT NULL,
  trendyol_name text,
  local_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  eslesmedi_mi boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_trendyol_go_product_map UNIQUE (restaurant_id, trendyol_product_id)
);

CREATE INDEX IF NOT EXISTS idx_trendyol_go_product_unmatched
  ON public.trendyol_go_product_mappings (restaurant_id)
  WHERE eslesmedi_mi = true;

-- 5) API logları (secret maskeli)
CREATE TABLE IF NOT EXISTS public.trendyol_go_api_logs (
  id bigserial PRIMARY KEY,
  integration_id uuid REFERENCES public.trendyol_go_integrations(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  method text NOT NULL,
  path text NOT NULL,
  query_masked text,
  status_code integer,
  request_summary text,
  response_summary text,
  hata text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_trendyol_go_api_logs_created
  ON public.trendyol_go_api_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trendyol_go_api_logs_integration
  ON public.trendyol_go_api_logs (integration_id, created_at DESC);

-- 6) Night-shift: geçmiş / test / kuyruk-dışı paketlere kurye ATAMA
--    (022_auto_assign_hours_settings mantığı + Trendyol bayrakları)
CREATE OR REPLACE FUNCTION public.auto_assign_night_shift_courier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_night_courier_id UUID;
  v_local_time       TIME;
  v_start_time       TIME;
  v_end_time         TIME;
  v_in_window        BOOLEAN := false;
BEGIN
  IF COALESCE(NEW.exclude_from_courier_queue, false)
     OR COALESCE(NEW.gecmis_veri, false)
     OR COALESCE(NEW.is_test_order, false) THEN
    RETURN NEW;
  END IF;

  IF NEW.courier_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_local_time := (NOW() AT TIME ZONE 'Europe/Istanbul')::time;

  SELECT COALESCE(
    (SELECT value::time FROM app_settings WHERE key = 'auto_assign_start_time' LIMIT 1),
    TIME '00:30'
  ) INTO v_start_time;

  SELECT COALESCE(
    (SELECT value::time FROM app_settings WHERE key = 'auto_assign_end_time' LIMIT 1),
    TIME '02:00'
  ) INTO v_end_time;

  IF v_start_time <= v_end_time THEN
    v_in_window := (v_local_time >= v_start_time AND v_local_time <= v_end_time);
  ELSE
    v_in_window := (v_local_time >= v_start_time OR v_local_time <= v_end_time);
  END IF;

  IF v_in_window THEN
    SELECT id
    INTO v_night_courier_id
    FROM couriers
    WHERE is_night_shift = true
    LIMIT 1;

    IF v_night_courier_id IS NOT NULL THEN
      NEW.courier_id := v_night_courier_id;
      NEW.status := 'assigned';
      NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_assign_night_shift_courier() IS
  'Gece vardiyası otomatik atama. Trendyol GO/geçmiş/test (exclude_from_courier_queue) paketleri atlanır.';
