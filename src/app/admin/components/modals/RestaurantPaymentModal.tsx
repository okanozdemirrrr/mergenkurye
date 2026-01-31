/**
 * @file src/app/admin/components/modals/RestaurantPaymentModal.tsx
 * @description Restoran Hakediş Ödeme Modalı.
 * Belirli bir dönem için restoranın hakediş tutarının (sipariş toplamları + eski borçlar) 
 * ödendiği ana modaldır. Eksik ödeme yapılması durumunda sistem otomatik olarak 
 * restorana olan borcu günceller.
 */
'use client'

import { Restaurant, RestaurantDebt, Package } from '@/types'
import { formatTurkishDate } from '@/utils/dateHelpers'

interface RestaurantPaymentModalProps {
    show: boolean
    onClose: () => void
    restaurant: Restaurant | undefined
    selectedRestaurantId: number | string | null
    restaurantPaymentAmount: string
    setRestaurantPaymentAmount: (amount: string) => void
    onConfirm: () => void
    processing: boolean
    restaurantDebts: RestaurantDebt[]
    selectedRestaurantOrders: Package[]
    restaurantStartDate: string
    restaurantEndDate: string
    loadingDebts: boolean
}

export function RestaurantPaymentModal({
    show,
    onClose,
    restaurant,
    selectedRestaurantId,
    restaurantPaymentAmount,
    setRestaurantPaymentAmount,
    onConfirm,
    processing,
    restaurantDebts,
    selectedRestaurantOrders,
    restaurantStartDate,
    restaurantEndDate,
    loadingDebts
}: RestaurantPaymentModalProps) {
    if (!show || !selectedRestaurantId || !restaurant) return null

    const totalOrderAmount = selectedRestaurantOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
    const totalOldDebt = restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
    const grandTotal = totalOrderAmount + totalOldDebt
    const paid = restaurantPaymentAmount ? parseFloat(restaurantPaymentAmount) : 0
    const difference = grandTotal - paid

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            💰 Hesap Ödemesi - {restaurant.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl ml-4"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {loadingDebts ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Borçlar yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* Seçilen Tarih Aralığı Toplam Tutar */}
                            <div className="mb-6 space-y-3">
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                            💵 Seçilen Tarih Aralığı Toplam Tutar
                                        </span>
                                        <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                                            {totalOrderAmount.toFixed(2)} ₺
                                        </span>
                                    </div>
                                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                                        {selectedRestaurantOrders.length} sipariş ({restaurantStartDate} - {restaurantEndDate})
                                    </p>
                                </div>

                                {/* Geçmiş Borçlar */}
                                {restaurantDebts.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                                                📋 Geçmiş Borçlar
                                            </span>
                                            <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                                                {totalOldDebt.toFixed(2)} ₺
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {restaurantDebts.map((debt) => (
                                                <div key={debt.id} className="flex justify-between items-center text-xs bg-white dark:bg-slate-700 p-2 rounded">
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                        📅 {formatTurkishDate(debt.debt_date)} tarihinden kalan
                                                    </span>
                                                    <span className="font-bold text-red-600 dark:text-red-400">
                                                        {debt.remaining_amount.toFixed(2)} ₺
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Genel Toplam */}
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-bold text-purple-700 dark:text-purple-300">
                                            🎯 GENEL TOPLAM (Ödenmesi Gereken)
                                        </span>
                                        <span className="text-3xl font-black text-purple-700 dark:text-purple-300">
                                            {grandTotal.toFixed(2)} ₺
                                        </span>
                                    </div>
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                        Seçilen tarih aralığı toplam + Geçmiş borçlar
                                    </p>
                                </div>
                            </div>

                            {/* Ödenen Para Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    💰 Restorana Ödenen Para
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={restaurantPaymentAmount}
                                    onChange={(e) => setRestaurantPaymentAmount(e.target.value)}
                                    placeholder="Örn: 30000.00"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Fark Hesaplama Visuals */}
                            {restaurantPaymentAmount && !isNaN(parseFloat(restaurantPaymentAmount)) && (
                                <div className="mb-6">
                                    {difference > 0 ? (
                                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-2 border-red-300 dark:border-red-700">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-bold text-red-700 dark:text-red-300">
                                                    ⚠️ EKSİK ÖDEME
                                                </span>
                                                <span className="text-3xl font-black text-red-700 dark:text-red-300">
                                                    {difference.toFixed(2)} ₺
                                                </span>
                                            </div>
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                                Bu miktar restoran borcuna eklenecek
                                            </p>
                                        </div>
                                    ) : difference < 0 ? (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                                            <div className="text-center">
                                                <span className="text-2xl font-black text-yellow-700 dark:text-yellow-300">
                                                    ⚠️ FAZLA TUTAR
                                                </span>
                                                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                                                    Fazla tutar girdiniz, lütfen ödemeyi kontrol edin!
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700">
                                            <div className="text-center">
                                                <span className="text-2xl font-black text-green-700 dark:text-green-300">
                                                    ✓ TAM ÖDEME
                                                </span>
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
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
                                    className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={processing || !restaurantPaymentAmount || parseFloat(restaurantPaymentAmount) > grandTotal}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            İşleniyor...
                                        </span>
                                    ) : (
                                        '✓ Ödemeyi Onayla'
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
