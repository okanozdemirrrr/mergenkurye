/**
 * @file src/app/kurye/utils/locationFilters.ts
 * @description GPS Konum Filtreleme Fonksiyonları
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

// SAMSUN OPERASYON BÖLGESI TANIMLARI - ORİJİNAL MANTIK
export const OPERATION_BOUNDS = {
  minLat: 41.20,  // Samsun güney sınırı
  maxLat: 41.60,  // Samsun kuzey sınırı
  minLng: 35.90,  // Samsun batı sınırı
  maxLng: 36.40   // Samsun doğu sınırı
}

export const OPERATION_CENTER = {
  lat: 41.494714153011856,
  lng: 36.07827997146362
}

// Geliştirme ortamı kontrolü - ORİJİNAL MANTIK
export const isDevelopment = process.env.NODE_ENV === 'development'

// İki konum arasındaki mesafeyi hesapla (Haversine formülü - metre cinsinden) - ORİJİNAL MANTIK
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3 // Dünya yarıçapı (metre)
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Metre cinsinden mesafe
}

// FİLTRE 1: NULL/ZERO KONTROLÜ - ORİJİNAL MANTIK
export const filterNullZero = (latitude: number, longitude: number): boolean => {
  if (!latitude || !longitude || latitude === 0 || longitude === 0) {
    console.error('❌ FİLTRE 1 REDDEDİLDİ: Geçersiz koordinatlar (0,0 veya null)')
    console.error('❌ Son geçerli konum korunuyor')
    return false
  }
  return true
}

// FİLTRE 2: DOĞRULUK BARAJI (Accuracy Threshold) - ORİJİNAL MANTIK
export const filterAccuracy = (accuracy: number | null | undefined): boolean => {
  // Baz istasyonu verilerini engelle (1000m+ accuracy)
  if (!accuracy || accuracy > 1000) {
    console.error('❌ FİLTRE 2 REDDEDİLDİ: Baz istasyonu verisi tespit edildi!')
    console.error(`❌ Accuracy: ${accuracy ? accuracy.toFixed(0) : 'N/A'}m - Maksimum: 1000m`)
    console.error('❌ Bu muhtemelen mobil operatör verisi, GPS değil')
    return false
  }

  // Yüksek hassasiyet kontrolü (100m threshold)
  if (accuracy > 100) {
    console.error('❌ FİLTRE 2 REDDEDİLDİ: Konum doğruluğu çok düşük')
    console.error(`❌ Accuracy: ${accuracy.toFixed(0)}m - Minimum gereksinim: 100m`)
    console.error('❌ Sadece yüksek hassasiyetli GPS verisi kabul edilir')
    return false
  }

  console.log(`✅ FİLTRE 2 GEÇTİ: Doğruluk kabul edilebilir (${accuracy.toFixed(0)}m)`)
  return true
}

// FİLTRE 3: COĞRAFİ ÇİT (Samsun Geofencing) - ORİJİNAL MANTIK
export const filterGeofence = (latitude: number, longitude: number): boolean => {
  // Production'da Samsun dışı konumları DOĞRUDAN ÇÖPE AT
  if (!isDevelopment) {
    const isInSamsun = 
      latitude >= OPERATION_BOUNDS.minLat && 
      latitude <= OPERATION_BOUNDS.maxLat && 
      longitude >= OPERATION_BOUNDS.minLng && 
      longitude <= OPERATION_BOUNDS.maxLng

    if (!isInSamsun) {
      console.error('🚫 FİLTRE 3 REDDEDİLDİ: COĞRAFİ ÇİT DIŞI!')
      console.error(`🚫 Konum: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
      console.error(`🚫 Beklenen: Samsun (${OPERATION_BOUNDS.minLat}-${OPERATION_BOUNDS.maxLat} Lat, ${OPERATION_BOUNDS.minLng}-${OPERATION_BOUNDS.maxLng} Lng)`)
      console.error('🚫 Bu konum Ankara/İstanbul gibi alakasız bir şehir olabilir')
      console.error('🚫 VERİ ÇÖPE ATILDI - Veritabanına yazılmayacak')
      return false
    }

    console.log('✅ FİLTRE 3 GEÇTİ: Konum Samsun sınırları içinde')
  } else {
    console.log('ℹ️ Geliştirme ortamı - Coğrafi çit devre dışı')
  }
  
  return true
}

// FİLTRE 4: HIZ VE MESAFE FİLTRESİ (Velocity Check) - ORİJİNAL MANTIK
export const filterVelocity = (
  lastValidLocation: { latitude: number, longitude: number, timestamp: number } | null,
  latitude: number,
  longitude: number,
  timestamp: number
): boolean => {
  if (lastValidLocation) {
    const lastLoc = lastValidLocation
    const distance = calculateDistance(lastLoc.latitude, lastLoc.longitude, latitude, longitude)
    const timeDiff = (timestamp - lastLoc.timestamp) / 1000 // saniye
    
    // Sıfır bölme hatası kontrolü
    if (timeDiff <= 0) {
      console.error('❌ FİLTRE 4 REDDEDİLDİ: Zaman farkı sıfır veya negatif')
      return false
    }

    const calculatedSpeed = distance / timeDiff // m/s
    const speedKmh = calculatedSpeed * 3.6 // km/h

    // İmkansız hız kontrolü (Işınlanma engelleme)
    const MAX_SPEED_KMH = 120 // Motor için makul maksimum hız
    
    if (speedKmh > MAX_SPEED_KMH) {
      console.error('⚡ FİLTRE 4 REDDEDİLDİ: IŞINLANMA TESPİT EDİLDİ!')
      console.error(`⚡ Mesafe: ${distance.toFixed(0)}m (${(distance/1000).toFixed(1)} km)`)
      console.error(`⚡ Süre: ${timeDiff.toFixed(1)} saniye`)
      console.error(`⚡ Hesaplanan Hız: ${speedKmh.toFixed(0)} km/h`)
      console.error(`⚡ Maksimum İzin Verilen: ${MAX_SPEED_KMH} km/h`)
      console.error('⚡ Bu muhtemelen mobil operatör hatası veya mock location')
      console.error('⚡ VERİ BLOKLAND - Kurye son bilinen konumda kalacak')
      return false
    }

    // Şüpheli hız uyarısı (80+ km/h)
    if (speedKmh > 80) {
      console.warn(`⚠️ Yüksek hız tespit edildi: ${speedKmh.toFixed(0)} km/h`)
      console.warn('⚠️ Kurye muhtemelen araçla hareket ediyor')
    }

    console.log(`✅ FİLTRE 4 GEÇTİ: Hız makul (${speedKmh.toFixed(1)} km/h, ${distance.toFixed(0)}m / ${timeDiff.toFixed(1)}s)`)
  } else {
    console.log('ℹ️ FİLTRE 4 ATLANDI: İlk konum güncellemesi (karşılaştırma yok)')
  }
  
  return true
}

// Tüm filtreleri uygula - ORİJİNAL MANTIK
export const applyAllFilters = (
  latitude: number,
  longitude: number,
  accuracy: number | null | undefined,
  timestamp: number,
  lastValidLocation: { latitude: number, longitude: number, timestamp: number } | null
): boolean => {
  // FİLTRE 1: NULL/ZERO
  if (!filterNullZero(latitude, longitude)) return false

  // FİLTRE 2: DOĞRULUK BARAJI
  if (!filterAccuracy(accuracy)) return false

  // FİLTRE 3: COĞRAFİ ÇİT
  if (!filterGeofence(latitude, longitude)) return false

  // FİLTRE 4: HIZ VE MESAFE
  if (!filterVelocity(lastValidLocation, latitude, longitude, timestamp)) return false

  console.log('🎉 TÜM FİLTRELER GEÇTİ - Konum güvenilir ve geçerli')
  return true
}
