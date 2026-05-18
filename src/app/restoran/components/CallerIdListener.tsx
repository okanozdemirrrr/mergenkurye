'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/app/lib/supabase'
import { useRestoran } from '../RestoranProvider'
import { Customer } from '@/types'

/**
 * Telefon numarasını +90 505 059 16 29 formatında maskeler
 */
function maskPhoneNumber(phone: string) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  // Eğer 12 hane ise (90505...)
  if (cleaned.length === 12 && cleaned.startsWith('90')) {
    return `+90 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`
  }
  // Eğer 10 hane ise (505...)
  if (cleaned.length === 10) {
    return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`
  }
  return phone
}

export default function CallerIdListener() {
  const { restaurantId, setShowNewOrderModal, setCidCustomer } = useRestoran()
  
  // Modal ve Arama State'leri
  const [activeCall, setActiveCall] = useState<{ phone: string; id: string } | null>(null)
  const [customerInfo, setCustomerInfo] = useState<Customer | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', address: '' })
  
  const lastCallId = useRef<string | null>(null)

  // 1. Supabase Realtime Dinlemesi
  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase
      .channel(`cid-system-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incoming_calls',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload) => {
          const newCall = payload.new
          if (!newCall || !newCall.phone_number) return
          if (lastCallId.current === newCall.id) return
          lastCallId.current = newCall.id

          // Arama düştü, müşteriyi ara
          handleIncomingCall(newCall.phone_number, newCall.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  const handleIncomingCall = async (phone: string, callId: string) => {
    // Müşteriyi ara
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId!)
      .eq('phone', phone)
      .single()

    setCustomerInfo(customer || null)
    setActiveCall({ phone, id: callId })
    setShowSaveForm(false)
    setNewCustomerForm({ name: '', address: '' })
  }

  const closeIncomingModal = () => {
    setActiveCall(null)
    setCustomerInfo(null)
    setShowSaveForm(false)
  }

  // SENARYO A & B: Sipariş Oluşturma
  const handleCreateOrder = (customerData?: Customer) => {
    if (customerData) {
      setCidCustomer(customerData)
    } else {
      setCidCustomer(null) // Kaydetmeden devam eden durum
    }
    setShowNewOrderModal(true)
    closeIncomingModal()
  }

  // SENARYO B: Yeni Müşteri Kaydet ve Siparişe Geç
  const handleSaveAndOrder = async () => {
    if (!newCustomerForm.name || !newCustomerForm.address || !activeCall) return
    
    setIsSaving(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          full_name: newCustomerForm.name,
          phone: activeCall.phone,
          address: newCustomerForm.address,
          restaurant_id: restaurantId!
        }])
        .select()
        .single()

      if (error) throw error

      // Başarılıysa siparişe geç
      handleCreateOrder(data as Customer)
    } catch (err: any) {
      alert('Müşteri kaydedilirken hata oluştu: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {activeCall && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeIncomingModal}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header Animasyonu (Radar Efekti) */}
            <div className="bg-orange-600 p-8 text-center relative overflow-hidden">
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-white rounded-full scale-0"
              />
              <div className="relative z-10">
                <div className="text-5xl mb-4">📞</div>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                  {customerInfo ? 'Kayıtlı Müşteri Arıyor' : 'Bilinmeyen Numara Arıyor'}
                </h2>
              </div>
            </div>

            <div className="p-8">
              {/* Numara Gösterimi */}
              <div className="text-center mb-8">
                <div className="text-sm text-slate-400 font-bold mb-1">TELEFON NUMARASI</div>
                <div className="text-3xl font-mono font-bold text-orange-500 tracking-wider">
                  {maskPhoneNumber(activeCall.phone)}
                </div>
              </div>

              {/* Senaryo A: Kayıtlı Müşteri Detayları */}
              {customerInfo && (
                <div className="space-y-6">
                  <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl mt-1">👤</div>
                      <div>
                        <div className="text-sm text-slate-400">Müşteri Adı</div>
                        <div className="text-xl font-bold text-white">{customerInfo.full_name}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start gap-4">
                      <div className="text-2xl mt-1">📍</div>
                      <div>
                        <div className="text-sm text-slate-400">Teslimat Adresi</div>
                        <div className="text-sm font-medium text-slate-300 leading-relaxed">
                          {customerInfo.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleCreateOrder(customerInfo)}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-600/20"
                    >
                      🛒 SİPARİŞİ OLUŞTUR
                    </button>
                    <button
                      onClick={closeIncomingModal}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              )}

              {/* Senaryo B: Kayıtlı Değilse */}
              {!customerInfo && !showSaveForm && (
                <div className="text-center space-y-6">
                  <p className="text-slate-300 text-lg">
                    Bu numara sistemde kayıtlı değil. Ne yapmak istersiniz?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setShowSaveForm(true)}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg transition-all"
                    >
                      ➕ MÜŞTERİYİ KAYDET
                    </button>
                    <button
                      onClick={() => handleCreateOrder()}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold"
                    >
                      ⏩ KAYDETMEDEN DEVAM ET
                    </button>
                    <button
                      onClick={closeIncomingModal}
                      className="text-slate-500 hover:text-slate-400 font-medium pt-2"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}

              {/* Senaryo B: Kayıt Formu */}
              {showSaveForm && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Müşteri Adı Soyadı</label>
                      <input
                        type="text"
                        autoFocus
                        value={newCustomerForm.name}
                        onChange={e => setNewCustomerForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Açık Adres</label>
                      <textarea
                        rows={3}
                        value={newCustomerForm.address}
                        onChange={e => setNewCustomerForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="Mahalle, Sokak, No..."
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-colors"
                    >
                      Geri
                    </button>
                    <button
                      onClick={handleSaveAndOrder}
                      disabled={isSaving || !newCustomerForm.name || !newCustomerForm.address}
                      className="flex-[2] py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-green-600/20"
                    >
                      {isSaving ? '⏳ KAYDEDİLİYOR...' : '✅ KAYDET VE DEVAM'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
