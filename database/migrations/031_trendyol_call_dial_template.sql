ALTER TABLE public.trendyol_go_integrations
  ADD COLUMN IF NOT EXISTS call_dial_template text NOT NULL DEFAULT '{callCenterPhone},,,{pinCode}#';

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS call_dial_template text;

COMMENT ON COLUMN public.trendyol_go_integrations.call_dial_template IS
  'Kurye tel: şablonu; {callCenterPhone} {pinCode}, virgül=duraklama';

COMMENT ON COLUMN public.packages.call_dial_template IS
  'Sipariş anındaki arama şablonu snapshot';
