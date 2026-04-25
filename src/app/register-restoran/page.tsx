/**
 * @file src/app/register-restoran/page.tsx
 * @description Restoran Başvuru Sayfası
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createApplication } from '@/services/applicationService'
import type { RestaurantApplicationData } from '@/types/application'

export default function RegisterRestoranPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [form, setForm] = useState<RestaurantApplicationData>({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    location: '',
    businessAddress: '',
    phone: '',
    username: '',
    password: '',
    latitude: '',
    longitude: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      // Validasyon
      if (!form.firstName.trim() || !form.lastName.trim()) {
        throw new Error('İsim ve soyisim gereklidir')
      }
      if (!form.email.trim() || !form.email.includes('@')) {
        throw new Error('Geçerli bir e-posta adresi giriniz')
      }
      if (!form.username.trim() || form.username.length < 3) {
        throw new Error('Kullanıcı adı (Restoran adı) en az 3 karakter olmalıdır')
      }
      if (!form.businessAddress.trim()) {
        throw new Error('İşletme adresi gereklidir')
      }
      if (!form.phone.trim() || form.phone.length < 10) {
        throw new Error('Geçerli bir telefon numarası giriniz')
      }
      if (!form.latitude.trim() || !form.longitude.trim()) {
        throw new Error('Restoran koordinatları gereklidir')
      }
      const lat = parseFloat(form.latitude)
      const lng = parseFloat(form.longitude)
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Geçerli koordinatlar giriniz (Enlem: -90 ile 90, Boylam: -180 ile 180)')
      }
      if (!form.password.trim() || form.password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır')
      }

      const result = await createApplication('restoran', form)

      if (result.success) {
        setSuccessMessage(result.message || 'Başvurunuz alındı!')
        setTimeout(() => {
          router.push('/restoran')
        }, 3000)
      } else {
        throw new Error(result.error || 'Başvuru gönderilemedi')
      }
    } catch (error: any) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 py-8">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 w-full max-w-2xl my-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🍽️</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Restoran Başvurusu</h1>
          <p className="text-slate-400 text-sm">Formu doldurun, admin onayı bekleyin</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-400 text-center font-medium text-sm">{successMessage}</p>
            <p className="text-green-300 text-xs text-center mt-1">Giriş sayfasına yönlendiriliyorsunuz...</p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-center text-sm">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="firstName"
              placeholder="İsim *"
              value={form.firstName}
              onChange={handleChange}
              required
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
            <input
              type="text"
              name="lastName"
              placeholder="Soyisim *"
              value={form.lastName}
              onChange={handleChange}
              required
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="E-posta *"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="age"
              placeholder="Yaş *"
              value={form.age}
              onChange={handleChange}
              required
              min="18"
              max="99"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
            <input
              type="text"
              name="location"
              placeholder="İkamet (Şehir) *"
              value={form.location}
              onChange={handleChange}
              required
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <input
            type="text"
            name="businessAddress"
            placeholder="İşletme Adresi *"
            value={form.businessAddress}
            onChange={handleChange}
            required
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
          />

          <input
            type="tel"
            name="phone"
            placeholder="İletişim Telefonu *"
            value={form.phone}
            onChange={handleChange}
            required
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="latitude"
              placeholder="Enlem (Latitude) *"
              value={form.latitude}
              onChange={handleChange}
              required
              step="any"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
            <input
              type="number"
              name="longitude"
              placeholder="Boylam (Longitude) *"
              value={form.longitude}
              onChange={handleChange}
              required
              step="any"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <p className="text-slate-500 text-xs -mt-2">
            💡 Google Maps'ten restoranınızın koordinatlarını alabilirsiniz
          </p>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <p className="text-slate-400 text-sm mb-4 font-medium">Sisteme Giriş Yapmak İstediğiniz Bilgileri Giriniz</p>
            <input
              type="text"
              name="username"
              placeholder="Kullanıcı Adı (Restoran Adı) *"
              value={form.username}
              onChange={handleChange}
              required
              minLength={3}
              autoComplete="new-username"
              className="w-full p-3 mb-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
            <p className="text-slate-500 text-xs -mt-2 mb-4">
              ℹ️ Bu isim hem giriş için hem de restoran adı olarak kullanılacaktır
            </p>
            <input
              type="password"
              name="password"
              placeholder="Şifre (min 6 karakter) *"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Başvuru Gönder'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-center text-orange-400 hover:text-orange-300 text-sm transition-colors"
          >
            ← Giriş sayfasına dön
          </button>
        </form>
      </div>
    </div>
  )
}
