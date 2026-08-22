'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Users, Search, User, Pencil, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'
const ITEMS_PER_PAGE = 100

// ─── Types ───────────────────────────────────────────────────────────────────
interface Customer {
  id: string
  full_name: string
  phone: string
  address: string
  restaurant_id: string
  created_at?: string
}

type CustomerQuery = ReturnType<ReturnType<typeof supabase.from>['select']>

function applyCustomerFilters(query: CustomerQuery, rid: string, searchTerm: string) {
  let q = query.eq('restaurant_id', rid).not('restaurant_id', 'is', null)
  const term = searchTerm.trim()
  if (term) {
    q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,address.ilike.%${term}%`)
  }
  return q
}

// ─── Customer Form Modal (Create & Edit) ─────────────────────────────────────
interface CustomerFormModalProps {
  customer?: Customer | null
  restaurantId: string
  onClose: () => void
  onSaved: () => void
}

function CustomerFormModal({ customer, restaurantId, onClose, onSaved }: CustomerFormModalProps) {
  const isEdit = !!customer
  const [form, setForm] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
  })
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
      if (isEdit) {
        const { error } = await supabase
          .from('customers')
          .update({
            full_name: form.full_name.trim(),
            name: form.full_name.trim().split(' ')[0],
            surname: form.full_name.trim().split(' ').slice(1).join(' ') || '',
            phone: form.phone.trim(),
            address: form.address.trim(),
          })
          .eq('id', customer!.id)
          .eq('restaurant_id', restaurantId)

        if (error) throw error
      } else {
        if (!restaurantId) {
          setErr('Restoran kimliği bulunamadı. Lütfen tekrar giriş yapın.')
          return
        }

        const { error } = await supabase.from('customers').insert([{
          full_name: form.full_name.trim(),
          name: form.full_name.trim().split(' ')[0],
          surname: form.full_name.trim().split(' ').slice(1).join(' ') || '',
          phone: form.phone.trim(),
          address: form.address.trim(),
          restaurant_id: restaurantId,
        }])

        if (error) throw error
      }

      onSaved()
      onClose()
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

  const inp = 'w-full px-3 py-2.5 rounded-md border outline-none transition-colors bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500'
  const lbl = 'block text-sm font-medium mb-1 text-slate-300'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-stretch lg:items-center justify-center z-[60] p-0 lg:p-4">
      <div className="w-full h-full min-h-screen rounded-none overflow-y-auto lg:h-auto lg:min-h-0 lg:max-w-md lg:rounded-md bg-slate-900 border border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {isEdit ? (
              <><Pencil className="w-4 h-4 text-gray-400" strokeWidth={1.5} />Müşteri Düzenle</>
            ) : (
              <><User className="w-4 h-4 text-gray-400" strokeWidth={1.5} />Yeni Müşteri Ekle</>
            )}
          </h3>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {err && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{err}</p>
          )}

          <div>
            <label className={lbl}>İsim Soyisim <span className="text-red-400">*</span></label>
            <input
              autoFocus
              type="text"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Ahmet Yılmaz"
              className={inp}
            />
          </div>

          <div>
            <label className={lbl}>Telefon <span className="text-red-400">*</span></label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="05XX XXX XX XX"
              className={inp}
            />
          </div>

          <div>
            <label className={lbl}>Adres</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="Mahalle, sokak, kat, no..."
              className={`${inp} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-md font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />Kaydediliyor...</span>
              ) : isEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function MusterilerimPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [idReady, setIdReady] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem(LOGIN_RESTAURANT_ID_KEY)
      setRestaurantId(id)
      setIdReady(true)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadCustomers = useCallback(async (rid: string, page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = page * ITEMS_PER_PAGE - 1

      const countQuery = applyCustomerFilters(
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        rid,
        searchTerm
      )

      const dataQuery = applyCustomerFilters(
        supabase.from('customers').select('id, full_name, phone, address, restaurant_id, created_at'),
        rid,
        searchTerm
      )
        .order('created_at', { ascending: false })
        .range(from, to)

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery])

      if (countResult.error) {
        console.warn('loadCustomers count error:', countResult.error.message)
        setTotalCustomers(0)
      } else {
        setTotalCustomers(countResult.count ?? 0)
      }

      if (dataResult.error) {
        console.warn('loadCustomers data error:', dataResult.error.message)
        setCustomers([])
        return
      }

      setCustomers(dataResult.data || [])
    } catch (e) {
      console.error('loadCustomers exception:', e)
      setTotalCustomers(0)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!idReady || !restaurantId) return
    loadCustomers(restaurantId, currentPage, debouncedSearch)
  }, [idReady, restaurantId, currentPage, debouncedSearch, loadCustomers])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const handleClearSearch = () => {
    setSearch('')
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCustomers / ITEMS_PER_PAGE))
  const isPrevDisabled = currentPage <= 1
  const isNextDisabled = currentPage * ITEMS_PER_PAGE >= totalCustomers

  if (!idReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Oturum bilgisi bulunamadı. Lütfen giriş yapın.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] overflow-x-hidden">
      {toast && (
        <div className="fixed top-[max(1.5rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[70] bg-slate-800 border border-slate-600 text-white px-5 py-3 rounded-md shadow-sm text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              Kayıtlı Müşterilerim
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {totalCustomers} müşteri kayıtlı
            </p>
          </div>
          <button
            onClick={() => { setEditingCustomer(null); setShowModal(true) }}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold transition-colors"
          >
            <span className="text-lg">+</span>
            Yeni Müşteri Ekle
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="İsim, telefon veya adres ara..."
            className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-md border border-slate-800 bg-slate-900 py-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto" />
            <p className="text-slate-400 text-sm mt-4">Yükleniyor...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-md border border-slate-800 bg-slate-900 py-16 text-center">
            <User className="w-8 h-8 mx-auto mb-3 text-gray-400" strokeWidth={1.5} />
            <p className="text-slate-400 text-sm">
              {search ? 'Arama sonucu bulunamadı' : 'Henüz kayıtlı müşteri yok'}
            </p>
            {!search && (
              <button
                onClick={() => { setEditingCustomer(null); setShowModal(true) }}
                className="mt-4 text-orange-500 hover:text-orange-400 text-sm font-medium"
              >
                + İlk müşteriyi ekle
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="lg:hidden space-y-3">
              {customers.map(c => (
                <div
                  key={c.id}
                  className="p-3 rounded-md border border-slate-800 bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{c.full_name}</p>
                      {c.created_at && (
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          {new Date(c.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingCustomer(c); setShowModal(true) }}
                      title="Düzenle"
                      className="shrink-0 p-2 rounded-md text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                    >
                      <Pencil className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-300 font-mono">{c.phone || '—'}</p>
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 break-words">
                    {c.address || 'Adres yok'}
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden lg:block rounded-md border border-slate-800 overflow-hidden bg-slate-900">
              <div className="grid grid-cols-[1fr_140px_1fr_80px] gap-4 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">İsim</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefon</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adres</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">İşlem</span>
              </div>
              <div className="divide-y divide-slate-800">
                {customers.map(c => (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1fr_140px_1fr_80px] gap-4 px-4 py-3.5 hover:bg-slate-800/40 transition-colors items-center"
                  >
                    <div>
                      <p className="text-white font-semibold text-sm">{c.full_name}</p>
                      {c.created_at && (
                        <p className="text-slate-500 text-xs mt-0.5">
                          {new Date(c.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm font-mono">{c.phone || '—'}</p>
                    <p className="text-slate-400 text-sm truncate" title={c.address}>{c.address || '—'}</p>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => { setEditingCustomer(c); setShowModal(true) }}
                        title="Düzenle"
                        className="p-2 rounded-md text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={isPrevDisabled}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                Önceki Sayfa
              </button>

              <span className="text-slate-400 text-sm font-medium whitespace-nowrap">
                Sayfa {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={isNextDisabled}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-semibold text-sm bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              >
                Sonraki Sayfa
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <CustomerFormModal
          customer={editingCustomer}
          restaurantId={restaurantId}
          onClose={() => { setShowModal(false); setEditingCustomer(null) }}
          onSaved={() => {
            loadCustomers(restaurantId, currentPage, debouncedSearch)
            showToast(editingCustomer ? 'Müşteri güncellendi' : 'Müşteri eklendi')
          }}
        />
      )}
    </div>
  )
}
