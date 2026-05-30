/**
 * @file src/app/admin/components/modals/EndOfDayModalNew.tsx
 * @description Kurye Gün Sonu Mutabakatı — BUSINESS DARK THEME
 * 
 * KURALLAR (DEĞİŞMEDİ):
 * 1. Orijinal paket fiyatları ve statusları DEĞİŞMEZ
 * 2. Admin'in girdiği tutar courier_settlements tablosuna kaydedilir
 * 3. Eksik ödeme = Kalan borç devam eder
 * 4. Fazla ödeme = Bahşiş (kalan borç 0 olur)
 * 5. Tam ödeme = Kalan borç 0 olur
 * 
 * UI REFACTOR:
 * - bg-slate-950/900 Business Dark palette
 * - Wall Street finansal estetik
 * - Event bubbling proof X butonu
 * - NET HESAP kartı (emerald zafer rengi)
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Courier {
  id: string
  full_name?: string
  package_rate?: number
}

interface EndOfDayModalNewProps {
  show: boolean
  onClose: () => void
  courier: Courier
  startDate: string
  endDate: string
  onSuccess: () => void
}

export function EndOfDayModalNew({
  show,
  onClose,
  courier,
  startDate,
  endDate,
  onSuccess
}: EndOfDayModalNewProps) {
  const [cashTotal, setCashTotal] = useState(0)
  const [cardTotal, setCardTotal] = useState(0)
  const [ibanTotal, setIbanTotal] = useState(0)
  const [deliveryCount, setDeliveryCount] = useState(0)
  const [previousSettlements, setPreviousSettlements] = useState(0)
  const [amountReceived, setAmountReceived] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [notes, setNotes] = useState('')

  // ═══ VERİ ÇEKME (MANTIK DEĞİŞMEDİ) ═══
  const calculateTotals = async () => {
    try {
      if (!courier?.id) {
        console.error('❌ Kurye ID bulunamadı')
        return
      }
      setLoading(true)

      let startIso = ''
      let endIso = ''

      if (startDate) {
        const start = new Date(startDate)
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0)
          startIso = start.toISOString()
        }
      }

      if (endDate) {
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999)
          endIso = end.toISOString()
        }
      }

      if (!startIso) startIso = startDate
      if (!endIso) endIso = endDate

      // 1. GÖRSEL DEĞERLER — Tarih aralığına göre, sadece parası kuryeye ödenmemiş olanlar
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('amount, payment_method')
        .eq('delivered_by_courier_id', courier.id)  // ✅ Teslimatı yapan kurye
        .eq('status', 'delivered')
        .eq('is_paid_to_courier', false)           // ✅ Sadece ödenmemiş paketler
        .gte('delivered_at', startIso)
        .lte('delivered_at', endIso)

      if (packagesError) throw packagesError

      const pkgs = packages || []
      setDeliveryCount(pkgs.length)

      const cash = pkgs
        .filter(p => p.payment_method === 'cash')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      const card = pkgs
        .filter(p => p.payment_method === 'card')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      const iban = pkgs
        .filter(p => p.payment_method === 'iban')
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      setCashTotal(cash)
      setCardTotal(card)
      setIbanTotal(iban)

      // 2. Seçili tarih aralığındaki ödemeler
      const { data: settlements, error: settlementsError } = await supabase
        .from('courier_settlements')
        .select('amount_paid')
        .eq('courier_id', courier.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      if (settlementsError) throw settlementsError

      const totalPaid = (settlements || []).reduce((sum, s) => sum + (s.amount_paid || 0), 0)
      setPreviousSettlements(totalPaid)
    } catch (error) {
      console.error('❌ Hesaplama hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) calculateTotals()
  }, [show, courier.id, startDate, endDate])

  // ═══ KAYDET (MANTIK DEĞİŞMEDİ) ═══
  const handleSubmit = async () => {
    try {
      setProcessing(true)
      const received = parseFloat(amountReceived)
      if (isNaN(received) || received <= 0) {
        alert('Geçerli bir tutar girin')
        return
      }

      const { error } = await supabase
        .from('courier_settlements')
        .insert({
          courier_id: courier.id,
          start_date: startDate,
          end_date: endDate,
          amount_paid: received,
          notes: notes || null,
          created_by: 'admin'
        })

      if (error) throw error

      const newTotalPaid = previousSettlements + received
      setPreviousSettlements(newTotalPaid)
      setAmountReceived('')
      setNotes('')

      onSuccess()
      setTimeout(() => onClose(), 500)
    } catch (error: any) {
      console.error('❌ Kayıt hatası:', error)
      alert('Hata: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (!show) return null

  // 🔥 KUTSAL TOPLAM: Nakit + Kart + IBAN (anlık derived — state bug'ını önler)
  const totalCollection = Number(cashTotal || 0) + Number(cardTotal || 0) + Number(ibanTotal || 0)
  const totalDebt = Math.max(
    0,
    totalCollection - Number(previousSettlements || 0)
  )
  const received = parseFloat(amountReceived) || 0
  const difference = received - totalDebt
  const courierEarnings = (courier.package_rate || 0) * deliveryCount
  const mustHandOver = totalCollection
  const hesaplananBorc = Math.max(
    0,
    Number(cashTotal || 0) + Number(cardTotal || 0) + Number(ibanTotal || 0) - Number(parseFloat(amountReceived) || 0)
  )

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-xl w-full max-h-[92vh] overflow-hidden">
        
        {/* ═══ HEADER ═══ */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              Gün Sonu Mutabakatı
            </h2>
            <p className="text-xs text-slate-500 tracking-tight mt-0.5">
              {courier.full_name} · {startDate} — {endDate}
            </p>
          </div>
          {/* X Butonu — Event Bubbling Proof */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="text-slate-500 hover:text-slate-200 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-72px)] bg-slate-950">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-600 tracking-tight">Hesaplanıyor...</p>
            </div>
          ) : deliveryCount === 0 ? (
            <div className="space-y-5 py-6">
              <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-5 text-center">
                <span className="text-2xl block mb-2">ℹ️</span>
                <p className="text-sm font-bold text-amber-400 tracking-tight">Ödenecek bakiye bulunamadı</p>
                <p className="text-xs text-slate-400 mt-1">Bu tarih aralığındaki tüm teslimatlar zaten kuryeye ödenmiş veya teslim edilmemiş.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onClose()
                  }}
                  className="w-full px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-xs font-medium border border-slate-800 transition-colors tracking-tight"
                >
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ─── BÖLÜM 1: TAHSİLAT BİLGİLERİ ─── */}
              <div className="mb-5">
                <div className="text-[10px] text-slate-600 tracking-tight uppercase mb-2 font-medium">Tahsilat Bilgileri</div>
                <div className="space-y-1.5">
                  <div className="bg-slate-900 border border-slate-800 rounded p-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500 tracking-tight">Nakit Toplam</span>
                    <span className="text-lg font-bold text-emerald-500 tracking-tight">{cashTotal.toFixed(2)}₺</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500 tracking-tight">Kart Toplam</span>
                    <span className="text-lg font-bold text-orange-400 tracking-tight">{cardTotal.toFixed(2)}₺</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500 tracking-tight">IBAN Toplam</span>
                    <span className="text-lg font-bold text-blue-400 tracking-tight">{ibanTotal.toFixed(2)}₺</span>
                  </div>
                </div>
              </div>

              {/* ─── BÖLÜM 2: KURYE PERFORMANSI ─── */}
              <div className="mb-5">
                <div className="text-[10px] text-slate-600 tracking-tight uppercase mb-2 font-medium">Kurye Performansı</div>
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-slate-500 tracking-tight">Attığı Paket</span>
                    <span className="text-xl font-bold text-slate-100 tracking-tight">{deliveryCount}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500 tracking-tight">Kurye Kazancı</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {courier.package_rate
                          ? `${deliveryCount} × ${courier.package_rate}₺`
                          : 'Paket ücreti belirlenmedi'
                        }
                      </div>
                    </div>
                    <span className="text-xl font-bold text-emerald-500 tracking-tight">{courierEarnings.toFixed(0)}₺</span>
                  </div>
                </div>
                {/* Bilgi notu */}
                <div className="mt-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded">
                  <p className="text-[10px] text-slate-500 tracking-tight">Hakediş toplamdan düşülmez, ayrıca ödenir</p>
                </div>
              </div>

              {/* ─── UYARI ─── */}
              <div className="bg-amber-900/20 border border-amber-700/40 rounded p-3 mb-5">
                <p className="text-xs font-bold text-amber-400 tracking-tight text-center">
                  ⚠️ NAKİT + KART + IBAN = TOPLAM TAHSİLAT, HAKEDİŞ AYRICA ÖDENİR
                </p>
              </div>

              {/* ─── CARİ BORÇ (TOPLAM) ─── */}
              <div className="bg-rose-900/20 border border-rose-800/40 rounded-lg p-4 mb-5">
                <div className="text-[10px] text-rose-400 tracking-tight uppercase mb-2 font-medium">Toplam Kalan Borç</div>
                <div className="text-3xl font-black text-rose-400 tracking-tight mb-1">
                  {hesaplananBorc.toFixed(2)}₺
                </div>
                <div className="text-[10px] text-rose-500/60 tracking-tight">
                  Nakit + Kart + IBAN - Ödemeler
                </div>
              </div>

              {/* ─── INPUT: ALINAN TUTAR ─── */}
              <div className="mb-4">
                <label className="block text-xs text-slate-400 tracking-tight mb-1.5 font-medium uppercase">
                  Kuryeden Alınan Tutar
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={`${totalDebt.toFixed(2)}`}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded text-lg font-bold text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors tracking-tight"
                />
              </div>

              {/* ─── INPUT: NOT ─── */}
              <div className="mb-5">
                <label className="block text-xs text-slate-400 tracking-tight mb-1.5 font-medium uppercase">
                  Not (Opsiyonel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eksik ödeme, sonraki güne devredildi..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors tracking-tight resize-none"
                />
              </div>

              {/* ─── FARK HESAPLAMA ─── */}
              {amountReceived && !isNaN(parseFloat(amountReceived)) && (
                <div className="mb-5">
                  {difference < 0 ? (
                    <div className="bg-rose-900/20 border border-rose-800/40 rounded p-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-rose-400 font-medium tracking-tight">EKSİK ÖDEME</div>
                        <div className="text-[10px] text-rose-500/60 mt-0.5">Borç olarak devam edecek</div>
                      </div>
                      <div className="text-xl font-black text-rose-500 tracking-tight">
                        {Math.abs(difference).toFixed(2)}₺
                      </div>
                    </div>
                  ) : difference > 0 ? (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded p-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-emerald-400 font-medium tracking-tight">FAZLA ÖDEME</div>
                        <div className="text-[10px] text-emerald-500/60 mt-0.5">Borç sıfırlanacak</div>
                      </div>
                      <div className="text-xl font-black text-emerald-500 tracking-tight">
                        +{difference.toFixed(2)}₺
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded p-3 text-center">
                      <div className="text-sm font-bold text-emerald-400 tracking-tight">TAM ÖDEME</div>
                      <div className="text-[10px] text-emerald-500/60 mt-0.5">Hesap tam kapanacak</div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── BUTONLAR ─── */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onClose()
                  }}
                  disabled={processing}
                  className="flex-1 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-xs font-medium border border-slate-800 transition-colors tracking-tight disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={processing || !amountReceived}
                  className="flex-1 px-3 py-2.5 bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-300 rounded text-xs font-medium border border-emerald-800/50 transition-colors tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                      Kaydediliyor...
                    </span>
                  ) : (
                    'Mutabakatı Kaydet'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
