/**
 * @file src/app/kurye/hooks/useCourierAuth.ts
 * @description Kurye Kimlik Doğrulama Hook'u
 * 
 * ÖNEMLİ: Bu dosyadaki tüm mantık kurye/page.tsx'ten birebir taşınmıştır.
 * HİÇBİR MANTIK DEĞİŞİKLİĞİ YAPILMAMIŞTIR.
 */

import { useState, useEffect } from 'react'
import { authenticateCourier, getCourierAccountStatusError } from '@/services/courierLoginService'

const LOGIN_STORAGE_KEY = 'kurye_logged_in'
const LOGIN_COURIER_ID_KEY = 'kurye_logged_courier_id'

interface LoginForm {
  username: string
  password: string
}

export function useCourierAuth() {
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState<LoginForm>({ username: '', password: '' })
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null)
  const [courierName, setCourierName] = useState<string>('Kurye')
  const [errorMessage, setErrorMessage] = useState('')

  // Build-safe mount kontrolü - ORİJİNAL MANTIK
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ÇELİK GİBİ OTURUM KONTROLÜ - SAYFA YENİLENDİĞİNDE DIŞARI ATMA! - ORİJİNAL MANTIK
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMounted) return

    setIsCheckingAuth(true)

    try {
      const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedCourierId = localStorage.getItem(LOGIN_COURIER_ID_KEY)

      // Kurye oturumu varsa BURADA KAL!
      if (loggedIn === 'true' && loggedCourierId) {
        setIsLoggedIn(true)
        setSelectedCourierId(loggedCourierId)
      } else {
        setIsLoggedIn(false)
      }
    } catch (error) {
      console.error('Oturum kontrolü hatası:', error)
      setIsLoggedIn(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }, [isMounted])

  // Login Handler - ORİJİNAL MANTIK
  const handleLogin = async (e: any) => {
    e.preventDefault()
    if (typeof window === 'undefined') return

    try {
      const loginResult = await authenticateCourier(loginForm.username, loginForm.password)

      if (!loginResult.ok) {
        if (loginResult.reason === 'db_error') {
          console.error('Veritabanı hatası:', loginResult.message)
          setErrorMessage("Veritabanı hatası!")
          return
        }
        setErrorMessage("Hatalı kullanıcı adı veya şifre!")
        return
      }

      const data = loginResult.courier
      const accountError = getCourierAccountStatusError(data.account_status)
      if (accountError) {
        setErrorMessage(accountError)
        return
      }

      // Kurye oturumunu başlat (eski sistem)
      localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
      localStorage.setItem(LOGIN_COURIER_ID_KEY, data.id)

      // Yeni auth sistemi için de kaydet (otomatik giriş için)
      localStorage.setItem('auth_logged_in', 'true')
      localStorage.setItem('auth_user_type', 'courier')
      localStorage.setItem('auth_user', JSON.stringify({
        id: data.id,
        username: data.username,
        fullName: data.full_name,
        userType: 'courier'
      }))

      setIsLoggedIn(true)
      setSelectedCourierId(data.id)
      setCourierName(data.full_name || 'Kurye')
    } catch (error: any) {
      console.error('Giriş hatası:', error)
      setErrorMessage("Giriş hatası: " + error.message)
    }
  }

  // Logout Handler - ORİJİNAL MANTIK
  const handleLogout = () => {
    // Eski sistem
    localStorage.removeItem(LOGIN_STORAGE_KEY)
    localStorage.removeItem(LOGIN_COURIER_ID_KEY)
    // Yeni auth sistemi
    localStorage.removeItem('auth_logged_in')
    localStorage.removeItem('auth_user_type')
    localStorage.removeItem('auth_user')
    // Ana sayfaya yönlendir
    window.location.href = '/'
  }

  return {
    // State
    isMounted,
    isCheckingAuth,
    isLoggedIn,
    loginForm,
    setLoginForm,
    selectedCourierId,
    courierName,
    setCourierName,
    errorMessage,
    setErrorMessage,
    
    // Functions
    handleLogin,
    handleLogout
  }
}
