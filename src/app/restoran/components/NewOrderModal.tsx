'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Customer {
  id: string
  full_name: string
  phone: string
  address: string
  restaurant_id: string          // multi-tenant izolasyonu için zorunlu
  district?: string
  neighborhood?: string
  street_address?: string
  floor?: string
  door_number?: string
}

interface NewOrderModalProps {
  onClose: () => void
  onSuccess: () => void
  restaurantId: string
  darkMode: boolean
}

// ─── Yardımcı: Adres Birleştir ────────────────────────────────────────────────
function buildAddress(c: Customer): string {
  if (c.address) return c.address
  const parts = [c.neighborhood, c.street_address, c.floor && `Kat:${c.floor}`, c.door_number && `No:${c.door_number}`, c.district].filter(Boolean)
  return parts.join(', ')
}

// ─── Yeni Müşteri Modal ──────────────────────────────────────────────────────
interface NewCustomerModalProps {
  darkMode: boolean
  onClose: () => void
  onSaved: (customer: Customer) => void
  restaurantId: string
  prefillName?: string
}

function NewCustomerModal({ darkMode, onClose, onSaved, restaurantId, prefillName }: NewCustomerModalProps) {
  const [form, setForm] = useState({ full_name: prefillName || '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim()) {
      setErr('İsim ve telefon zorunludur')
      return
    }
    setSaving(true)
    setErr('')
    try {
      // INSERT — restaurant_id KESİNİKLLE zorunlu
      if (!restaurantId) {
        setErr('Restoran kimliği bulunamadı. Lütfen tekrar giriş yapın.')
        return
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          full_name: form.full_name.trim(),
          name: form.full_name.trim().split(' ')[0],
          surname: form.full_name.trim().split(' ').slice(1).join(' ') || '',
          phone: form.phone.trim(),
          address: form.address.trim(),
          restaurant_id: restaurantId,   // zorunlu — eksikse hiç insert yapma
        }])
        .select('id, full_name, phone, address, restaurant_id')
        .single()

      if (error) throw error
      onSaved(data as Customer)
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('customers_phone_key') || msg.includes('customers_phone_restaurant_unique') || msg.includes('duplicate key')) {
        setErr('Bu telefon numarası zaten kayıtlı. Farklı bir numara girin.')
      } else {
        setErr(msg || 'Kayıt hatası')
      }
    } finally {
      setSaving(false)
    }
  }

  const bg = darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500' : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-gray-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            👤 Yeni Müşteri Ekle
          </h3>
          <button onClick={onClose} className={`text-2xl leading-none ${darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>×</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {err && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>}

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>İsim Soyisim <span className="text-red-400">*</span></label>
            <input
              autoFocus
              type="text"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Ahmet Yılmaz"
              className={`w-full px-3 py-2.5 rounded-lg border outline-none transition-colors ${bg}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Telefon <span className="text-red-400">*</span></label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="05XX XXX XX XX"
              className={`w-full px-3 py-2.5 rounded-lg border outline-none transition-colors ${bg}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Adres</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="Atatürk Mah. İnönü Cad. No:12"
              className={`w-full px-3 py-2.5 rounded-lg border outline-none transition-colors resize-none ${bg}`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              İptal
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
              {saving ? '⏳ Kaydediliyor...' : '✅ Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Ana Modal ────────────────────────────────────────────────────────────────
export default function NewOrderModal({ onClose, onSuccess, restaurantId, darkMode }: NewOrderModalProps) {
  // --- CRM State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Form State ---
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    packageAmount: '',
    content: ''
  })
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── Dropdown dışı tıklama ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Müşteri Arama (debounced) ──
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setIsSearching(true)
    try {
      // KESİN İZOLASYON: sadece bu restoranin müşterileri arasında ara
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, address, restaurant_id, district, neighborhood, street_address, floor, door_number')
        .eq('restaurant_id', restaurantId)           // başka restoranin verisi gelmesin
        .not('restaurant_id', 'is', null)            // null kayıtları dışla
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`)
        .limit(6)

      if (error) {
        // Schema cache hatası veya başka hata → boş sonuç, ASLA filtresiz çekme
        console.warn('searchCustomers error:', error.message)
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setSearchResults(data || [])
      setShowDropdown(true)
    } catch { /* sessiz */ } finally {
      setIsSearching(false)
    }
  }, [restaurantId])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    setSelectedCustomer(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCustomers(val), 280)
  }

  // ── Müşteri Seç ──
  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c)
    setSearchQuery(c.full_name)
    setShowDropdown(false)
    setFormData(prev => ({
      ...prev,
      customerName: c.full_name,
      customerPhone: c.phone || '',
      deliveryAddress: buildAddress(c),
    }))
  }

  // ── Yeni Müşteri Kaydedildi ──
  const handleNewCustomerSaved = (c: Customer) => {
    setShowNewCustomerModal(false)
    selectCustomer(c)
  }

  // ── CRM Seçimini Temizle ──
  const clearCustomer = () => {
    setSelectedCustomer(null)
    setSearchQuery('')
    setFormData(prev => ({ ...prev, customerName: '', customerPhone: '', deliveryAddress: '' }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentMethod) { setError('Lütfen ödeme yöntemi seçin'); return }
    setIsSubmitting(true)
    setError('')
    try {
      // 1. SNAPSHOT: Restoranın güncel package_fee'sini al
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('package_fee')
        .eq('id', restaurantId)
        .single()

      if (restaurantError) throw restaurantError

      const appliedPrice = restaurantData?.package_fee || 100

      // 2. INSERT: applied_price ile birlikte kaydet
      const { error: insertError } = await supabase
        .from('packages')
        .insert([{
          customer_name: formData.customerName,
          customer_phone: formData.customerPhone,
          delivery_address: formData.deliveryAddress,
          amount: parseFloat(formData.packageAmount),
          content: formData.content,
          status: 'new_order',
          payment_method: paymentMethod,
          restaurant_id: restaurantId,
          applied_price: appliedPrice,
          created_at: new Date().toISOString()
        }])
      if (insertError) throw insertError
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Sipariş eklenemedi')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Style Helpers ──
  const input = `w-full px-3 py-2.5 rounded-lg border outline-none transition-colors ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
  }`
  const label = `block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className={`rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>

          {/* ── Header ── */}
          <div className={`flex items-center justify-between p-6 border-b sticky top-0 z-10 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>🍽️ Yeni Sipariş</h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Müşteri ara veya bilgileri manuel gir</p>
            </div>
            <button onClick={onClose} className={`text-2xl ${darkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>×</button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* ── BÖLÜM 1: MÜŞTERİ CRM ── */}
            <div className={`rounded-xl border p-4 space-y-4 ${darkMode ? 'border-orange-500/30 bg-orange-500/5' : 'border-orange-200 bg-orange-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-orange-500 text-lg">👤</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>Müşteri Seçimi</span>
                {selectedCustomer && (
                  <span className="ml-auto flex items-center gap-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                    ✓ Kayıtlı müşteri
                  </span>
                )}
              </div>

              {/* Akıllı Arama */}
              <div ref={searchRef} className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                      placeholder="İsim, telefon veya adres ara..."
                      className={`w-full pl-9 pr-3 py-2.5 rounded-lg border outline-none transition-colors ${
                        selectedCustomer
                          ? darkMode
                            ? 'bg-green-900/20 border-green-600 text-white'
                            : 'bg-green-50 border-green-400 text-gray-900'
                          : darkMode
                          ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                      }`}
                      disabled={isSubmitting}
                    />
                    {isSearching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                      </span>
                    )}
                  </div>

                  {/* Temizle veya Yeni Müşteri */}
                  {selectedCustomer ? (
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="whitespace-nowrap px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                    >
                      + Yeni
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {showDropdown && (
                  <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-2xl z-30 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-center">
                        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Müşteri bulunamadı</p>
                        <button
                          type="button"
                          onClick={() => { setShowDropdown(false); setShowNewCustomerModal(true) }}
                          className="mt-2 text-sm text-orange-500 hover:text-orange-400 font-medium"
                        >
                          + Yeni müşteri olarak ekle
                        </button>
                      </div>
                    ) : (
                      <>
                        {searchResults.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className={`w-full text-left px-4 py-3 transition-colors border-b last:border-0 ${
                              darkMode
                                ? 'border-slate-700 hover:bg-slate-700'
                                : 'border-gray-100 hover:bg-orange-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {c.full_name}
                              </span>
                              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{c.phone}</span>
                            </div>
                            {buildAddress(c) && (
                              <p className={`text-xs mt-0.5 truncate ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                📍 {buildAddress(c)}
                              </p>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setShowDropdown(false); setShowNewCustomerModal(true) }}
                          className={`w-full px-4 py-2.5 text-sm text-center font-medium text-orange-500 hover:text-orange-400 transition-colors ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}
                        >
                          + Yeni kayıtlı müşteri ekle
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Müşteri Adı + Telefon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Müşteri Adı <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                    placeholder="Ahmet Yılmaz"
                    className={input}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={label}>Telefon <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    required
                    placeholder="05XX XXX XX XX"
                    className={input}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Teslimat Adresi */}
              <div>
                <label className={label}>Teslimat Adresi <span className="text-red-400">*</span></label>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="Atatürk Mah. İnönü Cad. No:123 Kat:3"
                  className={`${input} resize-none`}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* ── BÖLÜM 2: SİPARİŞ DETAYLARI ── */}
            <div className={`rounded-xl border p-4 space-y-4 ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📦</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Sipariş Detayları</span>
              </div>

              {/* Paket İçeriği */}
              <div>
                <label className={label}>Paket İçeriği <span className="text-red-400">*</span></label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="2x Döner, 1x Ayran, 1x Baklava"
                  className={`${input} resize-none`}
                  disabled={isSubmitting}
                />
              </div>

              {/* Tutar + Ödeme */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Tutar (₺) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    name="packageAmount"
                    value={formData.packageAmount}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={input}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={label}>Ödeme Yöntemi <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 gap-1.5 h-[42px]">
                    {([['cash', '💵', 'Nakit'], ['card', '💳', 'Kart'], ['iban', '🏦', 'IBAN']] as const).map(([val, icon, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPaymentMethod(val)}
                        disabled={isSubmitting}
                        className={`h-full rounded-lg border text-xs font-semibold transition-colors ${
                          paymentMethod === val
                            ? val === 'cash' ? 'bg-green-600 border-green-600 text-white'
                              : val === 'card' ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-purple-600 border-purple-600 text-white'
                            : darkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                        } disabled:opacity-50`}
                      >
                        {icon} {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Hata ── */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* ── Submit ── */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                  darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 flex-grow-[2] py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '⏳ Kaydediliyor...' : '🚀 Sipariş Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Yeni Müşteri Modal ── */}
      {showNewCustomerModal && (
        <NewCustomerModal
          darkMode={darkMode}
          restaurantId={restaurantId}
          prefillName={searchQuery}
          onClose={() => setShowNewCustomerModal(false)}
          onSaved={handleNewCustomerSaved}
        />
      )}
    </>
  )
}
