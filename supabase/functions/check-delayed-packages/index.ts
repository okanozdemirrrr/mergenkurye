/**
 * check-delayed-packages
 *
 * İki kademeli gecikme kontrolü:
 *  1) 10 dk — is_delay_warning_sent
 *  2) 15 dk — reminder_15min_sent
 *
 * FCM: HTTP v1 (jose JWT — Deno uyumlu, google-auth-library YOK)
 */
import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PackageRow = {
  id: number | string
  courier_id: string | null
  assigned_at: string | null
}

type CourierRow = {
  id: string
  fcm_token: string | null
}

type WarningTier = {
  minutes: number
  flagColumn: 'is_delay_warning_sent' | 'reminder_15min_sent'
  title: string
  body: string
  dataType: string
  tagPrefix: string
}

const TIERS: WarningTier[] = [
  {
    minutes: 10,
    flagColumn: 'is_delay_warning_sent',
    title: '⚠️ Geciken Teslimat',
    body: 'Üzerinize atanan paketi 10 dakikadır teslim almadınız. Lütfen acilen restorana yönelin.',
    dataType: 'delay_warning',
    tagPrefix: 'delay10',
  },
  {
    minutes: 15,
    flagColumn: 'reminder_15min_sent',
    title: '🚨 Hâlâ Alınmamış Paket!',
    body: 'İçinizde hâlâ restorandan alınmamış bir paket var. 15 dakikadır bekliyor — hemen teslim alın.',
    dataType: 'reminder_15min',
    tagPrefix: 'delay15',
  },
]

function getEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id?: string
}

