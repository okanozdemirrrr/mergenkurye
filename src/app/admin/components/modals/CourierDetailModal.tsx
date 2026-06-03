/**
 * @file src/app/admin/components/modals/CourierDetailModal.tsx
 * @description Kurye Detay ve Rapor Modalı — BUSINESS DARK THEME
 * 
 * REFACTOR:
 * - bg-slate-950 arka plan, bg-slate-900 kartlar
 * - 3'lü finansal kart (Haftalık Paket, Haftalık Hakediş, Borç)
 * - Kurumsal butonlar (fosforlu gradient'ler yok)
 * - Kusursuz X butonu (event bubbling proof)
 * - Tarih state'leri dışarıdan (parent) prop olarak alınır
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Courier, CourierDebt } from '@/types'
import { formatTurkishTime, calculateDeliveryDuration } from '@/utils/dateHelpers'
import {
  getBusinessDayDateTimeLocal,
  toDateTimeLocalValue,
  toFilterIso,
  type PeriodAccount,
} from '@/utils/courierAccount'
import { fetchCourierLedgerPeriodAccount } from '@/utils/courierLedger'
import { CourierPaymentSettingsModal } from './CourierPaymentSettingsModal'
import { supabase } from '@/app/lib/supabase'

interface CourierDetailModalProps {
    show: boolean
    onClose: () => void
    courier: Courier | undefined
    selectedCourierId: string | null
    courierStartDate: string
    setCourierStartDate: (date: string) => void
    courierEndDate: string
    setCourierEndDate: (date: string) => void
    onEndOfDayClick: () => void
    onPayDebtClick: () => void
    onFilterClick?: () => void
    selectedCourierOrders: Package[]
    courierDebts: CourierDebt[]
    calculateCashSummary: (orders: Package[]) => any
    calculateRestaurantSummary: (orders: Package[]) => any
    getPlatformBadgeClass: (platform: string) => string
    getPlatformDisplayName: (platform: string) => string
}

export function CourierDetailModal({
    show,
    onClose,
    courier,
    selectedCourierId,
    courierStartDate,
    setCourierStartDate,
    courierEndDate,
    setCourierEndDate,
    onEndOfDayClick,
    onPayDebtClick,
    selectedCourierOrders,
    courierDebts,
    calculateCashSummary,
    calculateRestaurantSummary,
    getPlatformBadgeClass,
    getPlatformDisplayName
}: CourierDetailModalProps) {
    const [showPaymentSettings, setShowPaymentSettings] = useState(false)
    const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false)
    // Kazanç modu state'leri
    const [earningsMode, setEarningsMode] = useState(false)
    const [unpaidPackages, setUnpaidPackages] = useState<Package[]>([])
    const [loadingUnpaid, setLoadingUnpaid] = useState(false)
    const [payingCourier, setPayingCourier] = useState(false)
    const [periodAccount, setPeriodAccount] = useState<PeriodAccount | null>(null)
    const [loadingPeriodAccount, setLoadingPeriodAccount] = useState(false)

    // Ödenmemiş paketleri çek
    const fetchUnpaidPackages = useCallback(async () => {
        if (!selectedCourierId) return
        setLoadingUnpaid(true)
        try {
            const { data, error } = await supabase
                .from('packages')
                .select('*, restaurants(*)')
                .eq('delivered_by_courier_id', selectedCourierId)
                .eq('status', 'delivered')
                .eq('is_paid_to_courier', false)
                .gte('delivered_at', toFilterIso(courierStartDate, 'start'))
                .lte('delivered_at', toFilterIso(courierEndDate, 'end'))
                .order('delivered_at', { ascending: false })

            if (error) throw error
            const transformed = (data || []).map((pkg: any) => ({
                ...pkg,
                restaurant: Array.isArray(pkg.restaurants) && pkg.restaurants.length > 0 ? pkg.restaurants[0] : pkg.restaurants || null,
                restaurants: undefined
            }))
            setUnpaidPackages(transformed)
        } catch (err) {
            console.error('Ödenmemiş paketler çekilemedi:', err)
        } finally {
            setLoadingUnpaid(false)
        }
    }, [selectedCourierId, courierStartDate, courierEndDate])

    const loadPeriodAccount = useCallback(async () => {
        if (!selectedCourierId || !courierStartDate || !courierEndDate || !courier) return
        setLoadingPeriodAccount(true)
        try {
            const data = await fetchCourierLedgerPeriodAccount(
                supabase,
                selectedCourierId,
                courierStartDate,
                courierEndDate,
                courier.package_rate ?? 0
            )
            setPeriodAccount(data)
        } catch (err) {
            console.error('Mutabakat özeti yüklenemedi:', err)
            setPeriodAccount(null)
        } finally {
            setLoadingPeriodAccount(false)
        }
    }, [selectedCourierId, courierStartDate, courierEndDate, courier])

    useEffect(() => {
        if (!courier || !show) return
        if (earningsMode && selectedCourierId) fetchUnpaidPackages()
        else if (selectedCourierId) loadPeriodAccount()
    }, [earningsMode, fetchUnpaidPackages, selectedCourierId, show, loadPeriodAccount, courier])

    useEffect(() => {
        if (!earningsMode && selectedCourierId && show && courier) loadPeriodAccount()
    }, [courierStartDate, courierEndDate, earningsMode, selectedCourierId, show, loadPeriodAccount, courier])

    // Toplu ödeme yap
    const handlePayAll = async () => {
        if (unpaidPackages.length === 0) return
        setPayingCourier(true)
        try {
            const ids = unpaidPackages.map(p => p.id)
            const { error } = await supabase
                .from('packages')
                .update({ is_paid_to_courier: true })
                .in('id', ids)
                .eq('delivered_by_courier_id', selectedCourierId)
                .eq('is_paid_to_courier', false)

            if (error) throw error
            await fetchUnpaidPackages()
            alert(`✅ ${ids.length} paket ödendi olarak işaretlendi!`)
        } catch (err: any) {
            console.error('Ödeme hatası:', err)
            alert('Ödeme sırasında hata: ' + err.message)
        } finally {
            setPayingCourier(false)
        }
    }
    
    if (!show || !selectedCourierId || !courier) return null

    const openSettlementOrders = selectedCourierOrders.filter(
        (o) => o.courier_settlement_id == null
    )

    const summary = periodAccount
        ? {
              cashTotal: periodAccount.cash,
              cardTotal: periodAccount.card,
              ibanTotal: periodAccount.iban,
              grandTotal: periodAccount.payableDebt,
              packageCount: periodAccount.count,
          }
        : {
              ...calculateCashSummary(
                  openSettlementOrders.length > 0
                      ? openSettlementOrders
                      : selectedCourierOrders
              ),
              packageCount: openSettlementOrders.length || selectedCourierOrders.length,
          }

    const packageCount = selectedCourierOrders.length
    const packageRate = courier.package_rate || 0
    const courierEarnings = packageRate * packageCount
    const tahsilatDebt = Number(summary.grandTotal) || 0
    const personalDebt = courierDebts.reduce(
        (sum, d) => sum + (d.remaining_amount || 0),
        0
    )

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-6xl w-full max-h-[92vh] overflow-hidden">
                
                {/* ═══ HEADER ═══ */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-4 flex-1 flex-wrap">
                        {/* Kurye Adı */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                                {courier.full_name}
                            </h2>
                            <p className="text-xs text-slate-500 tracking-tight">Detaylı Rapor</p>
                        </div>

                        {/* Hızlı Tarih Butonları */}
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => {
                                    const { start, end } = getBusinessDayDateTimeLocal()
                                    setCourierStartDate(start)
                                    setCourierEndDate(end)
                                    void loadPeriodAccount()
                                }}
                                className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium hover:bg-slate-700 border border-slate-700 transition-colors tracking-tight"
                            >
                                Bugün
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date()
                                    const prev = new Date(now)
                                    if (prev.getHours() < 5) prev.setDate(prev.getDate() - 2)
                                    else prev.setDate(prev.getDate() - 1)
                                    const start = new Date(prev)
                                    start.setHours(5, 0, 0, 0)
                                    const end = new Date(start)
                                    end.setDate(end.getDate() + 1)
                                    end.setHours(4, 59, 0, 0)
                                    setCourierStartDate(toDateTimeLocalValue(start))
                                    setCourierEndDate(toDateTimeLocalValue(end))
                                }}
                                className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium hover:bg-slate-700 border border-slate-700 transition-colors tracking-tight"
                            >
                                Dün
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const end = new Date()
                                    const start = new Date()
                                    start.setDate(start.getDate() - 7)
                                    start.setHours(5, 0, 0, 0)
                                    end.setHours(4, 59, 0, 0)
                                    setCourierStartDate(toDateTimeLocalValue(start))
                                    setCourierEndDate(toDateTimeLocalValue(end))
                                }}
                                className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium hover:bg-slate-700 border border-slate-700 transition-colors tracking-tight"
                            >
                                7 Gün
                            </button>
                        </div>

                        {/* Tarih Seçiciler */}
                        <div className="flex items-center gap-1.5">
                            <input
                                type="datetime-local"
                                value={courierStartDate}
                                onChange={(e) => setCourierStartDate(e.target.value)}
                                className="px-2 py-1.5 bg-slate-900 text-slate-300 rounded border border-slate-700 text-xs outline-none focus:border-slate-500 transition-colors"
                            />
                            <span className="text-slate-600 text-xs">—</span>
                            <input
                                type="datetime-local"
                                value={courierEndDate}
                                onChange={(e) => setCourierEndDate(e.target.value)}
                                className="px-2 py-1.5 bg-slate-900 text-slate-300 rounded border border-slate-700 text-xs outline-none focus:border-slate-500 transition-colors"
                            />
                        </div>

                        {/* Aksiyon Butonları */}
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
                                {earningsMode ? '← Rapor' : 'Kazanç'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPaymentSettings(true)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium border border-slate-700 transition-colors tracking-tight"
                            >
                                Kazanç Ayarları
                            </button>
                            {courierStartDate && courierEndDate && (
                                <button
                                    type="button"
                                    onClick={onEndOfDayClick}
                                    className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-300 rounded text-xs font-medium border border-emerald-800/50 transition-colors tracking-tight"
                                >
                                    Gün Sonu Al
                                </button>
                            )}
                            {courierDebts.length > 0 && (
                                <button
                                    type="button"
                                    onClick={onPayDebtClick}
                                    className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 rounded text-xs font-medium border border-rose-800/40 transition-colors tracking-tight"
                                >
                                    Borç Öde
                                </button>
                            )}
                        </div>
                    </div>

                    {/* X Butonu — Event Bubbling Proof */}
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

                {/* ═══ CONTENT ═══ */}
                <div className="p-6 overflow-y-auto max-h-[calc(92vh-72px)] bg-slate-950">

                {earningsMode ? (
                    /* ═══ KAZANÇ MODU ═══ */
                    <>
                        {/* Özet Kartı */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-4">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-[10px] text-slate-600 tracking-tight uppercase font-medium mb-1">ÖDENMEMİŞ PAKETLER</div>
                                    <div className="text-3xl font-black text-slate-100 tracking-tight">
                                        {loadingUnpaid ? '...' : unpaidPackages.length}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 tracking-tight">
                                        {courierStartDate} — {courierEndDate} aralığı
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-600 tracking-tight uppercase font-medium mb-1">TOPLAM HAKEDİŞ</div>
                                    <div className="text-3xl font-black text-emerald-500 tracking-tight">
                                        {loadingUnpaid ? '...' : ((courier.package_rate || 0) * unpaidPackages.length).toFixed(0)}₺
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 tracking-tight">
                                        {unpaidPackages.length} × {courier.package_rate || 0}₺
                                    </div>
                                </div>
                            </div>
                            {/* Öde Butonu */}
                            {unpaidPackages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handlePayAll}
                                    disabled={payingCourier}
                                    className="w-full px-4 py-2.5 bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-300 rounded text-sm font-medium border border-emerald-800/50 transition-colors tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {payingCourier ? (
                                        <span className="flex items-center justify-center gap-1.5">
                                            <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                            İşleniyor...
                                        </span>
                                    ) : (
                                        `${unpaidPackages.length} Paketi Ödendi Olarak İşaretle`
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Ödenmemiş Paketler Tablosu */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-800">
                                <h3 className="text-sm font-bold text-slate-200 tracking-tight">Ödenmemiş Paketler</h3>
                            </div>
                            {loadingUnpaid ? (
                                <div className="text-center py-8">
                                    <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-xs text-slate-600 tracking-tight">Yükleniyor...</p>
                                </div>
                            ) : unpaidPackages.length === 0 ? (
                                <div className="text-center py-12 text-slate-600">
                                    <div className="text-3xl mb-2 opacity-30">✅</div>
                                    <p className="text-sm tracking-tight">Bu aralıkta ödenmemiş paket yok</p>
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
                                            {unpaidPackages.map((pkg, i) => (
                                                <tr key={pkg.id} className={`border-b border-slate-800/50 ${i % 2 === 0 ? 'bg-slate-900/30' : ''}`}>
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
                    {/* ═══ NORMAL RAPOR MODU ═══ */}

                    {/* ─── 3'LÜ FİNANSAL KART ─── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                        {/* KART 1: Haftalık Paket */}
                        <div
                            onClick={() => setShowPaymentBreakdown(true)} 
                            className="bg-slate-900 border border-slate-800 rounded-lg p-4 cursor-pointer hover:border-slate-700 transition-colors"
                        >
                            <div className="text-xs text-slate-500 tracking-tight mb-2">PAKET SAYISI</div>
                            <div className="text-2xl font-bold text-slate-100 tracking-tight">
                                {packageCount}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 tracking-tight">
                                Seçili tarih aralığı
                            </div>
                        </div>

                        {/* KART 2: Haftalık Hakediş */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 tracking-tight mb-2">HAKEDİŞ</div>
                            <div className="text-2xl font-bold text-emerald-500 tracking-tight">
                                {courierEarnings.toFixed(0)}₺
                            </div>
                            <div className="text-xs text-slate-600 mt-1 tracking-tight">
                                {packageRate > 0
                                    ? `${packageCount} Paket × ${packageRate}₺`
                                    : 'Paket başı ücret belirlenmedi'
                                }
                            </div>
                        </div>

                        {/* KART 3: Kasaya tahsilat borcu (mutabakat bekleyen) */}
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <div className="text-xs text-slate-500 tracking-tight mb-2">KASAYA BORÇ (TAHSİLAT)</div>
                            <div className={`text-2xl font-bold tracking-tight ${tahsilatDebt > 0 ? 'text-orange-500' : 'text-slate-500'}`}>
                                {loadingPeriodAccount
                                    ? '…'
                                    : `${tahsilatDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}₺`}
                            </div>
                            <div className="text-xs text-slate-600 mt-1 tracking-tight">
                                {tahsilatDebt > 0
                                    ? `${summary.packageCount} paket · mutabakat bekliyor`
                                    : 'Bu dönemde açık tahsilat yok'}
                                {personalDebt > 0
                                    ? ` · Kişisel borç: ${personalDebt.toFixed(2)}₺`
                                    : ''}
                            </div>
                        </div>
                    </div>

                    {/* ─── SİPARİŞ TABLOSU ─── */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-800">
                            <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                                Teslim Edilen Siparişler
                            </h3>
                        </div>

                        {selectedCourierOrders.length === 0 ? (
                            <div className="text-center py-12 text-slate-600">
                                <div className="text-3xl mb-2 opacity-30">📦</div>
                                <p className="text-sm tracking-tight">Bu tarih aralığında teslim edilen sipariş yok</p>
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
                                        {selectedCourierOrders.map((order, index) => (
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
                                                        {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 text-xs text-slate-300 tracking-tight">{order.customer_name}</td>
                                                <td className="py-2.5 px-4">
                                                    <span className="text-xs text-slate-400 tracking-tight">
                                                        {order.restaurant?.name || 'Bilinmeyen'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="max-w-[120px] text-[11px] text-slate-500 truncate tracking-tight">
                                                        {order.content || '—'}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 text-right">
                                                    <span className="font-medium text-emerald-500 text-xs tracking-tight">
                                                        {order.amount}₺
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="max-w-[100px] text-[10px] text-slate-600 truncate">
                                                        {order.delivery_address}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                        order.payment_method === 'cash'
                                                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                                                            : order.payment_method === 'iban'
                                                            ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                                                            : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                                                    }`}>
                                                        {order.payment_method === 'cash' ? 'Nakit' : order.payment_method === 'iban' ? 'IBAN' : 'Kart'}
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

                    {/* ─── RESTORAN BAZLI ÖZET ─── */}
                    {selectedCourierOrders.length > 0 && (
                        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-slate-200 tracking-tight mb-3">
                                Restoran Bazlı Dağılım
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {calculateRestaurantSummary(selectedCourierOrders).map((restaurant: any) => (
                                    <div key={restaurant.name} className="bg-slate-800/50 border border-slate-800 p-3 rounded">
                                        <div className="text-lg font-bold text-slate-200 tracking-tight">
                                            {restaurant.count}
                                        </div>
                                        <div className="text-xs text-slate-500 tracking-tight mt-0.5">
                                            {restaurant.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 text-xs text-slate-600 tracking-tight">
                                {calculateRestaurantSummary(selectedCourierOrders).length} restorandan toplam {selectedCourierOrders.length} paket
                            </div>
                        </div>
                    )}
                    </>
                )}
                </div>
            </div>

            {/* ═══ ÖDEME DETAYLARI POPUP ═══ */}
            {showPaymentBreakdown && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full">
                        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-800">
                            <h3 className="text-sm font-bold text-slate-200 tracking-tight">Ödeme Detayları</h3>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowPaymentBreakdown(false) }}
                                className="text-slate-500 hover:text-slate-200 text-lg"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {/* Nakit */}
                            <div className="bg-slate-800/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-slate-500 tracking-tight">Nakit</div>
                                    <div className="text-xs text-slate-600 mt-0.5">
                                        {selectedCourierOrders.filter(o => o.payment_method === 'cash').length} sipariş
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-emerald-500 tracking-tight">
                                    {summary.cashTotal.toFixed(2)}₺
                                </div>
                            </div>
                            {/* Kart */}
                            <div className="bg-slate-800/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-slate-500 tracking-tight">Kart</div>
                                    <div className="text-xs text-slate-600 mt-0.5">
                                        {selectedCourierOrders.filter(o => o.payment_method === 'card').length} sipariş
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-orange-400 tracking-tight">
                                    {summary.cardTotal.toFixed(2)}₺
                                </div>
                            </div>
                            {/* IBAN */}
                            {summary.ibanTotal > 0 && (
                                <div className="bg-slate-800/50 border border-slate-800 p-3 rounded flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-slate-500 tracking-tight">IBAN</div>
                                        <div className="text-xs text-slate-600 mt-0.5">
                                            {selectedCourierOrders.filter(o => o.payment_method === 'iban').length} sipariş
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-blue-400 tracking-tight">
                                        {summary.ibanTotal.toFixed(2)}₺
                                    </div>
                                </div>
                            )}
                            {/* Bu dönem ödenecek (mutabakat) */}
                            <div className="bg-slate-800 border border-slate-700 p-3 rounded flex justify-between items-center">
                                <div className="text-xs text-slate-400 font-medium tracking-tight">
                                    BU DÖNEM ÖDENECEK
                                    {loadingPeriodAccount ? ' …' : ''}
                                </div>
                                <div className="text-xl font-bold text-orange-300 tracking-tight">
                                    {summary.grandTotal.toFixed(2)}₺
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500">
                                courier_settlement_id boş paketler · seçili tarih aralığı
                            </p>
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

            {/* ═══ KAZANÇ AYARLARI MODALI ═══ */}
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
