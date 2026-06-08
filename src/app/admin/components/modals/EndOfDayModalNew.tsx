/**
 * @file src/app/admin/components/modals/EndOfDayModalNew.tsx
 * @description Kurye Gün Sonu Mutabakatı — Ledger (courier_settlement_id)
 */
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  fetchCourierLedgerPeriodAccount,
} from '@/utils/courierLedger'

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
  onSuccess,
}: EndOfDayModalNewProps) {
  const [cashTotal, setCashTotal] = useState(0)
  const [cardTotal, setCardTotal] = useState(0)
  const [ibanTotal, setIbanTotal] = useState(0)
  const [deliveryCount, setDeliveryCount] = useState(0)
  const [amountReceived, setAmountReceived] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [notes, setNotes] = useState('')

  const loadLedger = async () => {
    if (!courier?.id) {
      throw new Error('Kurye ID bulunamadı')
    }
    setLoading(true)
    if (!startDate?.trim() || !endDate?.trim()) {
      throw new Error('Mutabakat için tarih aralığı seçin')
    }

    const account = await fetchCourierLedgerPeriodAccount(
      supabase,
      courier.id,
      startDate,
      endDate,
      courier.package_rate ?? 0
    )
    setDeliveryCount(account.count)
    setCashTotal(account.cash)
    setCardTotal(account.card)
    setIbanTotal(account.iban)
    const total = account.payableDebt
    setAmountReceived(total > 0 ? total.toFixed(2) : '')
    setLoading(false)
  }

  useEffect(() => {
    if (!show) return
    setAmountReceived('')
    setNotes('')
    loadLedger().catch((err) => {
      console.error(err)
      alert(err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
  }, [show, courier.id, courier.package_rate, startDate, endDate])

  const handleSubmit = async () => {
    setProcessing(true)
    try {
      if (!courier?.id) {
        throw new Error('Kaydetme Başarısız: Kurye ID bulunamadı')
      }

      const confirmed = window.confirm('Tahsilatı onaylıyor musunuz?')
      if (!confirmed) return

      const { data, error } = await supabase.rpc(
        'process_courier_settlement_flags',
        {
          p_courier_id: courier.id,
          p_created_by: 'admin',
          p_notes: notes || null,
        }
      )

      if (error) {
        throw new Error(`Mutabakat RPC hatası: ${error.message}`)
      }

      const result = data as
        | {
            success?: boolean
            settlement_id?: string
            package_count?: number
            total_amount?: number
            error?: string
          }
        | null

      if (!result?.success) {
        throw new Error(result?.error || 'Mutabakat işlemi başarısız')
      }

      const settlementId = result.settlement_id || '—'
      const packagesMarked = Number(result.package_count || 0)
      const totalAmount = Number(result.total_amount || 0)

      alert(
        `Mutabakat kaydedildi.\nMakbuz: ${settlementId}\nİşaretlenen paket: ${packagesMarked}\nTahsil edilen: ${totalAmount.toFixed(2)} ₺`
      )
      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error(error)
      const message =
        error instanceof Error ? error.message : String(error)
      alert(message)
    } finally {
      setProcessing(false)
    }
  }

  if (!show) return null

  const totalCollection = cashTotal + cardTotal + ibanTotal
  const received = parseFloat(amountReceived) || 0
  const totalDebt = totalCollection
  const difference = received - totalDebt
  const courierEarnings = (courier.package_rate || 0) * deliveryCount
  const hesaplananBorc = Math.max(0, totalDebt - received)
  const isFullySettled = deliveryCount === 0

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-xl w-full max-h-[92vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              Gün Sonu Mutabakatı
            </h2>
            <p className="text-xs text-slate-500 tracking-tight mt-0.5">
              {courier.full_name} · {startDate} — {endDate}
            </p>
          </div>
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

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-72px)] bg-slate-950">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-600 tracking-tight">Hesaplanıyor...</p>
            </div>
          ) : isFullySettled ? (
            <div className="space-y-5 py-6">
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg p-5 text-center">
                <span className="text-2xl block mb-2">✅</span>
                <p className="text-sm font-bold text-emerald-400 tracking-tight">
                  Açık cari yok
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tüm teslimler mutabakata bağlanmış.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-xs font-medium border border-slate-800"
              >
                Kapat
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <div className="text-[10px] text-slate-600 tracking-tight uppercase mb-2 font-medium">Tahsilat Bilgileri (seçili dönem, mutabakat bekleyen)</div>
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
                          : 'Paket ücreti belirlenmedi'}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-emerald-500 tracking-tight">{courierEarnings.toFixed(0)}₺</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-900/20 border border-amber-700/40 rounded p-3 mb-5">
                <p className="text-xs font-bold text-amber-400 tracking-tight text-center">
                  ⚠️ NAKİT + KART + IBAN = TOPLAM TAHSİLAT, HAKEDİŞ AYRICA ÖDENİR
                </p>
              </div>

              <div className="bg-rose-900/20 border border-rose-800/40 rounded-lg p-4 mb-5">
                <div className="text-[10px] text-rose-400 tracking-tight uppercase mb-2 font-medium">Toplam Kalan Borç</div>
                <div className="text-3xl font-black text-rose-400 tracking-tight mb-1">
                  {hesaplananBorc.toFixed(2)}₺
                </div>
                <div className="text-[10px] text-rose-500/60 tracking-tight">
                  Seçili dönemdeki açık paketlerin tahsilat toplamı
                </div>
              </div>

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

              <div className="mb-5">
                <label className="block text-xs text-slate-400 tracking-tight mb-1.5 font-medium uppercase">
                  Not (Opsiyonel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eksik ödeme notu..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-emerald-500 transition-colors tracking-tight resize-none"
                />
              </div>

              {amountReceived && !isNaN(parseFloat(amountReceived)) && (
                <div className="mb-5">
                  {difference < 0 ? (
                    <div className="bg-rose-900/20 border border-rose-800/40 rounded p-3 flex justify-between items-center">
                      <span className="text-xs text-rose-400 font-medium">EKSİK ÖDEME</span>
                      <span className="text-xl font-black text-rose-500">{Math.abs(difference).toFixed(2)}₺</span>
                    </div>
                  ) : difference > 0 ? (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded p-3 flex justify-between items-center">
                      <span className="text-xs text-emerald-400 font-medium">FAZLA ÖDEME</span>
                      <span className="text-xl font-black text-emerald-500">+{difference.toFixed(2)}₺</span>
                    </div>
                  ) : (
                    <div className="bg-emerald-900/20 border border-emerald-800/40 rounded p-3 text-center text-sm font-bold text-emerald-400">
                      TAM ÖDEME
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={processing}
                  className="flex-1 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-xs font-medium border border-slate-800 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={processing || !amountReceived}
                  className="flex-1 px-3 py-2.5 bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-300 rounded text-xs font-medium border border-emerald-800/50 disabled:opacity-50"
                >
                  {processing ? 'Kaydediliyor...' : 'Mutabakatı Kaydet'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
