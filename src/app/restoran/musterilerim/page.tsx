'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

const LOGIN_RESTAURANT_ID_KEY = 'restoran_logged_restaurant_id'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Customer {
  id: string
  full_name: string
  phone: string
  address: string
  restaurant_id: string
  created_at?: string
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
        // UPDATE — sadece bu restoranın kaydını güncelle
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
          .eq('restaurant_id', restaurantId) // ⚠️ güvenlik filtresi

        if (error) throw error
      } else {
        // INSERT — restaurant_id KESİNLİKLE zorunlu, eksikse kayıt atma
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
          restaurant_id: restaurantId,   // zorunlu — eksikse insert yapma
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

  const inp = 'w-full px-3 py-2.5 rounded-lg border outline-none transition-colors bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-orange-500'
  const lbl = 'block text-sm font-medium mb-1 text-slate-300'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">
            {isEdit ? '✏️ Müşteri Düzenle' : '👤 Yeni Müşteri Ekle'}
          </h3>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-white leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {err && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>
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
              className="flex-1 py-2.5 rounded-lg font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? '⏳ Kaydediliyor...' : isEdit ? '✅ Güncelle' : '✅ Kaydet'}
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
  const [loading, setLoading] = useState(false)   // false — restaurantId gelmeden fetch YOK
  const [idReady, setIdReady] = useState(false)   // restaurantId localStorage'dan alındı mı?
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  // restaurantId'yi localStorage'dan al — hazır olduğunda idReady=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem(LOGIN_RESTAURANT_ID_KEY)
      setRestaurantId(id)   // null veya geçerli UUID
      setIdReady(true)      // artık biliyoruz: ya var ya yok
    }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── READ ──
  const fetchCustomers = useCallback(async (rid: string) => {
    setLoading(true)
    try {
      // KESİN İZOLASYON: restaurant_id eşleşmeli VE null olmamalı
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, address, restaurant_id, created_at')
        .eq('restaurant_id', rid)           // sadece bu restoranın müşterileri
        .not('restaurant_id', 'is', null)   // null kayıtları kesinlikle dışla
        .order('created_at', { ascending: false })

      if (error) {
        // Schema cache hatası → boş liste göster, ASLA filtresiz çekme
        console.warn('fetchCustomers error:', error.message)
        setCustomers([])
        return
      }

      setCustomers(data || [])
    } catch (e) {
      console.error('fetchCustomers exception:', e)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // idReady=true OLMADAN fetch tetiklenmez (race condition önlemi)
  useEffect(() => {
    if (!idReady) return              // localStorage henüz okunmadı
    if (!restaurantId) return        // giriş yok
    fetchCustomers(restaurantId)     // sadece bu restoran için
  }, [idReady, restaurantId, fetchCustomers])

  // ── DELETE ──
  const handleDelete = async () => {
    if (!deleteConfirm || !restaurantId) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteConfirm.id)
        .eq('restaurant_id', restaurantId)   // başkasının verisini silemez

      if (error) throw error
      setCustomers(prev => prev.filter(c => c.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      showToast('✅ Müşteri silindi')
    } catch (e: any) {
      showToast('❌ Silme hatası: ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Arama Filtresi ──
  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    )
  })

  // restaurantId henüz localStorage'dan alınmadıysa spinner göster
  if (!idReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    )
  }

  // Giriş yapılmamış
  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Oturum bilgisi bulunamadı. Lütfen giriş yapın.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 pt-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-slate-800 border border-slate-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">👥 Kayıtlı Müşterilerim</h1>
            <p className="text-slate-400 text-sm mt-1">
              {customers.length} müşteri kayıtlı
            </p>
          </div>
          <button
            onClick={() => { setEditingCustomer(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors"
          >
            <span className="text-lg">+</span>
            Yeni Müşteri Ekle
          </button>
        </div>

        {/* Arama */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="İsim, telefon veya adres ara..."
            className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {/* Tablo */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
          {/* Tablo Başlığı */}
          <div className="grid grid-cols-[1fr_140px_1fr_80px] gap-4 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">İsim</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Telefon</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adres</span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">İşlem</span>
          </div>

          {/* Satırlar */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto" />
              <p className="text-slate-400 text-sm mt-4">Yükleniyor...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">👤</p>
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
            <div className="divide-y divide-slate-800">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_140px_1fr_80px] gap-4 px-4 py-3.5 hover:bg-slate-800/40 transition-colors items-center"
                >
                  {/* İsim */}
                  <div>
                    <p className="text-white font-semibold text-sm">{c.full_name}</p>
                    {c.created_at && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {new Date(c.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>

                  {/* Telefon */}
                  <p className="text-slate-300 text-sm font-mono">{c.phone || '—'}</p>

                  {/* Adres */}
                  <p className="text-slate-400 text-sm truncate" title={c.address}>{c.address || '—'}</p>

                  {/* Aksiyonlar */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Düzenle */}
                    <button
                      onClick={() => { setEditingCustomer(c); setShowModal(true) }}
                      title="Düzenle"
                      className="p-2 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Sil */}
                    <button
                      onClick={() => setDeleteConfirm(c)}
                      title="Sil"
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sonuç sayısı */}
        {search && filtered.length > 0 && (
          <p className="text-slate-500 text-xs mt-3 text-center">
            {filtered.length} / {customers.length} müşteri gösteriliyor
          </p>
        )}
      </div>

      {/* Ekle / Düzenle Modal */}
      {showModal && (
        <CustomerFormModal
          customer={editingCustomer}
          restaurantId={restaurantId}
          onClose={() => { setShowModal(false); setEditingCustomer(null) }}
          onSaved={() => {
            fetchCustomers(restaurantId)   // restaurantId parametreli çağrı
            showToast(editingCustomer ? '✅ Müşteri güncellendi' : '✅ Müşteri eklendi')
          }}
        />
      )}

      {/* Silme Onay Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6">
            <div className="text-center mb-5">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-lg font-bold text-white mb-2">Müşteri Silinecek</h3>
              <p className="text-slate-400 text-sm">
                <span className="text-white font-semibold">{deleteConfirm.full_name}</span> adlı müşteriyi
                silmek istediğinize emin misiniz?
              </p>
              <p className="text-red-400 text-xs mt-2">Bu işlem geri alınamaz.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {deleting ? '⏳ Siliniyor...' : '🗑️ Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
