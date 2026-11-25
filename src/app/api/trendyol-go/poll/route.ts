/**
 * Canlı poll (tick'li). Yalnızca CRON_SECRET / SERVICE_ROLE ile.
 * pg_cron veya Edge Function tetikler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { runPollWithTicks } from '@/lib/trendyol-go/pollWorker'

function authorizeCron(request: NextRequest): boolean {
  const header = request.headers.get('authorization') || ''
  const bearer = header.replace(/^Bearer\s+/i, '').trim()
  const cronSecret = process.env.CRON_SECRET || process.env.TRENDYOL_GO_CRON_SECRET
  const serviceKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (cronSecret && bearer === cronSecret) return true
  if (serviceKey && bearer === serviceKey) return true
  return false
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const result = await runPollWithTicks(supabase)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('trendyol-go poll:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Poll başarısız' },
      { status: 500 }
    )
  }
}
