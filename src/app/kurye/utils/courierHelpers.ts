/**
 * @file src/app/kurye/utils/courierHelpers.ts
 * @description Kurye Yardımcı Fonksiyonları
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

interface Package {
  id: number
  latitude?: number | null
  longitude?: number | null
  delivery_address: string
}

// AKILLI NAVİGASYON - Koordinat veya Adres Bazlı - ORİJİNAL MANTIK
export const handleOpenNavigation = (pkg: Package) => {
  console.log('🗺️ Navigasyon açılıyor:', {
    latitude: pkg.latitude,
    longitude: pkg.longitude,
    address: pkg.delivery_address
  })

  // Koordinat varsa hassas navigasyon kullan
  if (pkg.latitude && pkg.longitude) {
    const lat = pkg.latitude
    const lng = pkg.longitude

    // Cihaz tespiti
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
    const isAndroid = /android/i.test(userAgent)

    console.log('📱 Cihaz:', { isIOS, isAndroid })

    if (isIOS) {
      // iOS - Apple Maps
      const appleMapsUrl = `maps://maps.apple.com/?q=${lat},${lng}&dirflg=d`
      console.log('🍎 Apple Maps URL:', appleMapsUrl)
      window.location.href = appleMapsUrl

      // Fallback: Apple Maps açılmazsa Google Maps'e yönlendir
      setTimeout(() => {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        window.open(googleMapsUrl, '_blank')
      }, 1500)
    } else {
      // Android / Web - Google Maps
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      console.log('🤖 Google Maps URL:', googleMapsUrl)
      window.open(googleMapsUrl, '_blank')
    }

    console.log('✅ Koordinat bazlı navigasyon başlatıldı')
  } else {
    // Koordinat yoksa adres bazlı navigasyon
    console.warn('⚠️ Koordinat bulunamadı, adres bazlı navigasyon kullanılıyor')
    const address = encodeURIComponent(pkg.delivery_address)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`
    console.log('🗺️ Adres bazlı Maps URL:', mapsUrl)
    window.open(mapsUrl, '_blank')
  }
}

// Calculate Duration - ORİJİNAL MANTIK
export const calculateDuration = (start?: string, end?: string) => {
  if (!start || !end) return "-"
  const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  return `${diff} dk`
}
