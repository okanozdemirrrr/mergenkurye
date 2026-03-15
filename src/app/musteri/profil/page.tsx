'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface CustomerProfile {
  id: string
  name: string
  surname: string
  email: string
  phone: string
}

export default function ProfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    surname: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // 1. Auth kontrolü
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Auth error:', authError)
        localStorage.clear()
        router.push('/musteri')
        return
      }

      console.log('✅ Auth OK - User ID:', user.id)

      // 2. LocalStorage'dan customer_id al
      const customerId = localStorage.getItem('customer_id')
      
      if (!customerId) {
        console.error('❌ No customer_id in localStorage')
        router.push('/musteri')
        return
      }

      console.log('📋 Loading profile for customer:', customerId)

      // 3. Veritabanı sorgusu - maybeSingle() kullan
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, surname, full_name, email, phone')
        .eq('id', customerId)
        .maybeSingle()

      console.log('📊 Profile query result:', { data, error })

      if (error) {
        console.error('❌ Profile query error:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      if (!data) {
        console.error('❌ No customer data found for ID:', customerId)
        setError('Müşteri kaydı bulunamadı')
        setLoading(false)
        return
      }

      console.log('✅ Profile loaded successfully')
      
      // 4. Name/surname fallback - eğer yoksa full_name'den ayır
      let firstName = data.name || ''
      let lastName = data.surname || ''
      
      if (!firstName && data.full_name) {
        const nameParts = data.full_name.split(' ')
        firstName = nameParts[0] || ''
        lastName = nameParts.slice(1).join(' ') || ''
        console.log('⚠️ Using full_name fallback:', { firstName, lastName })
      }
      
      setProfile({
        id: data.id,
        name: firstName,
        surname: lastName,
        email: data.email || '',
        phone: data.phone || ''
      })
      
      setEditedProfile({
        name: firstName,
        surname: lastName,
        email: data.email || '',
        phone: data.phone || ''
      })
    } catch (error: any) {
      console.error('💥 Profil yüklenemedi:', error)
      console.error('Detaylı Hata:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      setError('Profil bilgileri yüklenemedi: ' + (error?.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      // Validasyonlar
      if (!editedProfile.name.trim()) {
        setError('Ad alanı boş bırakılamaz')
        setSaving(false)
        return
      }

      // Telefon validasyonu
      const phoneDigits = editedProfile.phone.replace(/\D/g, '')
      if (phoneDigits.length !== 10 || !phoneDigits.startsWith('5')) {
        setError('Telefon numarası 10 haneli olmalı ve 5 ile başlamalıdır')
        setSaving(false)
        return
      }

      console.log('💾 Updating profile:', {
        name: editedProfile.name,
        surname: editedProfile.surname,
        email: editedProfile.email,
        phone: phoneDigits
      })

      // full_name'i de güncelle (trigger varsa otomatik olur ama yine de ekleyelim)
      const fullName = `${editedProfile.name.trim()} ${editedProfile.surname.trim()}`.trim()

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: editedProfile.name.trim(),
          surname: editedProfile.surname.trim(),
          full_name: fullName,
          email: editedProfile.email.trim(),
          phone: phoneDigits
        })
        .eq('id', profile?.id)

      if (updateError) {
        console.error('❌ Update error:', updateError)
        throw updateError
      }

      console.log('✅ Profile updated successfully')

      // LocalStorage güncelle
      localStorage.setItem('customer_name', fullName)

      // Profili yeniden yükle
      await loadProfile()
      setEditing(false)
    } catch (error: any) {
      console.error('💥 Profil güncellenemedi:', error)
      console.error('Detaylı Hata:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      })
      
      if (error.code === '23505') {
        if (error.message.includes('phone')) {
          setError('Bu telefon numarası zaten kayıtlı')
        } else if (error.message.includes('email')) {
          setError('Bu e-posta adresi zaten kayıtlı')
        } else {
          setError('Bu bilgiler zaten kayıtlı')
        }
      } else {
        setError('Profil güncellenirken bir hata oluştu: ' + (error?.message || 'Bilinmeyen hata'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile({
      name: profile?.name || '',
      surname: profile?.surname || '',
      email: profile?.email || '',
      phone: profile?.phone || ''
    })
    setEditing(false)
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#f59e0b] border-t-transparent mb-4" />
          <p className="text-[#6f6f6f]">Profil yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Eğer profil yüklenemedi ise hata ekranı göster
  if (!profile && error) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl p-6 border border-red-200">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-[18px] font-bold text-[#3c4043] mb-2">
              Profil Yüklenemedi
            </h2>
            <p className="text-[13px] text-[#6f6f6f] mb-4">
              {error}
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => {
                setError('')
                setLoading(true)
                loadProfile()
              }}
              className="w-full py-3 bg-[#f59e0b] text-white rounded-lg font-semibold hover:bg-[#d97706] transition-colors"
            >
              Tekrar Dene
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                router.push('/musteri')
              }}
              className="w-full py-3 bg-gray-100 text-[#3c4043] rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Giriş Sayfasına Dön
            </button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-[11px] text-blue-800">
              <span className="font-semibold">💡 İpucu:</span> Tarayıcı konsolunu (F12) açıp detaylı hata mesajını kontrol edin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e8] sticky top-0 z-10">
        <div className="max-w-[600px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#f7f7f7] rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-[#3c4043]" />
            </button>
            <h1 className="text-[20px] font-bold text-[#3c4043]">
              Profilim
            </h1>
          </div>
          
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-[#f59e0b] hover:bg-orange-50 rounded-lg transition-colors"
            >
              <Edit2 size={18} />
              <span className="text-[14px] font-semibold">Düzenle</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-[600px] mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-[#e8e8e8]"
        >
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-full flex items-center justify-center text-white font-bold text-[36px] shadow-lg">
              {profile?.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[13px]">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Ad */}
            <div>
              <label className="block text-[13px] font-semibold text-[#6f6f6f] mb-2">
                Ad
              </label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e8e8e8] rounded-lg focus:outline-none focus:border-[#f59e0b] text-[14px]"
                  placeholder="Adınız"
                />
              ) : (
                <div className="px-4 py-3 bg-[#f7f7f7] rounded-lg text-[14px] text-[#3c4043] font-medium">
                  {profile?.name}
                </div>
              )}
            </div>

            {/* Soyad */}
            <div>
              <label className="block text-[13px] font-semibold text-[#6f6f6f] mb-2">
                Soyad
              </label>
              {editing ? (
                <input
                  type="text"
                  value={editedProfile.surname}
                  onChange={(e) => setEditedProfile({ ...editedProfile, surname: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e8e8e8] rounded-lg focus:outline-none focus:border-[#f59e0b] text-[14px]"
                  placeholder="Soyadınız"
                />
              ) : (
                <div className="px-4 py-3 bg-[#f7f7f7] rounded-lg text-[14px] text-[#3c4043] font-medium">
                  {profile?.surname}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-semibold text-[#6f6f6f] mb-2">
                E-posta
              </label>
              {editing ? (
                <input
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e8e8e8] rounded-lg focus:outline-none focus:border-[#f59e0b] text-[14px]"
                  placeholder="ornek@email.com"
                />
              ) : (
                <div className="px-4 py-3 bg-[#f7f7f7] rounded-lg text-[14px] text-[#3c4043] font-medium">
                  {profile?.email}
                </div>
              )}
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-[13px] font-semibold text-[#6f6f6f] mb-2">
                Telefon
              </label>
              {editing ? (
                <div>
                  <input
                    type="tel"
                    value={editedProfile.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setEditedProfile({ ...editedProfile, phone: value })
                    }}
                    className="w-full px-4 py-3 border border-[#e8e8e8] rounded-lg focus:outline-none focus:border-[#f59e0b] text-[14px]"
                    placeholder="5XXXXXXXXX"
                    maxLength={10}
                  />
                  <p className="text-[11px] text-[#6f6f6f] mt-1">
                    10 haneli, 5 ile başlamalı (örn: 5551234567)
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3 bg-[#f7f7f7] rounded-lg text-[14px] text-[#3c4043] font-medium">
                  {profile?.phone}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-[#3c4043] rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                <X size={18} />
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#f59e0b] text-white rounded-lg hover:bg-[#d97706] transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* Account Info */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[12px] text-blue-800">
            <span className="font-semibold">💡 Bilgi:</span> Telefon numaranızı değiştirirseniz, yeni numaranızla giriş yapmanız gerekecektir.
          </p>
        </div>
      </div>
    </div>
  )
}
