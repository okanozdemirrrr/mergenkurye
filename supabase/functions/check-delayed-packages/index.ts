import { JWT } from 'npm:google-auth-library'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type PackageRow = {
  id: number | string
  courier_id: string | null
  assigned_at: string | null
}

type CourierRow = {
  id: string
  fcm_token: string | null
}

const DELAY_MINUTES = 15

function getEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

function getFirebaseAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson)
  const jwtClient = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })

  return jwtClient.authorize().then((tokens) => {
    if (!tokens.access_token) throw new Error('Firebase access token alınamadı')
    return tokens.access_token
  })
}

Deno.serve(async () => {
  try {
    const supabaseUrl = getEnv('SUPABASE_URL')
    const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    const firebaseProjectId = getEnv('FIREBASE_PROJECT_ID')
    const firebaseServiceAccountKey = getEnv('FIREBASE_SERVICE_ACCOUNT_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const thresholdIso = new Date(Date.now() - DELAY_MINUTES * 60 * 1000).toISOString()

    const { data: delayedPackages, error: delayedError } = await supabase
      .from('packages')
      .select('id, courier_id, assigned_at')
      .eq('status', 'assigned')
      .eq('is_delay_warning_sent', false)
      .not('courier_id', 'is', null)
      .lte('assigned_at', thresholdIso)

    if (delayedError) {
      throw new Error(`Paket sorgusu hatası: ${delayedError.message}`)
    }

    if (!delayedPackages || delayedPackages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Geciken paket yok.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const packageRows = delayedPackages as PackageRow[]
    const courierIds = [...new Set(packageRows.map((p) => p.courier_id).filter(Boolean))] as string[]

    const { data: couriers, error: courierError } = await supabase
      .from('couriers')
      .select('id, fcm_token')
      .in('id', courierIds)

    if (courierError) {
      throw new Error(`Kurye sorgusu hatası: ${courierError.message}`)
    }

    const courierTokenMap = new Map<string, string>(
      ((couriers || []) as CourierRow[])
        .filter((c) => !!c.fcm_token)
        .map((c) => [c.id, c.fcm_token as string]),
    )

    const accessToken = await getFirebaseAccessToken(firebaseServiceAccountKey)
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`

    const successfulPackageIds: Array<number | string> = []
    const failed: Array<{ packageId: number | string; reason: string }> = []

    for (const pkg of packageRows) {
      if (!pkg.courier_id) continue
      const token = courierTokenMap.get(pkg.courier_id)

      if (!token) {
        failed.push({ packageId: pkg.id, reason: 'Kurye FCM token yok' })
        continue
      }

      const title = '⚠️ Geciken Teslimat'
      const body =
        'Üzerinize atanan paketi 15 dakikadır teslim almadınız. Lütfen acilen restorana yönelin.'

      // iOS: aps içinde alert YOKSA + sadece content-available varsa bildirim SESSİZ gider (banner çıkmaz).
      const messagePayload = {
        message: {
          token,
          notification: {
            title,
            body,
          },
          data: {
            package_id: String(pkg.id),
            type: 'delay_warning',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'mergen_high_priority',
              sound: 'default',
              defaultSound: true,
              defaultVibrateTimings: true,
              priority: 'max',
              visibility: 'public',
              tag: `delay_${pkg.id}`,
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
                  title,
                  body,
                },
                sound: 'default',
                badge: 1,
                'content-available': 1,
              },
            },
          },
        },
      }

      const sendRes = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
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
        .update({ is_delay_warning_sent: true })
        .in('id', successfulPackageIds)

      if (updateError) {
        throw new Error(`is_delay_warning_sent update hatası: ${updateError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: packageRows.length,
        processed: successfulPackageIds.length,
        failed,
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
