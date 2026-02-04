/**
 * @file src/app/admin/components/modals/RestaurantDetailModal.tsx
 * @description Restoran Detay ve Rapor Modalı.
 * Seçili restoranın belirli bir tarih aralığındaki sipariş hacmini ve toplam 
 * cirosunu gösterir. Teslim edilen tüm paketlerin detaylı listesini sunar 
 * ve "Hesap Öde" işlemine yönlendirme yapar.
 */
'use client'

import { Package, Restaurant } from '@/types'
import { formatTurkishTime } from '@/utils/dateHelpers'

interface RestaurantDetailModalProps {
    show: boolean
    onClose: () => void
    restaurant: Restaurant | undefined
    selectedRestaurantId: number | string | null
    restaurantStartDate: string
    setRestaurantStartDate: (date: string) => void
    restaurantEndDate: string
    setRestaurantEndDate: (date: string) => void
    onPaymentClick: () => void
    selectedRestaurantOrders: Package[]
    getPlatformBadgeClass: (platform: string) => string
    getPlatformDisplayName: (platform: string) => string
}

export function RestaurantDetailModal({
    show,
    onClose,
    restaurant,
    selectedRestaurantId,
    restaurantStartDate,
    setRestaurantStartDate,
    restaurantEndDate,
    setRestaurantEndDate,
    onPaymentClick,
    selectedRestaurantOrders,
    getPlatformBadgeClass,
    getPlatformDisplayName
}: RestaurantDetailModalProps) {
    if (!show || !selectedRestaurantId || !restaurant) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                    <div className="flex items-center gap-4 flex-1">
                        <h3 className="text-2xl font-bold text-slate-900">
                            🍽️ {restaurant.name} - Detaylı Rapor
                        </h3>

                        {/* Tarih Aralığı Seçici */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={restaurantStartDate}
                                onChange={(e) => setRestaurantStartDate(e.target.value)}
                                className="px-3 py-2 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 text-sm"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                                type="date"
                                value={restaurantEndDate}
                                onChange={(e) => setRestaurantEndDate(e.target.value)}
                                className="px-3 py-2 bg-slate-100 text-slate-900 rounded-lg border border-slate-300 text-sm"
                            />
                        </div>

                        {/* Hesap Öde Butonu */}
                        {restaurantStartDate && restaurantEndDate && (
                            <button
                                onClick={onPaymentClick}
                                className="ml-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium text-sm shadow-lg transition-all active:scale-95"
                            >
                                💰 Hesap Öde
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-8 h-8 ml-4 text-slate-500 hover:text-slate-700:text-slate-200 hover:bg-slate-100:bg-slate-700 rounded-lg transition-colors text-2xl font-light"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] admin-scrollbar">
                    {/* Ödenmesi Gereken Hesap */}
                    {selectedRestaurantOrders.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-lg font-bold mb-4 text-slate-900">💰 Ödenmesi Gereken Hesap</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-100 p-4 rounded-xl border-2 border-blue-300">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-blue-700">
                                            {selectedRestaurantOrders.length}
                                        </div>
                                        <div className="text-sm font-semibold text-blue-600 mt-1">
                                            📦 TOPLAM SİPARİŞ
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-green-100 p-4 rounded-xl border-2 border-green-300">
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-green-700">
                                            {selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0).toFixed(2)} ₺
                                        </div>
                                        <div className="text-sm font-semibold text-green-600 mt-1">
                                            💵 TOPLAM TUTAR
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sipariş Detay Tablosu */}
                    <div>
                        <h4 className="text-lg font-bold mb-4 text-slate-900">📋 Sipariş Detayları</h4>
                        {selectedRestaurantOrders.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Bu restoran henüz sipariş almamış.
                            </div>
                        ) : (
                            <div className="overflow-x-auto admin-scrollbar">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200 bg-slate-50">
                                            <th className="text-left py-3 px-4 font-semibold">Sipariş No</th>
                                            <th className="text-left py-3 px-4 font-semibold">Tarih/Saat</th>
                                            <th className="text-left py-3 px-4 font-semibold">Müşteri</th>
                                            <th className="text-left py-3 px-4 font-semibold">Kurye</th>
                                            <th className="text-left py-3 px-4 font-semibold">Tutar</th>
                                            <th className="text-left py-3 px-4 font-semibold">Ödeme</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedRestaurantOrders.map((order, index) => (
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
                                                <td className="py-3 px-4">{order.courier_name || 'Bilinmeyen'}</td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-green-600">
                                                        {order.amount} ₺
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.payment_method === 'cash'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {order.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
