/**
 * @file src/app/admin/components/modals/EndOfDayModalNew.tsx
 * @description YENİ Kurye Gün Sonu Mutabakatı Modalı
 * 
 * ÖNEMLİ KURALLAR:
 * 1. Orijinal paket fiyatları ve statusları DEĞİŞMEZ
 * 2. Admin'in girdiği tutar courier_settlements tablosuna kaydedilir
 * 3. Eksik ödeme = Kalan borç devam eder
 * 4. Fazla ödeme = Bahşiş (kalan borç 0 olur)
 * 5. Tam ödeme = Kalan borç 0 olur
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Courier {
  id: string
  full_name?: string
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
  const [totalDeliveries, setTotalDeliveries] = useState(0)
  const [previousSettlements, setPreviousSettlements] = useState(0)
  const [remainingDebt, setRemainingDebt] = useState(0)
  const [amountReceived, setAmountReceived] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [notes, setNotes] = useState('')

  // Teslim edilen paketlerin toplamını hesapla
  const calculateTotals = async () => {
    try {
      setLoading(true)

      // 1. GÖRSEL DEĞERLER (Nakit/Kart/IBAN) - Tarih aralığına göre
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('amount, payment_method')
        .eq('courier_id', courier.id)
        .eq('status', 'delivered')
        .gte('delivered_at', `${startDate}T00:00:00`)
        .lte('delivered_at', `${endDate}T23:59:59`)

      if (packagesError) throw packagesError

      const pkgs = packages || []

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

      // 2. FİNANSAL HESAPLAMA - Tüm geçmiş (startDate KULLANILMAZ!)
      // Toplam Borç = Başlangıçtan endDate'e kadar TÜM teslimatlar
      const { data: allPackages, error: allPackagesError } = await supabase
        .from('packages')
        .select('amount')
        .eq('courier_id', courier.id)
        .eq('status', 'delivered')
        .lte('delivered_at', `${endDate}T23:59:59`) // Sadece endDate!

      if (allPackagesError) throw allPackagesError

      const totalOwed = (allPackages || []).reduce((sum, p) => sum + (p.amount || 0), 0)
      setTotalDeliveries(totalOwed)

      // 3. Toplam Ödeme = Başlangıçtan endDate'e kadar TÜM ödemeler
      const { data: settlements, error: settlementsError } = await supabase
        .from('courier_settlements')
        .select('amount_paid')
        .eq('courier_id', courier.id)
        .lte('created_at', `${endDate}T23:59:59`) // Sadece endDate!

      if (settlementsError) throw settlementsError

      const previousPaid = (settlements || []).reduce((sum, s) => sum + (s.amount_paid || 0), 0)
      setPreviousSettlements(previousPaid)

      // 4. Kalan Borç = Toplam Borç - Toplam Ödeme (CARİ HESAP)
      const debt = Math.max(0, totalOwed - previousPaid)
      setRemainingDebt(debt)

    } catch (error) {
      console.error('❌ Hesaplama hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) {
      calculateTotals()
    }
  }, [show, courier.id, startDate, endDate])

  const handleSubmit = async () => {
    try {
      setProcessing(true)

      const received = parseFloat(amountReceived)
      if (isNaN(received) || received <= 0) {
        alert('❌ Geçerli bir tutar girin')
        return
      }

      // courier_settlements tablosuna kaydet
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

      // ✅ BAŞARILI - State'i güncelle
      // Yeni ödemeyi önceki ödemelere ekle
      const newTotalPaid = previousSettlements + received
      setPreviousSettlements(newTotalPaid)
      
      // Kalan borcu yeniden hesapla
      const newRemainingDebt = Math.max(0, totalDeliveries - newTotalPaid)
      setRemainingDebt(newRemainingDebt)
      
      // Input'u temizle
      setAmountReceived('')
      setNotes('')

      alert('✅ Gün sonu mutabakatı başarıyla kaydedildi!')
      
      // Parent component'i bilgilendir (liste yenilensin)
      onSuccess()
      
      // Modal'ı kapat
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error: any) {
      console.error('❌ Kayıt hatası:', error)
      alert('❌ Hata: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (!show) return null

  const received = parseFloat(amountReceived) || 0
  const difference = received - remainingDebt

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900">
            💰 Gün Sonu Mutabakatı - {courier.full_name ?? 'Kurye'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {startDate} - {endDate}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500">Hesaplanıyor...</p>
            </div>
          ) : (
            <>
              {/* Teslimat Toplamları (DEĞİŞMEZ) */}
              <div className="mb-6 space-y-3">
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">
                      💵 Nakit Toplam
                    </span>
                    <span className="text-2xl font-bold text-green-700">
                      {cashTotal.toFixed(2)} ₺
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    ℹ️ Bu değer değişmez (bilgi amaçlı)
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-700">
                      💳 Kart Toplam
                    </span>
                    <span className="text-2xl font-bold text-blue-700">
                      {cardTotal.toFixed(2)} ₺
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    ℹ️ Bu değer değişmez (bilgi amaçlı)
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-700">
                      🏦 IBAN Toplam
                    </span>
                    <span className="text-2xl font-bold text-orange-700">
                      {ibanTotal.toFixed(2)} ₺
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    ℹ️ Bu değer değişmez (bilgi amaçlı)
                  </p>
                </div>

                {/* Kalan Borç */}
                <div className="bg-red-50 p-4 rounded-xl border-2 border-red-300">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-red-700">
                      💰 KALAN BORÇ
                    </span>
                    <span className="text-3xl font-black text-red-700">
                      {remainingDebt.toFixed(2)} ₺
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    Kuryeden alınması gereken tutar
                  </p>
                </div>
              </div>

              {/* Alınan Tutar Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  💰 Kuryeden Alınan Tutar
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={`Örn: ${remainingDebt.toFixed(2)}`}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Not Alanı */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  📝 Not (Opsiyonel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: Eksik ödeme, sonraki güne devredildi"
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Fark Hesaplama */}
              {amountReceived && !isNaN(parseFloat(amountReceived)) && (
                <div className="mb-6">
                  {difference < 0 ? (
                    <div className="bg-red-50 p-4 rounded-xl border-2 border-red-300">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-red-700">
                          ⚠️ EKSİK ÖDEME
                        </span>
                        <span className="text-3xl font-black text-red-700">
                          {Math.abs(difference).toFixed(2)} ₺
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-2">
                        Bu miktar kalan borç olarak devam edecek
                      </p>
                    </div>
                  ) : difference > 0 ? (
                    <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-green-700">
                          ✅ BAHŞİŞ
                        </span>
                        <span className="text-3xl font-black text-green-700">
                          {difference.toFixed(2)} ₺
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        Kurye fazla para getirdi (kalan borç 0 olacak)
                      </p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-300">
                      <div className="text-center">
                        <span className="text-2xl font-black text-orange-700">
                          ✓ TAM ÖDEME
                        </span>
                        <p className="text-xs text-orange-600 mt-2">
                          Hesap tam olarak kapandı
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={processing || !amountReceived}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Kaydediliyor...
                    </span>
                  ) : (
                    '✓ Mutabakatı Kaydet'
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
