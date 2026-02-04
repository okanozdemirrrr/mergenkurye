/**
 * @file src/app/admin/components/modals/CourierDetailModal.tsx
 * @description Kurye Detay ve Rapor Modalı.
 * Seçili kuryenin belirli bir tarih aralığındaki performansını, teslim ettiği 
 * siparişlerin listesini ve finansal özetini (nakit/kart/toplam) gösterir. 
 * Bu modal üzerinden "Gün Sonu Al" ve "Borç Öde" işlemlerine geçiş yapılabilir.
 */
'use client'

import { Package, Courier, CourierDebt } from '@/types'
import { formatTurkishTime, formatTurkishDate, calculateDeliveryDuration } from '@/utils/dateHelpers'

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
    if (!show || !selectedCourierId || !courier) return null

    const summary = calculateCashSummary(selectedCourierOrders)

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                    <div className="flex items-center gap-4 flex-1">
                        <h3 className="text-2xl font-bold text-slate-900">
                            🚴 {courier.full_name} - Detaylı Rapor
                        </h3>

                        {/* Tarih Aralığı Seçici */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={courierStartDate}
                                onChange={(e) => setCourierStartDate(e.target.value)}
                                className="px-3 py-2 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 text-sm"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                                type="date"
                                value={courierEndDate}
                                onChange={(e) => setCourierEndDate(e.target.value)}
                                className="px-3 py-2 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 text-sm"
                            />
                        </div>

                        {/* Gün Sonu Al Butonu */}
                        {courierStartDate && courierEndDate && (
                            <button
                                onClick={onEndOfDayClick}
                                className="ml-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all active:scale-95"
                            >
                                💰 Gün Sonu Al
                            </button>
                        )}

                        {/* Borç Öde Butonu */}
                        {courierDebts.length > 0 && (
                            <button
                                onClick={onPayDebtClick}
                                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all active:scale-95"
                            >
                                💳 Borç Öde
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700:text-slate-200 text-2xl ml-4"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] admin-scrollbar">
                    {/* Kasa Özeti */}
                    {selectedCourierOrders.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-lg font-bold mb-4 text-slate-900">💰 Kasa Özeti</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-green-100 p-4 rounded-xl border-2 border-green-300">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-green-700">
                                            {summary.cashTotal.toFixed(2)} ₺
                                        </div>
                                        <div className="text-sm font-semibold text-green-600 mt-1">
                                            💵 NAKİT TOPLAM
                                        </div>
                                        <div className="text-xs text-green-600 mt-1">
                                            {selectedCourierOrders.filter(o => o.payment_method === 'cash').length} sipariş
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-100 p-4 rounded-xl border-2 border-blue-300">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-blue-700">
                                            {summary.cardTotal.toFixed(2)} ₺
                                        </div>
                                        <div className="text-sm font-semibold text-blue-600 mt-1">
                                            💳 KART TOPLAM
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1">
                                            {selectedCourierOrders.filter(o => o.payment_method === 'card').length} sipariş
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-300">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-purple-700">
                                            {summary.grandTotal.toFixed(2)} ₺
                                        </div>
                                        <div className="text-sm font-semibold text-purple-600 mt-1">
                                            🎯 GENEL TOPLAM
                                        </div>
                                        <div className="text-xs text-purple-600 mt-1">
                                            {selectedCourierOrders.length} toplam sipariş
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sipariş Detay Tablosu */}
                    <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-900">📋 Teslim Edilen Siparişler</h4>
                        {selectedCourierOrders.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Bu kurye henüz sipariş teslim etmemiş.
                            </div>
                        ) : (
                            <div className="overflow-x-auto admin-scrollbar">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200 bg-slate-50">
                                            <th className="text-left py-3 px-4 font-semibold">Sipariş No</th>
                                            <th className="text-left py-3 px-4 font-semibold">Tarih/Saat</th>
                                            <th className="text-left py-3 px-4 font-semibold">Müşteri</th>
                                            <th className="text-left py-3 px-4 font-semibold">Restoran</th>
                                            <th className="text-left py-3 px-4 font-semibold">İçerik</th>
                                            <th className="text-left py-3 px-4 font-semibold">Tutar</th>
                                            <th className="text-left py-3 px-4 font-semibold">Konum</th>
                                            <th className="text-left py-3 px-4 font-semibold">Ödeme</th>
                                            <th className="text-left py-3 px-4 font-semibold">Teslimat Süresi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedCourierOrders.map((order, index) => (
                                            <tr key={order.id} className={`border-b border-slate-200 hover:bg-slate-50:bg-slate-700/30 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                                }`}>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-blue-600">
                                                            {order.order_number || '......'}
                                                        </span>
                                                        {order.platform && (
                                                            <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(order.platform)}`}>
                                                                {getPlatformDisplayName(order.platform)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-sm">
                                                        <div className="font-medium">{formatTurkishTime(order.delivered_at)}</div>
                                                        <div className="text-slate-500 text-xs">
                                                            {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString('tr-TR') : '-'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-medium">{order.customer_name}</td>
                                                <td className="py-3 px-4">
                                                    <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-medium">
                                                        🍽️ {order.restaurant?.name || 'Bilinmeyen'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="max-w-xs">
                                                        <div className="text-xs text-slate-600 truncate">
                                                            {order.content || 'Belirtilmemiş'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-green-600">
                                                        {order.amount} ₺
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="max-w-xs text-xs text-slate-600 truncate">
                                                        📍 {order.delivery_address}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.payment_method === 'cash'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-medium text-purple-600">
                                                        ⏱️ {calculateDeliveryDuration(order.picked_up_at, order.delivered_at)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Restoran Bazlı Özet */}
                    {selectedCourierOrders.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <h4 className="text-lg font-bold mb-4 text-slate-900">🍽️ Restoran Bazlı Özet</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {calculateRestaurantSummary(selectedCourierOrders).map((restaurant: any) => (
                                    <div key={restaurant.name} className="bg-slate-50 p-3 rounded-lg border">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-orange-600">
                                                {restaurant.count}
                                            </div>
                                            <div className="text-xs font-medium text-slate-700 mt-1">
                                                {restaurant.name}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {restaurant.count === 1 ? 'paket' : 'paket'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Özet İstatistik */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <div className="text-center text-sm text-blue-700">
                                    <span className="font-semibold">
                                        Toplam {calculateRestaurantSummary(selectedCourierOrders).length} farklı restorandan
                                        {' '}{selectedCourierOrders.length} paket teslim edildi
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
