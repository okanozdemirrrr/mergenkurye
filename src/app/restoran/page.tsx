'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const LOGIN_STORAGE_KEY = 'restoran_logged_in'
const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'

interface Restaurant {
  id: string
  name: string
  password?: string
}

interface Package {
  id: number
  customer_name: string
  customer_phone?: string
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
  const [isMounted, setIsMounted] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
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
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [darkMode, setDarkMode] = useState(true) // Varsayılan dark mode

  // Build-safe mount kontrolü
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ÇELİK GİBİ OTURUM KONTROLÜ - SAYFA YENİLENDİĞİNDE DIŞARI ATMA!
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isMounted) return

    setIsCheckingAuth(true)

    try {
      const loggedIn = localStorage.getItem(LOGIN_STORAGE_KEY)
      const loggedRestaurantId = localStorage.getItem(LOGIN_RESTAURANT_ID_KEY)
      
      // Restoran oturumu varsa BURADA KAL!
      if (loggedIn === 'true' && loggedRestaurantId) {
        setIsLoggedIn(true)
        setSelectedRestaurantId(loggedRestaurantId)
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
      let query = supabase
        .from('packages')
        .select('*, restaurants(name)')
        .eq('restaurant_id', selectedRestaurantId)

      // Tarih filtresine göre sorgu ekle
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate = new Date()

        if (dateFilter === 'today') {
          // Bugün (gece 00:00'dan itibaren)
          startDate.setHours(0, 0, 0, 0)
        } else if (dateFilter === 'week') {
          // Son 7 gün
          startDate.setDate(now.getDate() - 7)
        } else if (dateFilter === 'month') {
          // Son 30 gün
          startDate.setDate(now.getDate() - 30)
        }

        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

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

  // Login işlemi - Veritabanı sorgusu
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window === 'undefined') return
    
    setErrorMessage('')
    
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, password')
        .eq('name', loginForm.username)
        .single()
      
      if (error) {
        setErrorMessage('Restoran bulunamadı!')
        return
      }
      
      if (data && data.password === loginForm.password) {
        // Sadece kurye oturumunu temizle (admin oturumuna DOKUNMA!)
        localStorage.removeItem('kurye_logged_in')
        localStorage.removeItem('kurye_logged_courier_id')
        
        // Restoran oturumunu başlat
        localStorage.setItem(LOGIN_STORAGE_KEY, 'true')
        localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, data.id)
        setIsLoggedIn(true)
        setSelectedRestaurantId(data.id)
      } else {
        setErrorMessage('Hatalı şifre!')
      }
    } catch (error: any) {
      setErrorMessage('Giriş yapılırken hata oluştu')
    }
  }

  // Sayfa yüklendiğinde restoranları çek
  useEffect(() => {
    fetchRestaurants()
  }, [])

  useEffect(() => {
    if (isLoggedIn && selectedRestaurantId) {
      fetchPackages()
      // Silent refresh - 30 saniyede bir
      const interval = setInterval(fetchPackages, 30000)
      return () => clearInterval(interval)
    }
  }, [isLoggedIn, selectedRestaurantId, dateFilter])

  // Restoran seçimini değiştir ve LocalStorage'a kaydet
  const handleRestaurantChange = (restaurantId: string) => {
    const id = restaurantId || null
    setSelectedRestaurantId(id)
    if (id && typeof window !== 'undefined') {
      localStorage.setItem(LOGIN_RESTAURANT_ID_KEY, id)
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
      if (!formData.customerPhone.trim()) {
        throw new Error('Müşteri numarası gereklidir')
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
            customer_phone: formData.customerPhone.trim(),
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
        customerPhone: '',
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

  // RENDER BLOKLAMA - Oturum kontrolü tamamlanmadan hiçbir şey gösterme!
  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-sm">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Giriş ekranı
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-48 h-48 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-white mb-2">
              Restoran Girişi
            </h1>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="Restoran Adı" 
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            
            <div>
              <input 
                type="password" 
                placeholder="Şifre" 
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            
            <button 
              type="submit"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Giriş Yap
            </button>
            
            {errorMessage && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm text-center">{errorMessage}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen py-6 px-4 ${darkMode ? 'bg-slate-950' : 'bg-gray-100'}`}>
      {/* Dark Mode Toggle - Sağ Üst */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-4 right-4 z-50 p-2 rounded-lg shadow-lg transition-colors ${
          darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300'
        }`}
        title={darkMode ? 'Gündüz Modu' : 'Gece Modu'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Fixed Çıkış Butonu - Sol Üst */}
      <button 
        onClick={() => { 
          localStorage.removeItem(LOGIN_STORAGE_KEY);
          localStorage.removeItem(LOGIN_RESTAURANT_ID_KEY);
          window.location.href = '/restoran';
        }} 
        className="fixed top-4 left-4 z-50 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
      >
        ← Çıkış
      </button>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* SOL PANEL - YENİ SİPARİŞ FORMU */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            {/* Başlık */}
            <div className="flex justify-center items-center mb-6">
              <div className="text-center">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-32 h-32 mx-auto mb-2"
                />
                <h1 className="text-xl font-bold text-white">
                  {selectedRestaurant?.name}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Yeni Sipariş
                </p>
              </div>
            </div>

            {/* Başarı Mesajı */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Hata Mesajı */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Müşteri Adı */}
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-300 mb-1">
                  Müşteri Adı <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                  placeholder="Ahmet Yılmaz"
                  disabled={isSubmitting}
                />
              </div>

              {/* Müşteri Numarası */}
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-slate-300 mb-1">
                  Müşteri Numarası <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                  placeholder="05XX-XXX-XX-XX"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Lütfen numarayı 05XX-XXX-XX-XX şeklinde giriniz
                </p>
              </div>

              {/* Paket İçeriği */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-1">
                  Paket İçeriği <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors resize-none"
                  placeholder="2x Döner, 1x Ayran"
                  disabled={isSubmitting}
                />
              </div>

              {/* Teslimat Adresi */}
              <div>
                <label htmlFor="deliveryAddress" className="block text-sm font-medium text-slate-300 mb-1">
                  Teslimat Adresi <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors resize-none"
                  placeholder="Atatürk Mah. İnönü Cad. No:123"
                  disabled={isSubmitting}
                />
              </div>

              {/* Paket Tutarı */}
              <div>
                <label htmlFor="packageAmount" className="block text-sm font-medium text-slate-300 mb-1">
                  Tutar (₺) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  id="packageAmount"
                  name="packageAmount"
                  value={formData.packageAmount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>

              {/* Müşteri Ödeme Tercihi */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ödeme Tercihi <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    disabled={isSubmitting}
                    className={`py-2.5 rounded-lg border font-medium transition-colors ${
                      paymentMethod === 'cash'
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Nakit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    disabled={isSubmitting}
                    className={`py-2.5 rounded-lg border font-medium transition-colors ${
                      paymentMethod === 'card'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Kart
                  </button>
                </div>
              </div>

              {/* Submit Butonu */}
              <button
                type="submit"
                disabled={isSubmitting || !paymentMethod}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  'Sipariş Kaydet'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* SAĞ PANEL - SİPARİŞ LİSTESİ */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            {/* Başlık ve Filtre */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Siparişlerim</h2>
                <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">
                  {packages.length}
                </span>
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 focus:border-orange-500 outline-none"
              >
                <option value="today">Bugün</option>
                <option value="week">7 Gün</option>
                <option value="month">30 Gün</option>
                <option value="all">Tümü</option>
              </select>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {packages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-sm">Sipariş yok</p>
                </div>
              ) : (
                packages.map(pkg => (
                  <div key={pkg.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm text-white">{pkg.customer_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        pkg.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                        pkg.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                        pkg.status === 'picking_up' ? 'bg-orange-500/20 text-orange-400' :
                        pkg.status === 'on_the_way' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {pkg.status === 'waiting' ? 'Bekliyor' :
                         pkg.status === 'assigned' ? 'Atandı' :
                         pkg.status === 'picking_up' ? 'Alınıyor' :
                         pkg.status === 'on_the_way' ? 'Yolda' : 'Teslim'}
                      </span>
                    </div>
                    
                    {pkg.content && (
                      <p className="text-xs text-slate-400 mb-2">
                        {pkg.content}
                      </p>
                    )}
                    
                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                      {pkg.delivery_address}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-400 text-sm">
                        {pkg.amount}₺
                      </span>
                      <span className="text-xs text-slate-500">
                        {pkg.payment_method === 'cash' ? 'Nakit' : 'Kart'}
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