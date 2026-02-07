// Başvuru Tipleri

export type ApplicationType = 'kurye' | 'restoran'
export type ApplicationStatus = 'beklemede' | 'onaylandı' | 'reddedildi'

// Kurye Başvuru Formu
export interface CourierApplicationData {
  firstName: string
  lastName: string
  email: string
  age: string
  location: string
  phone: string
  experience: 'Tecrübesizim' | '0-2 Ay' | '2-6 Ay' | '6-12 Ay' | '1-4 Yıl' | '4-6 Yıl' | '+6 Yıl'
  username: string
  password: string
}

// Restoran Başvuru Formu
export interface RestaurantApplicationData {
  firstName: string
  lastName: string
  email: string
  age: string
  location: string
  businessName?: string // Artık kullanılmıyor, username restoran adı olarak kullanılıyor
  businessAddress: string
  phone: string
  username: string
  password: string
  latitude: string
  longitude: string
}

// Genel Başvuru
export interface Application {
  id: string
  type: ApplicationType
  status: ApplicationStatus
  full_data: CourierApplicationData | RestaurantApplicationData
  created_at: string
  updated_at: string
  approved_at?: string | null
  rejected_at?: string | null
  approved_by?: string | null
  rejection_reason?: string | null
}

// API Response
export interface ApplicationResponse {
  success: boolean
  message?: string
  error?: string
  application_id?: string
}

export interface ApprovalResponse {
  success: boolean
  message?: string
  error?: string
  user_id?: string
  courier_id?: string
  restaurant_id?: string
}
