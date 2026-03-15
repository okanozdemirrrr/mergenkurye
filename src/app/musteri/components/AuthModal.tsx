'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface AuthModalProps {
  onClose: () => void
  onLoginSuccess: (name: string) => void
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [address, setAddress] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const validatePhone = (phoneNum: string): boolean => {
    if (!/^\d+$/.test(phoneNum)) {
      setPhoneError('Sadece rakam girebilirsiniz')
      return false
    }
    if (phoneNum.startsWith('0')) {
      setPhoneError('Numarayı başında 0 olmadan yazın')
      return false
    }
    if (phoneNum.length !== 10) {
      setPhoneError('Telefon numarası 10 hane olmalıdır')
      return false
    }
    if (!phoneNum.startsWith('5')) {
      setPhoneError('Cep telefonu 5 ile başlamalıdır')
      return false
    }
    setPhoneError('')
    return true
  }

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    setPhone(cleaned)
    if (cleaned.length > 0) {
      validatePhone(cleaned)
    } else {
      setPhoneError('')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Supabase Auth ile giriş
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      })

      if (authError) throw authError

      // Customers tablosundan bilgileri çek
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', loginEmail.trim())
        .single()

      if (customerError) throw customerError

      // LocalStorage'a kaydet
      localStorage.setItem('customer_id', customerData.id)
      localStorage.setItem('customer_name', customerData.full_name)
      if (customerData.address) {
        localStorage.setItem('customer_address', customerData.address)
      }

      onLoginSuccess(customerData.full_name)
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Telefon validasyonu
      if (!validatePhone(phone)) {
        setLoading(false)
        return
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`

      // 1. Supabase Auth'a kayıt
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerEmail.trim(),
        password: registerPassword,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (authError) throw authError

      // 2. Customers tablosuna kayıt
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{
          name: firstName.trim(),
          surname: lastName.trim(),
          full_name: fullName,
          email: registerEmail.trim(),
          phone: phone,
          address: address.trim()
        }])
        .select()
        .single()

      if (customerError) {
        // Telefon numarası zaten kayıtlı hatası
        if (customerError.code === '23505' && customerError.message.includes('phone')) {
          throw new Error('Bu telefon numarası zaten kayıtlı')
        }
        throw customerError
      }

      // LocalStorage'a kaydet
      localStorage.setItem('customer_id', customerData.id)
      localStorage.setItem('customer_name', fullName)
      localStorage.setItem('customer_phone', phone)
      if (address.trim()) {
        localStorage.setItem('customer_address', address.trim())
      }

      onLoginSuccess(fullName)
    } catch (err: any) {
      setError(err.message || 'Kayıt oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e8]">
          <h2 className="text-[20px] font-bold text-[#3c4043]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </h2>
          <button
            onClick={onClose}
            className="text-[#6f6f6f] hover:text-[#3c4043] text-[24px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  placeholder="ornek@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  placeholder="Şifreniz"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-[#f59e0b] text-[12px]">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] bg-[#f59e0b] text-white rounded-lg font-semibold text-[14px] hover:bg-[#d97706] transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>

              <p className="text-[13px] text-center text-[#6f6f6f]">
                Henüz Alda Gel'e kayıtlı değil misin?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError('')
                  }}
                  className="text-[#f59e0b] font-semibold hover:underline"
                >
                  Kayıt Ol
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  İsim
                </label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Mehmet"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
                <p className="text-[11px] text-[#6f6f6f] mt-1">İki isim girebilirsiniz</p>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Soyisim
                </label>
                <input
                  type="text"
                  placeholder="Örn: Yılmaz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Telefon Numarası <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-[#6f6f6f] mb-2">(başında 0 olmadan 10 hane)</p>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="5551234567"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full h-[48px] px-4 bg-white border rounded-lg text-[14px] focus:outline-none transition-colors ${
                    phoneError 
                      ? 'border-red-500' 
                      : phone.length === 10 && phone.startsWith('5') && !phone.startsWith('0')
                      ? 'border-green-500'
                      : 'border-[#e8e8e8] focus:border-[#f59e0b]'
                  }`}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
                {phoneError && (
                  <p className="text-[11px] text-red-500 mt-1">⚠️ {phoneError}</p>
                )}
                {phone.length === 10 && !phoneError && (
                  <p className="text-[11px] text-green-600 mt-1">✓ Telefon numarası geçerli</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Açık Adres
                </label>
                <textarea
                  placeholder="Örn: 19 Mayıs KYK Yurdu, A Blok, Kat 3, No 12"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-[96px] px-4 py-3 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors resize-none"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e8e8e8]"></div>
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-white px-4 text-[#6f6f6f]">
                    Bu bilgileri giriş yaparken kullanacaksınız
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  placeholder="ornek@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#3c4043] mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  placeholder="En az 6 karakter"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full h-[48px] px-4 bg-white border border-[#e8e8e8] rounded-lg text-[14px] focus:outline-none focus:border-[#f59e0b] transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-[#f59e0b] text-[12px]">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] bg-[#f59e0b] text-white rounded-lg font-semibold text-[14px] hover:bg-[#d97706] transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
              </button>

              <p className="text-[13px] text-center text-[#6f6f6f]">
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                  className="text-[#f59e0b] font-semibold hover:underline"
                >
                  Giriş Yap
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
