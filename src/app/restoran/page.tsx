'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LOGIN_STORAGE_KEY = 'restoran_logged_in'
const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'

const RESTAURANT_CREDENTIALS = {
  'egodöner': 'gökhan123',
  'ömerusta': 'omerusta123', 
  'ikramdöner': 'ikramdöner123'
}

interface Restaurant {
  id: string
  name: string
}

interface Package {
  id: number
  customer_name: string
  delivery_address: string
  amount: number
  status: string
  content?: string
  courier_id?: string | null
  payment_method?: 'cash' | 'card'
  restaurant_id?: number | null
  created_at?: string
  assigned_at?: string
  picked_up_at?: string
  delivered_at?: string
  restaurant?: Restaurant
}

export default function RestoranPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    deliveryAddress: '',
    packageAmount: '',
    content: ''
  })
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Session kontrolü
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = sessionStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedRestaurantId = sessionStorage.getItem(LOGIN_RESTAURANT_ID_KEY)
      if (loggedIn === 'true' && loggedRestaurantId) {
        setIsLoggedIn(true)
        setSelectedRestaurantId(loggedRestaurantId)
      }
    }
  }, [])

  // Restoranları çek
  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error: any) {
      console.error('Restoranlar yüklenirken hata:', error.message)
      setErrorMessage('Restoranlar yüklenirken bir hata oluştu')
      setTimeout(() => setErrorMessage(''), 3000)
    }
  }

  // Restoran paketlerini çek
  const fetchPackages = async () => {
    if (!selectedRestaurantId) return
    
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*, restaurants(name)')
        .eq('restaurant_id', selectedRestaurantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const transformed = (data || []).map((pkg: any) => ({
        ...pkg,
        restaurant: pkg.restaurants
      }))
      setPackages(transformed)
    } catch (error: any) {
      console.error('Paketler yüklenirken hata:', error.message)
    }
  }

  // Login işlemi
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    
    const password = RESTAURANT_CREDENTIALS[loginForm.username as keyof typeof RESTAURANT_CREDENTIALS]
    if (password && password === loginForm.password) {
      try {
        // Restaurants tablosundan name ile eşleşen restoranı bul
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name')
          .eq('name', loginForm.username)
          .single()
        
        if (error) {
          console.error('Restoran sorgu hatası:', error)
          throw error
        }
        
        if (data) {
          console.log('Bulunan restoran:', data) // Debug için
          sessionStorage.setItem(LOGIN_STORAGE_KEY, 'true')
          sessionStorage.setItem(LOGIN_RESTAURANT_ID_KEY, data.id)
          setIsLoggedIn(true)
          setSelectedRestaurantId(data.id)
        } else {
          setErrorMessage('Restoran bulunamadı!')
        }
      } catch (error: any) {
        console.error('Login hatası:', error)
        setErrorMessage('Giriş yapılırken hata oluştu: ' + error.message)
      }
    } else {
      setErrorMessage('Hatalı kullanıcı adı veya şifre!')
    }
  }

  // Sayfa yüklendiğinde restoranları çek
  useEffect(() => {
    fetchRestaurants()
    if (isLoggedIn) {
      fetchPackages()
      const interval = setInterval(fetchPackages, 30000)
      return () => clearInterval(interval)
    }
  }, [isLoggedIn, selectedRestaurantId])

  // Restoran seçimini değiştir ve LocalStorage'a kaydet
  const handleRestaurantChange = (restaurantId: string) => {
    const id = restaurantId || null
    setSelectedRestaurantId(id)
    if (id && typeof window !== 'undefined') {
      sessionStorage.setItem(LOGIN_RESTAURANT_ID_KEY, id)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Hata mesajlarını temizle
    if (errorMessage) setErrorMessage('')
    if (successMessage) setSuccessMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      // Validasyon
      if (!formData.customerName.trim()) {
        throw new Error('Müşteri adı gereklidir')
      }
      if (!formData.content.trim()) {
        throw new Error('Paket içeriği gereklidir')
      }
      if (!formData.deliveryAddress.trim()) {
        throw new Error('Teslimat adresi gereklidir')
      }
      if (!formData.packageAmount.trim() || parseFloat(formData.packageAmount) <= 0) {
        throw new Error('Geçerli bir paket tutarı giriniz')
      }
      if (!selectedRestaurantId) {
        throw new Error('Restoran bilgisi bulunamadı')
      }
      if (!paymentMethod) {
        throw new Error('Lütfen ödeme tercihi seçiniz')
      }

      console.log('Sipariş kaydediliyor:', {
        restaurant_id: selectedRestaurantId,
        customer_name: formData.customerName.trim(),
        content: formData.content.trim()
      }) // Debug için

      // Supabase'e kayıt - restaurant_id otomatik olarak session'dan alınıyor
      const { data, error } = await supabase
        .from('packages')
        .insert([
          {
            customer_name: formData.customerName.trim(),
            content: formData.content.trim(),
            delivery_address: formData.deliveryAddress.trim(),
            amount: parseFloat(formData.packageAmount),
            status: 'waiting',
            restaurant_id: selectedRestaurantId, // Session'dan gelen restaurant_id
            payment_method: paymentMethod
          }
        ])
        .select()

      if (error) {
        console.error('Sipariş kayıt hatası:', error)
        throw error
      }

      console.log('Sipariş başarıyla kaydedildi:', data) // Debug için

      // Başarı mesajı göster
      setSuccessMessage('Sipariş başarıyla kaydedildi!')
      
      // Formu temizle
      setFormData({
        customerName: '',
        deliveryAddress: '',
        packageAmount: '',
        content: ''
      })
      setPaymentMethod(null)

      // Paketleri yenile
      fetchPackages()

      // Başarı mesajını 3 saniye sonra temizle
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)

    } catch (error: any) {
      setErrorMessage(error.message || 'Sipariş kaydedilirken bir hata oluştu')
      setTimeout(() => setErrorMessage(''), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId)

  // Giriş ekranı
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-3xl p-8 w-full max-w-md border border-orange-200 dark:border-slate-700">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🍽️</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Restoran Girişi</h1>
            <p className="text-slate-600 dark:text-slate-400">Hesabınıza giriş yapın</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Restoran Adı
              </label>
              <input 
                type="text" 
                placeholder="Restoran adınızı girin" 
                className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Şifre
              </label>
              <input 
                type="password" 
                placeholder="Şifrenizi girin" 
                className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            
            <button 
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              GİRİŞ YAP
            </button>
            
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-800 dark:text-red-300 text-sm text-center">{errorMessage}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-900 dark:to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SOL PANEL - YENİ SİPARİŞ FORMU */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 border border-orange-200 dark:border-slate-700">
            {/* Başlık */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  🍽️ {selectedRestaurant?.name}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Yeni sipariş bilgilerini girin
                </p>
              </div>
              <button 
                onClick={() => { 
                  sessionStorage.clear(); 
                  window.location.reload(); 
                }} 
                className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Çıkış
              </button>
            </div>

            {/* Başarı Mesajı */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-300 font-medium flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {successMessage}
                </p>
              </div>
            )}

            {/* Hata Mesajı */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300 font-medium flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Müşteri Adı */}
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Müşteri Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all outline-none"
                  placeholder="Örn: Ahmet Yılmaz"
                  disabled={isSubmitting}
                />
              </div>

              {/* Paket İçeriği */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Paket İçeriği <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all outline-none resize-none"
                  placeholder="Örn: 2x Döner, 1x Ayran, 1x Patates"
                  disabled={isSubmitting}
                />
              </div>

              {/* Teslimat Adresi */}
              <div>
                <label htmlFor="deliveryAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Teslimat Adresi <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all outline-none resize-none"
                  placeholder="Örn: Atatürk Mah. İnönü Cad. No:123 Daire:5 Kadıköy/İstanbul"
                  disabled={isSubmitting}
                />
              </div>

              {/* Paket Tutarı */}
              <div>
                <label htmlFor="packageAmount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Paket Tutarı (TL) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="packageAmount"
                    name="packageAmount"
                    value={formData.packageAmount}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all outline-none"
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    ₺
                  </span>
                </div>
              </div>

              {/* Müşteri Ödeme Tercihi */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Müşteri Ödeme Tercihi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    disabled={isSubmitting}
                    className={`py-4 px-6 rounded-xl border-2 font-semibold text-lg transition-all duration-200 ${
                      paymentMethod === 'cash'
                        ? 'bg-green-600 border-green-700 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    💵 Nakit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    disabled={isSubmitting}
                    className={`py-4 px-6 rounded-xl border-2 font-semibold text-lg transition-all duration-200 ${
                      paymentMethod === 'card'
                        ? 'bg-blue-600 border-blue-700 text-white shadow-lg scale-105'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    💳 Kredi Kartı
                  </button>
                </div>
              </div>

              {/* Submit Butonu */}
              <button
                type="submit"
                disabled={isSubmitting || !paymentMethod}
                className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  'Siparişi Kaydet'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* SAĞ PANEL - SİPARİŞ LİSTESİ */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-6 border border-orange-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              📋 Siparişlerim
              <span className="ml-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm px-2 py-1 rounded-full">
                {packages.length}
              </span>
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {packages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <div className="text-4xl mb-2">📦</div>
                  <p>Henüz sipariş yok</p>
                </div>
              ) : (
                packages.map(pkg => (
                  <div key={pkg.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{pkg.customer_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        pkg.status === 'waiting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        pkg.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        pkg.status === 'on_the_way' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {pkg.status === 'waiting' ? 'Bekliyor' :
                         pkg.status === 'assigned' ? 'Atandı' :
                         pkg.status === 'picking_up' ? 'Alınıyor' :
                         pkg.status === 'on_the_way' ? 'Yolda' : 'Teslim'}
                      </span>
                    </div>
                    
                    {pkg.content && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        📝 {pkg.content}
                      </p>
                    )}
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      📍 {pkg.delivery_address}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {pkg.amount} ₺
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}