-- =============================================================================
-- pg_cron: check-delayed-packages her 2 dakikada bir
-- Gerekli eklentiler: pg_cron, pg_net
--
-- NOT: Aşağıdaki <SERVICE_ROLE_KEY> yerine Supabase Project Settings → API
--      içindeki service_role key'ini yapıştırın (veya Vault kullanın).
-- Project ref: otrjbpwirwgrxmezyuwg
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Eski job varsa kaldır (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('check-delayed-packages-every-2m');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- job yoksa sessiz geç
END $$;

SELECT cron.schedule(
  'check-delayed-packages-every-2m',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://otrjbpwirwgrxmezyuwg.supabase.co/functions/v1/check-delayed-packages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
