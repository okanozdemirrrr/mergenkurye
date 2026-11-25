-- =============================================================================
-- pg_cron: poll-trendyol-go-orders her 1 dakikada bir
-- Edge Function → Next /api/trendyol-go/poll (tick'li salt okuma)
--
-- NOT: <SERVICE_ROLE_KEY> yerine Project Settings → API service_role key.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('poll-trendyol-go-orders-every-1m');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'poll-trendyol-go-orders-every-1m',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://otrjbpwirwgrxmezyuwg.supabase.co/functions/v1/poll-trendyol-go-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
