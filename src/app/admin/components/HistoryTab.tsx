/**
 * @file src/app/admin/components/HistoryTab.tsx
 * @description Geçmiş Siparişler Paneli Bileşeni.
 * Tamamlanan (teslim edilen veya iptal edilen) tüm siparişlerin listelendiği sekmeyi yönetir. 
 * Kategorik filtreleme (Teslim Edilen/İptal Edilen) ve tarih aralığı seçimi ile 
 * ödeme yöntemi istatistikleri (nakit/kart toplamları) sunar.
 */
'use client'

import { useState } from 'react'
import { Package } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { formatTurkishTime } from '@/utils/dateHelpers'

interface HistoryTabProps {
    deliveredPackages: Package[]
    dateFilter: 'today' | 'week' | 'month' | 'all'
    setDateFilter: (filter: 'today' | 'week' | 'month' | 'all') => void
    openDropdownId: number | null
    setOpenDropdownId: (id: number | null) => void
    handleCancelOrder: (id: number, details: string) => void
}

const HISTORY_ITEMS_PER_PAGE = 50

export function HistoryTab({
    deliveredPackages,
    dateFilter,
    setDateFilter,
    openDropdownId,
    setOpenDropdownId,
    handleCancelOrder
}: HistoryTabProps) {
    // Kategorik filtre state'i
    const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all')
    
    // Tarih aralığı state'leri
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Filtreleme
    const getFilteredHistory = () => {
        let filtered = deliveredPackages

        // Kategorik filtreleme
        if (statusFilter === 'delivered') {
            filtered = filtered.filter(pkg => pkg.status === 'delivered')
        } else if (statusFilter === 'cancelled') {
            filtered = filtered.filter(pkg => pkg.status === 'cancelled')
        }

        // Tarih aralığı filtreleme (sadece her iki tarih de seçiliyse)
        if (startDate && endDate) {
            const start = new Date(startDate)
            start.setHours(0, 0, 0, 0)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)

            filtered = filtered.filter(pkg => {
                const pkgDate = pkg.status === 'cancelled' && pkg.cancelled_at
                    ? new Date(pkg.cancelled_at)
                    : pkg.delivered_at
                        ? new Date(pkg.delivered_at)
                        : null

                return pkgDate && pkgDate >= start && pkgDate <= end
            })
        }

        return filtered
    }

    const filteredHistory = getFilteredHistory()

    // Toplam tutar hesapla (İPTAL EDİLENLER HARİÇ)
    const totalAmount = filteredHistory
        .filter(pkg => pkg.status !== 'cancelled')
        .reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
    const cashAmount = filteredHistory
        .filter(p => p.payment_method === 'cash' && p.status !== 'cancelled')
        .reduce((sum, pkg) => sum + (pkg.amount || 0), 0)
    const cardAmount = filteredHistory
        .filter(p => p.payment_method === 'card' && p.status !== 'cancelled')
        .reduce((sum, pkg) => sum + (pkg.amount || 0), 0)

    return (
        <div id="history-container" className="bg-white shadow-xl rounded-2xl p-6">
            <div className="flex flex-col gap-4 mb-6">
                {/* Başlık ve Kategorik Filtre */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">📋 Geçmiş Siparişler</h2>
                        
                        {/* Kategorik Filtre Butonları */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'all'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
                                    }`}
                            >
                                📦 Tümü
                            </button>
                            <button
                                onClick={() => setStatusFilter('delivered')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'delivered'
                                    ? 'bg-green-600 text-white shadow-lg'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
                                    }`}
                            >
                                ✅ Teslim Edilen
                            </button>
                            <button
                                onClick={() => setStatusFilter('cancelled')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${statusFilter === 'cancelled'
                                    ? 'bg-red-600 text-white shadow-lg'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300:bg-slate-600'
                                    }`}
                            >
                                🚫 İptal Edilen
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tarih Aralığı Filtresi */}
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700">
                        Tarih Aralığı:
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Başlangıç"
                    />
                    <span className="text-slate-500">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Bitiş"
                    />
                    {(startDate || endDate) && (
                        <button
                            onClick={() => {
                                setStartDate('')
                                setEndDate('')
                            }}
                            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300:bg-slate-600 transition-colors"
                        >
                            ✕ Temizle
                        </button>
                    )}
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="text-sm text-blue-600 font-medium">Toplam Sipariş</div>
                    <div className="text-2xl font-bold text-blue-700">{filteredHistory.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                    <div className="text-sm text-green-600 font-medium">Toplam Tutar</div>
                    <div className="text-2xl font-bold text-green-700">{totalAmount.toFixed(2)} ₺</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl">
                    <div className="text-sm text-emerald-600 font-medium">Nakit</div>
                    <div className="text-2xl font-bold text-emerald-700">{cashAmount.toFixed(2)} ₺</div>
                </div>
                <div className="bg-sky-50 p-4 rounded-xl">
                    <div className="text-sm text-sky-600 font-medium">Kart</div>
                    <div className="text-2xl font-bold text-sky-700">{cardAmount.toFixed(2)} ₺</div>
                </div>
            </div>

            <div className="overflow-x-auto admin-scrollbar">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-3 px-4 w-8"></th>
                            <th className="text-left py-3 px-4">Sipariş No</th>
                            <th className="text-left py-3 px-4">Tarih/Saat</th>
                            <th className="text-left py-3 px-4">Müşteri</th>
                            <th className="text-left py-3 px-4">Restoran</th>
                            <th className="text-left py-3 px-4">Kurye</th>
                            <th className="text-left py-3 px-4">Durum</th>
                            <th className="text-left py-3 px-4">Tutar</th>
                            <th className="text-left py-3 px-4">Ödeme</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-8 text-slate-500">
                                    {startDate && endDate 
                                        ? 'Bu tarih aralığında sipariş bulunamadı.'
                                        : statusFilter === 'delivered'
                                            ? 'Henüz teslim edilen sipariş yok.'
                                            : statusFilter === 'cancelled'
                                                ? 'Henüz iptal edilen sipariş yok.'
                                                : 'Henüz sipariş yok.'
                                    }
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.slice(0, HISTORY_ITEMS_PER_PAGE).map(pkg => (
                                <tr key={pkg.id} className={`border-b hover:bg-slate-50:bg-slate-700/50 ${pkg.status === 'cancelled'
                                    ? 'opacity-60 bg-red-50'
                                    : ''
                                    }`}>
                                    <td className="py-3 px-4">
                                        <div className="relative">
                                            <OrderActionMenu
                                                package={pkg}
                                                isOpen={openDropdownId === pkg.id}
                                                onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                                                onCancel={handleCancelOrder}
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-blue-600">
                                                {pkg.order_number || '......'}
                                            </span>
                                            {pkg.platform && (
                                                <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                                                    {getPlatformDisplayName(pkg.platform)}
                                                </span>
                                            )}
                                            {pkg.status === 'cancelled' && (
                                                <span className="text-xs py-0.5 px-2 rounded bg-red-100 text-red-600 font-semibold">
                                                    🚫 İPTAL
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="text-sm">
                                            <div className="font-medium">
                                                {pkg.status === 'cancelled'
                                                    ? formatTurkishTime(pkg.cancelled_at || undefined)
                                                    : formatTurkishTime(pkg.delivered_at)}
                                            </div>
                                            <div className="text-slate-500 text-xs">
                                                {pkg.status === 'cancelled' && pkg.cancelled_at
                                                    ? new Date(pkg.cancelled_at).toLocaleDateString('tr-TR')
                                                    : pkg.delivered_at
                                                        ? new Date(pkg.delivered_at).toLocaleDateString('tr-TR')
                                                        : '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-medium">
                                        <div>{pkg.customer_name}</div>
                                        {pkg.customer_phone && (
                                            <div className="text-xs text-slate-500 mt-1">📞 {pkg.customer_phone}</div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">{pkg.restaurant?.name}</td>
                                    <td className="py-3 px-4">
                                        {pkg.status === 'cancelled' ? (
                                            <span className="text-slate-400 italic">-</span>
                                        ) : (
                                            pkg.courier_name || 'Bilinmeyen'
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${pkg.status === 'delivered'
                                            ? 'bg-green-100 text-green-700'
                                            : pkg.status === 'cancelled'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {pkg.status === 'delivered' ? '✅ Teslim Edildi' : pkg.status === 'cancelled' ? '🚫 İptal Edildi' : pkg.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`font-bold ${pkg.status === 'cancelled'
                                            ? 'text-slate-400 line-through'
                                            : 'text-green-600'
                                            }`}>
                                            {pkg.amount}₺
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {pkg.status === 'cancelled' ? (
                                            <span className="text-xs text-slate-400 italic">İptal</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.payment_method === 'cash'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
