'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, Courier, CourierDebt } from '@/types'
import { formatTurkishTime, calculateDeliveryDuration } from '@/utils/dateHelpers'
import { CourierPaymentSettingsModal } from './CourierPaymentSettingsModal'
import { supabase } from '@/app/lib/supabase'

interface CourierDetailModalProps {
  show: boolean
  onClose: () => void
  courier: Courier | undefined
  selectedCourierId: string | null
  courierDebts: CourierDebt[]
  getPlatformBadgeClass: (platform: string) => string
  getPlatformDisplayName: (platform: string) => string
}

function normalizePackages(data: any[] | null): Package[] {
  return (data || []).map((pkg: any) => ({
    ...pkg,
    restaurant:
      Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0
        ? pkg.restaurants[0]
        : pkg.restaurants || null,
    restaurants: undefined,
  }))
}

export function CourierDetailModal({
  show,
  onClose,
  courier,
  selectedCourierId,
  courierDebts,
  getPlatformBadgeClass,
  getPlatformDisplayName,
}: CourierDetailModalProps) {
  const [earningsMode, setEarningsMode] = useState(false)
  const [showPaymentSettings, setShowPaymentSettings] = useState(false)
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false)

  const [openSettlementPackages, setOpenSettlementPackages] = useState<Package[]>([])
  const [unpaidEarningsPackages, setUnpaidEarningsPackages] = useState<Package[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [processingSettlement, setProcessingSettlement] = useState(false)
  const [processingEarningsPayment, setProcessingEarningsPayment] = useState(false)

  const fetchSettlementPackages = useCallback(async () => {
    if (!selectedCourierId) return
    const { data, error } = await supabase
      .from('packages')
      .select('*, restaurants(*)')
      .eq('status', 'delivered')
      .eq('delivered_by_courier_id', selectedCourierId)
      .or('is_courier_settled.is.null,is_courier_settled.eq.false')
      .order('delivered_at', { ascending: false })

    if (error) throw error
    setOpenSettlementPackages(normalizePackages(data))
  }, [selectedCourierId])

  const fetchUnpaidEarningsPackages = useCallback(async () => {
    if (!selectedCourierId) return
    const { data, error } = await supabase
      .from('packages')
      .select('*, restaurants(*)')
      .eq('status', 'delivered')
      .eq('delivered_by_courier_id', selectedCourierId)
      .or('is_courier_earned_paid.is.null,is_courier_earned_paid.eq.false')
      .order('delivered_at', { ascending: false })

    if (error) throw error
    setUnpaidEarningsPackages(normalizePackages(data))
  }, [selectedCourierId])

  const fetchActiveList = useCallback(async () => {
    if (!show || !selectedCourierId) return
    setLoadingPackages(true)
    try {
      if (earningsMode) {
        await fetchUnpaidEarningsPackages()
      } else {
        await fetchSettlementPackages()
      }
    } catch (err) {
      console.error('Kurye paketleri yüklenemedi:', err)
    } finally {
      setLoadingPackages(false)
    }
  }, [earningsMode, fetchSettlementPackages, fetchUnpaidEarningsPackages, selectedCourierId, show])

  useEffect(() => {
    void fetchActiveList()
  }, [fetchActiveList])

  const settlementSummary = useMemo(() => {
    const cash = openSettlementPackages
      .filter((p) => p.payment_method === 'cash')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const card = openSettlementPackages
      .filter((p) => p.payment_method === 'card')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const iban = openSettlementPackages
      .filter((p) => p.payment_method === 'iban')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const grandTotal = cash + card + iban

    return {
      cashTotal: cash,
      cardTotal: card,
      ibanTotal: iban,
      grandTotal,
      packageCount: openSettlementPackages.length,
    }
  }, [openSettlementPackages])

  const earningsPackageCount = unpaidEarningsPackages.length
  const packageRate = Number(courier?.package_rate || 0)
  const earningsAmount = earningsPackageCount * packageRate
  const personalDebt = courierDebts.reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0)

  const handleGunSonuAl = async () => {
    if (!selectedCourierId || !courier) return
    if (openSettlementPackages.length === 0) {
      alert('Açık hesapta bekleyen paket yok.')
      return
    }

    const confirmed = window.confirm(
      `${openSettlementPackages.length} paket için tahsilat kapatılacak. Onaylıyor musunuz?`
    )
    if (!confirmed) return

    setProcessingSettlement(true)
    try {
      const packageIds = openSettlementPackages.map((p) => p.id).filter(Boolean)
      const deliveredAtList = openSettlementPackages
        .map((p) => p.delivered_at)
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

      const minDeliveredAt = deliveredAtList[0] || new Date().toISOString()
      const maxDeliveredAt =
        deliveredAtList[deliveredAtList.length - 1] || new Date().toISOString()

      const { error: updateError } = await supabase
        .from('packages')
        .update({
          is_courier_settled: true,
          courier_settled_at: new Date().toISOString(),
        })
        .eq('status', 'delivered')
        .eq('delivered_by_courier_id', selectedCourierId)
        .or('is_courier_settled.is.null,is_courier_settled.eq.false')

      if (updateError) throw updateError

      const { error: insertError } = await supabase.from('courier_settlements').insert({
        courier_id: selectedCourierId,
        start_date: minDeliveredAt.split('T')[0],
        end_date: maxDeliveredAt.split('T')[0],
        amount_paid: settlementSummary.grandTotal,
        created_by: 'admin',
        notes: 'Admin modalinden flag bazli gun sonu alindi',
      })

      if (insertError) throw insertError

      await fetchSettlementPackages()
      alert(
        `Tahsilat kapatildi.\nPaket: ${packageIds.length}\nTutar: ${settlementSummary.grandTotal.toFixed(2)} ₺`
      )
    } catch (err: any) {
      console.error('Gün sonu alma hatası:', err)
      alert(`Gün sonu alma sırasında hata: ${err?.message || err}`)
    } finally {
      setProcessingSettlement(false)
    }
  }

  const handleHakedisOde = async () => {
    if (!selectedCourierId) return
    if (unpaidEarningsPackages.length === 0) {
      alert('Ödenmemiş hakediş paketi yok.')
      return
    }

    const confirmed = window.confirm(
      `${unpaidEarningsPackages.length} paket için hakediş odemesi kapatilacak. Onaylıyor musunuz?`
    )
    if (!confirmed) return

    setProcessingEarningsPayment(true)
    try {
      const packageIds = unpaidEarningsPackages.map((p) => p.id).filter(Boolean)
      const { error } = await supabase
        .from('packages')
        .update({ is_courier_earned_paid: true })
        .eq('status', 'delivered')
        .eq('delivered_by_courier_id', selectedCourierId)
        .or('is_courier_earned_paid.is.null,is_courier_earned_paid.eq.false')

      if (error) throw error

      await fetchUnpaidEarningsPackages()
      alert(
        `Hakediş ödendi olarak işaretlendi.\nPaket: ${packageIds.length}\nToplam: ${(
          packageIds.length * packageRate
        ).toFixed(2)} ₺`
      )
    } catch (err: any) {
      console.error('Hakediş ödeme hatası:', err)
      alert(`Hakediş ödeme sırasında hata: ${err?.message || err}`)
    } finally {
      setProcessingEarningsPayment(false)
    }
  }

  if (!show || !selectedCourierId || !courier) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-6xl w-full max-h-[92vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-4 flex-1 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">{courier.full_name}</h2>
              <p className="text-xs text-slate-500 tracking-tight">Detaylı Rapor</p>
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setEarningsMode(!earningsMode)}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors tracking-tight ${
                  earningsMode
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                    : 'bg-blue-900/20 text-blue-400 border-blue-800/40 hover:bg-blue-900/40'
                }`}
              >
                {earningsMode ? '← Tahsilat/Borç' : 'Kazanç'}
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentSettings(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium border border-slate-700 transition-colors tracking-tight"
              >
                Kazanç Ayarları
              </button>
              {!earningsMode && (
                <button
                  type="button"
                  onClick={handleGunSonuAl}
                  disabled={processingSettlement || openSettlementPackages.length === 0}
                  className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-300 rounded text-xs font-medium border border-emerald-800/50 transition-colors tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingSettlement ? 'İşleniyor...' : 'Gün Sonu Al'}
                </button>
              )}
              {earningsMode && (
                <button
                  type="button"
                  onClick={handleHakedisOde}
                  disabled={processingEarningsPayment || unpaidEarningsPackages.length === 0}
                  className="px-3 py-1.5 bg-orange-900/50 hover:bg-orange-900/70 text-orange-300 rounded text-xs font-medium border border-orange-700/50 transition-colors tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingEarningsPayment ? 'İşleniyor...' : 'Hakedişi Öde'}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="text-slate-500 hover:text-slate-200 text-xl ml-4 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-72px)] bg-slate-950">
          {earningsMode ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[10px] text-slate-600 tracking-tight uppercase font-medium mb-1">
                      ÖDENMEMİŞ PAKETLER
                    </div>
                    <div className="text-3xl font-black text-slate-100 tracking-tight">
                      {loadingPackages ? '...' : earningsPackageCount}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 tracking-tight">
                      Açık hesapta bekleyen paketler
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-600 tracking-tight uppercase font-medium mb-1">
                      TOPLAM HAKEDİŞ
                    </div>
                    <div className="text-3xl font-black text-emerald-500 tracking-tight">
                      {loadingPackages ? '...' : earningsAmount.toFixed(0)}₺
                    </div>
                    <div className="text-xs text-slate-500 mt-1 tracking-tight">
                      {earningsPackageCount} × {packageRate}₺
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 tracking-tight">Ödenmemiş Hakediş Paketleri</h3>
                </div>
                {loadingPackages ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-slate-600 tracking-tight">Yükleniyor...</p>
                  </div>
                ) : unpaidEarningsPackages.length === 0 ? (
                  <div className="text-center py-12 text-slate-600">
                    <div className="text-3xl mb-2 opacity-30">✅</div>
                    <p className="text-sm tracking-tight">Ödenmemiş hakediş paketi yok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Sipariş</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Tarih</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Restoran</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Müşteri</th>
                          <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unpaidEarningsPackages.map((pkg, i) => (
                          <tr
                            key={pkg.id}
                            className={`border-b border-slate-800/50 ${i % 2 === 0 ? 'bg-slate-900/30' : ''}`}
                          >
                            <td className="py-2 px-4 text-xs text-slate-200 tracking-tight">{pkg.order_number || '—'}</td>
                            <td className="py-2 px-4 text-xs text-slate-400 tracking-tight">{formatTurkishTime(pkg.delivered_at)}</td>
                            <td className="py-2 px-4 text-xs text-slate-400 tracking-tight">{pkg.restaurant?.name || '—'}</td>
                            <td className="py-2 px-4 text-xs text-slate-300 tracking-tight">{pkg.customer_name}</td>
                            <td className="py-2 px-4 text-right text-xs font-medium text-emerald-500 tracking-tight">{pkg.amount}₺</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div
                  onClick={() => setShowPaymentBreakdown(true)}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4 cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <div className="text-xs text-slate-500 tracking-tight mb-2">PAKET SAYISI</div>
                  <div className="text-2xl font-bold text-slate-100 tracking-tight">{settlementSummary.packageCount}</div>
                  <div className="text-xs text-slate-600 mt-1 tracking-tight">Açık hesapta bekleyen paketler</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 tracking-tight mb-2">HAKEDİŞ</div>
                  <div className="text-2xl font-bold text-emerald-500 tracking-tight">{earningsAmount.toFixed(0)}₺</div>
                  <div className="text-xs text-slate-600 mt-1 tracking-tight">
                    {packageRate > 0
                      ? `${earningsPackageCount} Paket × ${packageRate}₺`
                      : 'Paket başı ücret belirlenmedi'}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-500 tracking-tight mb-2">KASAYA BORÇ (TAHSİLAT)</div>
                  <div
                    className={`text-2xl font-bold tracking-tight ${
                      settlementSummary.grandTotal > 0 ? 'text-orange-500' : 'text-slate-500'
                    }`}
                  >
                    {settlementSummary.grandTotal.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    ₺
                  </div>
                  <div className="text-xs text-slate-600 mt-1 tracking-tight">
                    {settlementSummary.grandTotal > 0
                      ? `${settlementSummary.packageCount} paket · mutabakat bekliyor`
                      : 'Açık tahsilat yok'}
                    {personalDebt > 0 ? ` · Kişisel borç: ${personalDebt.toFixed(2)}₺` : ''}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                    Açık Hesapta Bekleyen Paketler
                  </h3>
                </div>

                {loadingPackages ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-slate-600 tracking-tight">Yükleniyor...</p>
                  </div>
                ) : openSettlementPackages.length === 0 ? (
                  <div className="text-center py-12 text-slate-600">
                    <div className="text-3xl mb-2 opacity-30">📦</div>
                    <p className="text-sm tracking-tight">Açık hesapta bekleyen paket yok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Sipariş</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Tarih</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Müşteri</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Restoran</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">İçerik</th>
                          <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Tutar</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Konum</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Ödeme</th>
                          <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500 tracking-tight">Süre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openSettlementPackages.map((order, index) => (
                          <tr
                            key={order.id}
                            className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                              index % 2 === 0 ? 'bg-slate-900/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-200 text-xs tracking-tight">
                                  {order.order_number || '......'}
                                </span>
                                {order.platform && (
                                  <span className={`text-[10px] py-0.5 px-1.5 rounded ${getPlatformBadgeClass(order.platform)}`}>
                                    {getPlatformDisplayName(order.platform)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="text-xs text-slate-300 tracking-tight">
                                {formatTurkishTime(order.delivered_at)}
                              </div>
                              <div className="text-[10px] text-slate-600">
                                {order.delivered_at
                                  ? new Date(order.delivered_at).toLocaleDateString('tr-TR')
                                  : '-'}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-300 tracking-tight">{order.customer_name}</td>
                            <td className="py-2.5 px-4">
                              <span className="text-xs text-slate-400 tracking-tight">{order.restaurant?.name || 'Bilinmeyen'}</span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="max-w-[120px] text-[11px] text-slate-500 truncate tracking-tight">{order.content || '—'}</div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="font-medium text-emerald-500 text-xs tracking-tight">{order.amount}₺</span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="max-w-[100px] text-[10px] text-slate-600 truncate">{order.delivery_address}</div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  order.payment_method === 'cash'
                                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                                    : order.payment_method === 'iban'
                                    ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                                    : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                                }`}
                              >
                                {order.payment_method === 'cash'
                                  ? 'Nakit'
                                  : order.payment_method === 'iban'
                                  ? 'IBAN'
                                  : 'Kart'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="text-xs text-slate-400 tracking-tight">
                                {calculateDeliveryDuration(order.picked_up_at, order.delivered_at)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showPaymentBreakdown && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 tracking-tight">Ödeme Detayları</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPaymentBreakdown(false)
                }}
                className="text-slate-500 hover:text-slate-200 text-lg"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-800/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-500 tracking-tight">Nakit</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {openSettlementPackages.filter((o) => o.payment_method === 'cash').length} sipariş
                  </div>
                </div>
                <div className="text-lg font-bold text-emerald-500 tracking-tight">
                  {settlementSummary.cashTotal.toFixed(2)}₺
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-500 tracking-tight">Kart</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {openSettlementPackages.filter((o) => o.payment_method === 'card').length} sipariş
                  </div>
                </div>
                <div className="text-lg font-bold text-orange-400 tracking-tight">
                  {settlementSummary.cardTotal.toFixed(2)}₺
                </div>
              </div>
              {settlementSummary.ibanTotal > 0 && (
                <div className="bg-slate-800/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-500 tracking-tight">IBAN</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {openSettlementPackages.filter((o) => o.payment_method === 'iban').length} sipariş
                    </div>
                  </div>
                  <div className="text-lg font-bold text-blue-400 tracking-tight">
                    {settlementSummary.ibanTotal.toFixed(2)}₺
                  </div>
                </div>
              )}
              <div className="bg-slate-800 border border-slate-700 p-3 rounded flex justify-between items-center">
                <div className="text-xs text-slate-400 font-medium tracking-tight">BU DÖNEM ÖDENECEK</div>
                <div className="text-xl font-bold text-orange-300 tracking-tight">
                  {settlementSummary.grandTotal.toFixed(2)}₺
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Açık hesapta bekleyen paketler</p>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => setShowPaymentBreakdown(false)}
                className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium border border-slate-700 transition-colors tracking-tight"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentSettings && (
        <CourierPaymentSettingsModal
          courier={courier}
          onClose={() => setShowPaymentSettings(false)}
          onSuccess={() => {
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
