/**
 * poll-trendyol-go-orders
 *
 * pg_cron dakikada 1 tetikler. Bu fonksiyon APP poll URL'ine POST atar;
 * Next.js tarafı polling_araligi_sn ile ~4 tick döner (salt okuma).
 *
 * Ortam:
 *   TRENDYOL_GO_POLL_URL  — örn. https://<app>/api/trendyol-go/poll
 *   CRON_SECRET           — poll route ile aynı
 *   (veya SERVICE_ROLE_KEY Bearer olarak)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async (_req) => {
  const started = Date.now()
  try {
    const pollUrl = Deno.env.get('TRENDYOL_GO_POLL_URL')
    const secret =
      Deno.env.get('CRON_SECRET') ||
      Deno.env.get('TRENDYOL_GO_CRON_SECRET') ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!pollUrl) {
      return new Response(
        JSON.stringify({ error: 'TRENDYOL_GO_POLL_URL eksik' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (!secret) {
      return new Response(
        JSON.stringify({ error: 'CRON_SECRET / SERVICE_ROLE_KEY eksik' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch(pollUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'edge-poll-trendyol-go-orders' }),
    })

    const text = await res.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      /* keep text */
    }

    const durationMs = Date.now() - started
    console.log(
      `[poll-trendyol-go-orders] status=${res.status} durationMs=${durationMs}`
    )

    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status, durationMs, body }),
      {
        status: res.ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[poll-trendyol-go-orders]', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
