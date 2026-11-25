-- Trendyol Go tabloları: anon/authenticated erişimi kapalı.
-- Service role RLS'yi bypass eder; tüm erişim Next API / Edge üzerinden.

ALTER TABLE public.trendyol_go_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendyol_go_package_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendyol_go_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trendyol_go_api_logs ENABLE ROW LEVEL SECURITY;
