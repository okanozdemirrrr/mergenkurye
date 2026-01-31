/**
 * @file src/utils/validation.ts
 * @description Veri doğrulama fonksiyonları
 * 🛡️ AŞAMA 5: Veri bütünlüğünü korur
 */

// 🛡️ Koordinat doğrulama
export const isValidCoordinate = (lat?: number | null, lng?: number | null): boolean => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false
  }

  // Latitude: -90 ile 90 arası
  // Longitude: -180 ile 180 arası
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

// 🛡️ Telefon numarası doğrulama (Türkiye)
export const isValidPhoneNumber = (phone?: string | null): boolean => {
  if (!phone) return false

  // Türkiye telefon formatları: 05XX XXX XX XX veya +90 5XX XXX XX XX
  const phoneRegex = /^(\+90|0)?5\d{9}$/
  const cleanPhone = phone.replace(/\s/g, '')

  return phoneRegex.test(cleanPhone)
}

// 🛡️ Tutar doğrulama
export const isValidAmount = (amount?: number | null): boolean => {
  if (amount === null || amount === undefined) return false

  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    amount >= 0 &&
    amount <= 999999 // Maksimum 999,999 TL
  )
}

// 🛡️ Sipariş numarası doğrulama
export const isValidOrderNumber = (orderNumber?: string | null): boolean => {
  if (!orderNumber) return true // Opsiyonel alan

  // En az 3, en fazla 50 karakter
  return orderNumber.length >= 3 && orderNumber.length <= 50
}

// 🛡️ Adres doğrulama
export const isValidAddress = (address?: string | null): boolean => {
  if (!address) return false

  // En az 10 karakter olmalı
  return address.trim().length >= 10
}

// 🛡️ İsim doğrulama
export const isValidName = (name?: string | null): boolean => {
  if (!name) return false

  // En az 2 karakter, sadece harf ve boşluk
  const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{2,50}$/
  return nameRegex.test(name.trim())
}

// 🛡️ Kurye ID doğrulama
export const isValidCourierId = (courierId?: string | null): boolean => {
  if (!courierId) return false

  // UUID formatı veya en az 10 karakter
  return courierId.length >= 10
}

// 🛡️ Restoran ID doğrulama
export const isValidRestaurantId = (restaurantId?: number | string | null): boolean => {
  if (restaurantId === null || restaurantId === undefined) return false

  if (typeof restaurantId === 'number') {
    return restaurantId > 0
  }

  if (typeof restaurantId === 'string') {
    const num = parseInt(restaurantId, 10)
    return !isNaN(num) && num > 0
  }

  return false
}

// 🛡️ Tarih doğrulama
export const isValidDate = (dateString?: string | null): boolean => {
  if (!dateString) return false

  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// 🛡️ Paket durumu doğrulama
export const isValidPackageStatus = (status?: string | null): boolean => {
  const validStatuses = ['waiting', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled', 'pending']
  return status ? validStatuses.includes(status) : false
}

// 🛡️ Ödeme yöntemi doğrulama
export const isValidPaymentMethod = (method?: string | null): boolean => {
  const validMethods = ['cash', 'card']
  return method ? validMethods.includes(method) : true // Opsiyonel
}

// 🛡️ Platform doğrulama
export const isValidPlatform = (platform?: string | null): boolean => {
  const validPlatforms = ['getir', 'yemeksepeti', 'trendyol', 'migros', 'other']
  return platform ? validPlatforms.includes(platform) : true // Opsiyonel
}

// 🛡️ Sipariş verisi doğrulama (tüm alanlar)
export interface OrderValidationResult {
  isValid: boolean
  errors: string[]
}

export const validateOrderData = (data: {
  customer_name?: string | null
  customer_phone?: string | null
  delivery_address?: string | null
  amount?: number | null
  restaurant_id?: number | string | null
  latitude?: number | null
  longitude?: number | null
}): OrderValidationResult => {
  const errors: string[] = []

  if (!isValidName(data.customer_name)) {
    errors.push('Müşteri adı geçersiz (en az 2 karakter)')
  }

  if (!isValidPhoneNumber(data.customer_phone)) {
    errors.push('Telefon numarası geçersiz (05XX XXX XX XX)')
  }

  if (!isValidAddress(data.delivery_address)) {
    errors.push('Teslimat adresi geçersiz (en az 10 karakter)')
  }

  if (!isValidAmount(data.amount)) {
    errors.push('Tutar geçersiz (0-999999 TL arası)')
  }

  if (!isValidRestaurantId(data.restaurant_id)) {
    errors.push('Restoran seçilmedi')
  }

  // Koordinatlar opsiyonel ama varsa geçerli olmalı
  if ((data.latitude || data.longitude) && !isValidCoordinate(data.latitude, data.longitude)) {
    errors.push('Koordinatlar geçersiz')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 🛡️ Kurye verisi doğrulama
export const validateCourierData = (data: {
  full_name?: string | null
  phone?: string | null
}): OrderValidationResult => {
  const errors: string[] = []

  if (!isValidName(data.full_name)) {
    errors.push('Kurye adı geçersiz (en az 2 karakter)')
  }

  if (!isValidPhoneNumber(data.phone)) {
    errors.push('Telefon numarası geçersiz (05XX XXX XX XX)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 🛡️ Restoran verisi doğrulama
export const validateRestaurantData = (data: {
  name?: string | null
  phone?: string | null
  address?: string | null
}): OrderValidationResult => {
  const errors: string[] = []

  if (!isValidName(data.name)) {
    errors.push('Restoran adı geçersiz (en az 2 karakter)')
  }

  if (!isValidPhoneNumber(data.phone)) {
    errors.push('Telefon numarası geçersiz (05XX XXX XX XX)')
  }

  if (!isValidAddress(data.address)) {
    errors.push('Adres geçersiz (en az 10 karakter)')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
