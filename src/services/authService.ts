import { supabase } from '@/app/lib/supabase'

export interface LoginCredentials {
  companyCode: string
  username: string
  password: string
  userType: 'admin' | 'courier' | 'restaurant'
}

export interface AuthUser {
  id: string
  companyId: string
  companyCode: string
  companyName: string
  username: string
  fullName: string
  email: string | null
  userType: 'admin' | 'courier' | 'restaurant'
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
  }
  logoUrl: string | null
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  error?: string
}

/**
 * Giriş sistemi (Kurye / Restoran / Admin ayrı)
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { username, password, userType } = credentials

    // Admin Girişi (Sabit)
    if (userType === 'admin') {
      if (username === 'admin' && password === 'admin123') {
        const authUser: AuthUser = {
          id: 'admin-123',
          companyId: '',
          companyCode: '',
          companyName: 'Alda Gel Admin',
          username: 'admin',
          fullName: 'Sistem Yöneticisi',
          email: null,
          userType: 'admin',
          theme: { primaryColor: '#f97316', secondaryColor: '#ea580c', accentColor: '#fb923c' },
          logoUrl: null
        }
        saveSession(authUser)
        return { success: true, user: authUser }
      }
      return { success: false, error: 'Admin kullanıcı adı veya şifre hatalı' }
    }

    // Kurye Girişi
    if (userType === 'courier') {
      const { data: user, error } = await supabase
        .from('couriers')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single()

      if (error || !user) {
        return { success: false, error: 'Kurye kullanıcı adı veya şifre hatalı' }
      }

      const authUser: AuthUser = {
        id: user.id,
        companyId: user.company_id || '',
        companyCode: '',
        companyName: 'Alda Gel Kurye',
        username: user.username,
        fullName: user.full_name || user.username,
        email: null,
        userType: 'courier',
        theme: { primaryColor: '#f97316', secondaryColor: '#ea580c', accentColor: '#fb923c' },
        logoUrl: null
      }
      saveSession(authUser)
      return { success: true, user: authUser }
    }

    // Restoran Girişi
    if (userType === 'restaurant') {
      // Restoran tablosunda 'username' yerine 'name' alanı kullanılıyor
      const { data: user, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('name', username)
        .eq('password', password)
        .eq('is_active', true)
        .single()

      if (error || !user) {
        return { success: false, error: 'Restoran adı veya şifre hatalı' }
      }

      const authUser: AuthUser = {
        id: user.id,
        companyId: user.company_id || '',
        companyCode: '',
        companyName: user.name,
        username: user.name,
        fullName: user.name,
        email: null,
        userType: 'restaurant',
        theme: { primaryColor: '#f97316', secondaryColor: '#ea580c', accentColor: '#fb923c' },
        logoUrl: user.logo_url
      }
      saveSession(authUser)
      return { success: true, user: authUser }
    }

    return {
      success: false,
      error: 'Geçersiz giriş tipi'
    }
  } catch (error: any) {
    console.error('Login error:', error)
    return {
      success: false,
      error: 'Giriş yapılırken bir hata oluştu'
    }
  }
}

/**
 * Session'ı localStorage'a kaydet
 */
export function saveSession(user: AuthUser) {
  if (typeof window === 'undefined') return

  localStorage.setItem('auth_user', JSON.stringify(user))
  localStorage.setItem('auth_logged_in', 'true')
  localStorage.setItem('auth_company_id', user.companyId)
  localStorage.setItem('auth_user_type', user.userType)

  // Eski sistem ile uyumluluk için
  if (user.userType === 'courier') {
    localStorage.setItem('kurye_logged_in', 'true')
    localStorage.setItem('kurye_logged_courier_id', user.id)
  } else if (user.userType === 'restaurant') {
    localStorage.setItem('restoran_logged_in', 'true')
    localStorage.setItem('restoran_logged_restaurant_id', user.id)
  } else if (user.userType === 'admin') {
    localStorage.setItem('admin_logged_in', 'true')
  }

  // Tema renklerini uygula
  applyTheme(user.theme)
}

/**
 * Session'dan kullanıcıyı al
 */
export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null

  try {
    const userJson = localStorage.getItem('auth_user')
    if (!userJson) return null

    const user = JSON.parse(userJson) as AuthUser
    
    // Tema renklerini uygula
    applyTheme(user.theme)
    
    return user
  } catch (error) {
    console.error('Session parse error:', error)
    return null
  }
}

/**
 * Çıkış yap
 */
export function logout() {
  if (typeof window === 'undefined') return

  // Tüm auth verilerini temizle
  localStorage.removeItem('auth_user')
  localStorage.removeItem('auth_logged_in')
  localStorage.removeItem('auth_company_id')
  localStorage.removeItem('auth_user_type')
  
  // Eski sistem verileri
  localStorage.removeItem('kurye_logged_in')
  localStorage.removeItem('kurye_logged_courier_id')
  localStorage.removeItem('restoran_logged_in')
  localStorage.removeItem('restoran_logged_restaurant_id')
  localStorage.removeItem('admin_logged_in')

  // Tema renklerini sıfırla
  resetTheme()

  // Login sayfasına yönlendir
  window.location.href = '/login'
}

/**
 * Tema renklerini CSS değişkenlerine uygula
 */
export function applyTheme(theme: { primaryColor: string; secondaryColor: string; accentColor: string }) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primaryColor)
  root.style.setProperty('--color-secondary', theme.secondaryColor)
  root.style.setProperty('--color-accent', theme.accentColor)
}

/**
 * Tema renklerini varsayılana döndür
 */
export function resetTheme() {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--color-primary', '#f97316')
  root.style.setProperty('--color-secondary', '#ea580c')
  root.style.setProperty('--color-accent', '#fb923c')
}

/**
 * Kullanıcının giriş yapıp yapmadığını kontrol et
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('auth_logged_in') === 'true'
}

/**
 * Kullanıcının rolünü kontrol et
 */
export function hasRole(requiredRole: 'admin' | 'courier' | 'restaurant'): boolean {
  const user = getSession()
  return user?.userType === requiredRole
}
