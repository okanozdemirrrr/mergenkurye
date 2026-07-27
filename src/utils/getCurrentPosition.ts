/**
 * @file src/utils/getCurrentPosition.ts
 * @description Hibrit konum alma — Capacitor (native) varsa GPS plugin, yoksa Web Geolocation API
 */

export interface SimpleCoords {
  latitude: number
  longitude: number
  accuracy: number | null
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('GPS konumu zaman aşımına uğradı.')),
      timeoutMs
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function validateCoordinates(coords: SimpleCoords): SimpleCoords {
  const { latitude, longitude } = coords
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Cihaz geçerli bir GPS koordinatı üretemedi. Lütfen tekrar deneyin.')
  }
  return coords
}

function getNativeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.toLocaleLowerCase('tr-TR')

  if (message.includes('timeout') || message.includes('zaman aşımı')) {
    return 'GPS konumu 20 saniye içinde alınamadı. Açık alanda tekrar deneyin.'
  }
  if (message.includes('permission') || message.includes('izin') || message.includes('denied')) {
    return 'Konum izni reddedildi. Telefon ayarlarından bu uygulama için konum izni verin.'
  }
  if (
    message.includes('location services') ||
    message.includes('unavailable') ||
    message.includes('disabled') ||
    message.includes('kapalı')
  ) {
    return 'GPS kapalı. Telefonunuzun konum servisini açıp tekrar deneyin.'
  }

  return 'Konum alınamadı. GPS ve konum izinlerini kontrol edip tekrar deneyin.'
}

async function getNativePosition(): Promise<SimpleCoords> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation')

    const permission = await Geolocation.checkPermissions()
    if (permission.location !== 'granted') {
      const requested = await Geolocation.requestPermissions()
      if (requested.location !== 'granted') {
        throw new Error(
          'Konum izni reddedildi. Telefon ayarlarından bu uygulama için konum izni verin.'
        )
      }
    }

    // Capacitor Android sürümlerinde plugin timeout'u yok sayılabildiği için,
    // 20 saniyelik uygulama seviyesi sınırı da uygulanır.
    const position = await withTimeout(
      Geolocation.getCurrentPosition(GEO_OPTIONS),
      GEO_OPTIONS.timeout ?? 20000
    )
    return validateCoordinates({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    })
  } catch (error) {
    throw new Error(getNativeErrorMessage(error))
  }
}

function getWebPosition(): Promise<SimpleCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Bu cihazda konum servisi desteklenmiyor.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          resolve(validateCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
          }))
        } catch (error) {
          reject(error)
        }
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Konum izni reddedildi. Tarayıcı ayarlarından izin verin.'
            : err.code === err.TIMEOUT
            ? 'Konum alınamadı (zaman aşımı). Açık alanda tekrar deneyin.'
            : 'Konum alınamadı. GPS açık mı kontrol edin.'
        reject(new Error(message))
      },
      GEO_OPTIONS
    )
  })
}

/**
 * Native ise Capacitor Geolocation, değilse Web Geolocation API kullanır.
 * Native izin/GPS hataları doğrudan kullanıcıya iletilir.
 */
export async function getCurrentPosition(): Promise<SimpleCoords> {
  if (typeof window === 'undefined') {
    throw new Error('Konum yalnızca cihaz üzerinde alınabilir.')
  }

  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    // Native izin/GPS hatasını web fallback ile maskeleme; kuryeye doğrudan bildir.
    return getNativePosition()
  }

  return getWebPosition()
}
