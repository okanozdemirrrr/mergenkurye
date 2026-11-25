ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS trendyol_app_name text;

COMMENT ON COLUMN public.packages.trendyol_app_name IS
  'userInformation.appName: Trendyol | TrendyolGo | Galaxy';