async function getFirebaseAccessToken(serviceAccountJson: string): Promise<string> {
  let raw = serviceAccountJson.trim()

  // Secret bazen çift encode / baş-son tırnaklı gelebilir
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1)
  }

  let sa: ServiceAccount
  try {
    sa = JSON.parse(raw) as ServiceAccount
  } catch (e1) {
    // Escape edilmiş JSON string olabilir
    try {
      sa = JSON.parse(JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)) as ServiceAccount
    } catch {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_KEY JSON parse hatası: ${
          e1 instanceof Error ? e1.message : String(e1)
        } | preview=${raw.slice(0, 40)}`
      )
    }
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY geçersiz (client_email/private_key yok)')
  }

  const pem = String(sa.private_key).replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(pem, 'RS256')
  const now = Math.floor(Date.now() / 1000)

  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const tokenJson = await tokenRes.json()
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(`Firebase token alınamadı: ${JSON.stringify(tokenJson)}`)
  }

  return tokenJson.access_token as string
}

function buildFcmPayload(token: string, packageId: number | string, tier: WarningTier) {
  return {
    message: {
      token,
      notification: {
        title: tier.title,
        body: tier.body,
      },
      data: {
        package_id: String(packageId),
        type: tier.dataType,
      },
      android: {
        priority: 'HIGH',
        notification: {
          channel_id: 'mergen_high_priority',
          sound: 'default',
          default_sound: true,
          default_vibrate_timings: true,
          notification_priority: 'PRIORITY_MAX',
          visibility: 'PUBLIC',
          tag: `${tier.tagPrefix}_${packageId}`,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: tier.title,
              body: tier.body,
            },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      },
    },
  }
}

async function processTier(
  supabase: SupabaseClient,
  accessToken: string,
  fcmUrl: string,
  courierTokenMap: Map<string, string>,
  tier: WarningTier,
) {
  const thresholdIso = new Date(Date.now() - tier.minutes * 60 * 1000).toISOString()

  const { data: delayedPackages, error: delayedError } = await supabase
    .from('packages')
    .select('id, courier_id, assigned_at')
    .eq('status', 'assigned')
    .eq(tier.flagColumn, false)
    .not('courier_id', 'is', null)
    .lte('assigned_at', thresholdIso)

  if (delayedError) {
    throw new Error(`[${tier.flagColumn}] paket sorgusu: ${delayedError.message}`)
  }

  if (!delayedPackages?.length) {
    return {
      scanned: 0,
      processed: 0,
      thresholdIso,
      failed: [] as Array<{ packageId: number | string; reason: string }>,
    }
  }

  const packageRows = delayedPackages as PackageRow[]
  const successfulPackageIds: Array<number | string> = []
  const failed: Array<{ packageId: number | string; reason: string }> = []

  for (const pkg of packageRows) {
    if (!pkg.courier_id) continue
    const token = courierTokenMap.get(pkg.courier_id)

    if (!token) {
      failed.push({ packageId: pkg.id, reason: 'Kurye FCM token yok' })
      continue
    }

    // APNs device token (64 hex) FCM'e gitmez
    if (/^[0-9a-fA-F]{64}$/.test(token.trim())) {
      failed.push({ packageId: pkg.id, reason: 'Token APNs formatında (FCM değil)' })
      continue
    }

    const sendRes = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildFcmPayload(token, pkg.id, tier)),
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      failed.push({ packageId: pkg.id, reason: `FCM ${sendRes.status}: ${errText}` })
      continue
    }

    successfulPackageIds.push(pkg.id)
  }

  if (successfulPackageIds.length > 0) {
    const { error: updateError } = await supabase
      .from('packages')
      .update({ [tier.flagColumn]: true })
      .in('id', successfulPackageIds)

    if (updateError) {
      throw new Error(`[${tier.flagColumn}] update hatası: ${updateError.message}`)
    }
  }

  return {
    scanned: packageRows.length,
    processed: successfulPackageIds.length,
    thresholdIso,
    failed,
  }
}

Deno.serve(async () => {
  try {
    const supabaseUrl = getEnv('SUPABASE_URL')
    const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    const firebaseProjectId = getEnv('FIREBASE_PROJECT_ID')
    const firebaseServiceAccountKey = getEnv('FIREBASE_SERVICE_ACCOUNT_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const accessToken = await getFirebaseAccessToken(firebaseServiceAccountKey)
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`

    const widestThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: candidatePackages, error: candidateError } = await supabase
      .from('packages')
      .select('id, courier_id, status, assigned_at, is_delay_warning_sent, reminder_15min_sent')
      .eq('status', 'assigned')
      .eq('courier_id', '8a18f119-b81b-4992-9583-70fd3cd7d757')
      .lte('assigned_at', widestThreshold)
      .order('assigned_at', { ascending: true })
      .limit(20)

    // aday kuryeleri genel çek
    const { data: allCandidates, error: allCandErr } = await supabase
      .from('packages')
      .select('courier_id')
      .eq('status', 'assigned')
      .not('courier_id', 'is', null)
      .lte('assigned_at', widestThreshold)

    if (candidateError) {
      throw new Error(`Debug aday sorgu: ${candidateError.message}`)
    }
    if (allCandErr) {
      throw new Error(`Aday paket sorgusu: ${allCandErr.message}`)
    }

    const courierIds = [
      ...new Set(
        ((allCandidates || []) as Array<{ courier_id: string | null }>)
          .map((p) => p.courier_id)
          .filter(Boolean) as string[],
      ),
    ]

    let courierTokenMap = new Map<string, string>()
    if (courierIds.length > 0) {
      const { data: couriers, error: courierError } = await supabase
        .from('couriers')
        .select('id, fcm_token')
        .in('id', courierIds)

      if (courierError) {
        throw new Error(`Kurye sorgusu: ${courierError.message}`)
      }

      courierTokenMap = new Map(
        ((couriers || []) as CourierRow[])
          .filter((c) => !!c.fcm_token)
          .map((c) => [c.id, c.fcm_token as string]),
      )
    }

    const results: Record<string, unknown> = {}
    for (const tier of TIERS) {
      results[tier.flagColumn] = await processTier(
        supabase,
        accessToken,
        fcmUrl,
        courierTokenMap,
        tier,
      )
    }

    const testCourierToken = courierTokenMap.get('8a18f119-b81b-4992-9583-70fd3cd7d757')

    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          testCourierPackages: candidatePackages || [],
          testCourierHasToken: !!testCourierToken,
          testCourierTokenPreview: testCourierToken
            ? `${testCourierToken.slice(0, 20)}...`
            : null,
          candidateCourierCount: courierIds.length,
          tokenMapSize: courierTokenMap.size,
        },
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
