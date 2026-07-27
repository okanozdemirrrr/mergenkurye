/**
 * FCM push payload — Android + iOS (APNs) ortak yapı.
 * iOS'ta `apns` bloğu yoksa bildirim sessizce düşmeyebilir.
 */

export type FcmDataMap = Record<string, string>

export interface BuildFcmMessageParams {
  token: string
  title: string
  body: string
  data?: FcmDataMap
  /** Android notification tag (üst üste yazmayı engeller) */
  androidTag?: string
}

export function buildFcmMessage({
  token,
  title,
  body,
  data = {},
  androidTag,
}: BuildFcmMessageParams) {
  return {
    token,
    notification: {
      title,
      body,
    },
    data,
    android: {
      priority: 'high' as const,
      notification: {
        channelId: 'mergen_high_priority',
        sound: 'default',
        defaultSound: true,
        defaultVibrateTimings: true,
        priority: 'max' as const,
        visibility: 'public' as const,
        ...(androidTag ? { tag: androidTag } : {}),
      },
    },
    // iOS / App Store — APNs üzerinden ses + alert
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
  }
}

/**
 * Capacitor PushNotifications iOS'ta varsayılan olarak APNs device token döner (64 hex).
 * FCM Admin SDK ise FCM registration token ister (`:APA91b...` benzeri).
 * AppDelegate Firebase Messaging ile dönüştürülmezse iOS push çalışmaz.
 */
export function looksLikeApnsDeviceToken(token: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(token.trim())
}
