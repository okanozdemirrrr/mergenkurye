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
 * Çok şirketli giriş sistemi
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { companyCode, username, password, userType } = credentials

    // 1. Şirket kodunu kontrol et
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('company_code', companyCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (companyError || !company) {
      return {
        success: false,
        error: 'Geçersiz şirket kodu'
      }
    }

    // 2. Kullanıcıyı kontrol et
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', company.id)
      .eq('username', username)
      .eq('user_type', userType)
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      return {
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı'
      }
    }

    // 3. Şifre kontrolü (Basit - Gerçek uygulamada bcrypt kullanılmalı)
    if (user.password !== password) {
      return {
        success: false,
        error: 'Kullanıcı adı veya şifre hatalı'
      }
    }

    // 4. Auth user objesi oluştur
    const authUser: AuthUser = {
      id: user.id,
      companyId: company.id,
      companyCode: company.company_code,
      companyName: company.company_name,
      username: user.username,
      fullName: user.full_name || user.username,
      email: user.email,
      userType: user.user_type,
      theme: {
        primaryColor: company.theme_primary_color || '#f97316',
        secondaryColor: company.theme_secondary_color || '#ea580c',
        accentColor: company.theme_accent_color || '#fb923c'
      },
      logoUrl: company.logo_url
    }

    // 5. Session'a kaydet
    saveSession(authUser)

    return {
      success: true,
      user: authUser
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
