/**
 * @file src/app/admin/components/modals/RestaurantDebtPayModal.tsx
 * @description Restoran Borç Ödeme Modalı.
 * Sistemin restoranlara olan borçlarını (eksik hakediş ödemeleri vb.) kapatmak 
 * için kullanılır. Restoranın mevcut borç listesini gösterir ve yapılan 
 * ödemeyi bu borçlardan düşer.
 */
'use client'

import { Restaurant, RestaurantDebt } from '@/types'
import { formatTurkishDate } from '@/utils/dateHelpers'

interface RestaurantDebtPayModalProps {
    show: boolean
    onClose: () => void
    restaurant: Restaurant | undefined
    selectedRestaurantId: number | string | null
    restaurantDebtPayAmount: string
    setRestaurantDebtPayAmount: (amount: string) => void
    onConfirm: () => void
    processing: boolean
    restaurantDebts: RestaurantDebt[]
    loadingDebts: boolean
}

export function RestaurantDebtPayModal({
    show,
    onClose,
    restaurant,
    selectedRestaurantId,
    restaurantDebtPayAmount,
    setRestaurantDebtPayAmount,
    onConfirm,
    processing,
    restaurantDebts,
    loadingDebts
}: RestaurantDebtPayModalProps) {
    if (!show || !selectedRestaurantId || !restaurant) return null

    const totalDebt = restaurantDebts.reduce((sum, d) => sum + d.remaining_amount, 0)

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900">
                        💳 Borç Ödemesi - {restaurant.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {loadingDebts ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Borçlar yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* Borç Listesi */}
                            <div className="mb-6">
                                <h4 className="text-lg font-bold text-slate-900 mb-4">📋 Mevcut Borçlar</h4>

                                {restaurantDebts.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <div className="text-4xl mb-2">✅</div>
                                        <p>Restoran borcu yok</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 mb-4">
                                        {restaurantDebts.map((debt) => (
                                            <div key={debt.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-200">
                                                <span className="text-sm text-slate-700">
                                                    📅 {formatTurkishDate(debt.debt_date)} gününden kalan
                                                </span>
                                                <span className="text-lg font-bold text-red-600">
                                                    {debt.remaining_amount.toFixed(2)} ₺
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Toplam Borç */}
                                {restaurantDebts.length > 0 && (
                                    <div className="bg-red-100 p-4 rounded-xl border-2 border-red-300">
                                        <div className="flex justify-between items-center">
                                            <span className="text-base font-bold text-red-700">
                                                💰 TOPLAM BORÇ
                                            </span>
                                            <span className="text-3xl font-black text-red-700">
                                                {totalDebt.toFixed(2)} ₺
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Ödeme Tutarı Input */}
                            {restaurantDebts.length > 0 && (
                                <>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            💵 Ödenen Tutar
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={restaurantDebtPayAmount}
                                            onChange={(e) => setRestaurantDebtPayAmount(e.target.value)}
                                            placeholder="Örn: 5000.00"
                                            autoFocus
                                            className="w-full px-4 py-3 bg-slate-800 border-slate-700-2 border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                        />
                                    </div>

                                    {/* Hesaplama Önizlemesi */}
                                    {restaurantDebtPayAmount && !isNaN(parseFloat(restaurantDebtPayAmount)) && (() => {
                                        const payment = parseFloat(restaurantDebtPayAmount)
                                        const remaining = totalDebt - payment

                                        if (payment > totalDebt) {
                                            return (
                                                <div className="mb-6">
                                                    <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-300">
                                                        <div className="text-center">
                                                            <span className="text-2xl font-black text-yellow-700">
                                                                ⚠️ UYARI
                                                            </span>
                                                            <p className="text-sm text-yellow-600 mt-2">
                                                                Ödeme tutarı toplam borçtan fazla olamaz!
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        } else if (remaining > 0) {
                                            return (
                                                <div className="mb-6">
                                                    <div className="bg-orange-50 p-4 rounded-xl border-2 border-orange-300">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-base font-bold text-orange-700">
                                                                📉 KALAN BORÇ
                                                            </span>
                                                            <span className="text-3xl font-black text-orange-700">
                                                                {remaining.toFixed(2)} ₺
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-orange-600 mt-2">
                                                            Kısmi ödeme yapılıyor
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        } else {
                                            return (
                                                <div className="mb-6">
                                                    <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
                                                        <div className="text-center">
                                                            <span className="text-2xl font-black text-green-700">
                                                                ✓ TAM ÖDEME
                                                            </span>
                                                            <p className="text-xs text-green-600 mt-2">
                                                                Borç tamamen kapanacak
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    })()}

                                    {/* Butonlar */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300:bg-slate-600 transition-colors"
                                        >
                                            İptal
                                        </button>
                                        <button
                                            onClick={onConfirm}
                                            disabled={processing || !restaurantDebtPayAmount || parseFloat(restaurantDebtPayAmount) > totalDebt}
                                            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
