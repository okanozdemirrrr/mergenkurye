/**
 * Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplar
 * @param lat1 - Birinci nokta latitude
 * @param lon1 - Birinci nokta longitude
 * @param lat2 - İkinci nokta latitude
 * @param lon2 - İkinci nokta longitude
 * @returns Metre cinsinden mesafe
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Dünya yarıçapı metre cinsinden
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Metre cinsinden mesafe
}

/**
 * Mesafeyi okunabilir formata çevirir
 * @param meters - Metre cinsinden mesafe
 * @returns Formatlanmış mesafe string'i (örn: "2.5 km" veya "850 m")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}
