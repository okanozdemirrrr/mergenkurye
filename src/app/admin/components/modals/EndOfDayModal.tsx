/**
 * @file src/app/admin/components/modals/EndOfDayModal.tsx
 * @description Kurye Gün Sonu İşlemleri Modalı.
 * Kuryeden alınan nakit paranın sisteme girildiği ve kurye üzerindeki borçlarla 
 * karşılaştırıldığı modaldır. Alınan miktar eksikse otomatik olarak borç (debt) oluşturur, 
 * fazla ise bahşiş olarak değerlendirilir.
 */
'use client'

import { Courier, CourierDebt, Package } from '@/types'
import { formatTurkishDate } from '@/utils/dateHelpers'

interface EndOfDayModalProps {
    show: boolean
    onClose: () => void
    courier: Courier | undefined
    selectedCourierId: string | null
    endOfDayAmount: string
    setEndOfDayAmount: (amount: string) => void
    onConfirm: () => void
    processing: boolean
    calculateCashSummary: (orders: Package[]) => any
    selectedCourierOrders: Package[]
    courierDebts: CourierDebt[]
    courierStartDate: string
    courierEndDate: string
    loadingDebts: boolean
}

export function EndOfDayModal({
    show,
    onClose,
    courier,
    selectedCourierId,
    endOfDayAmount,
    setEndOfDayAmount,
    onConfirm,
    processing,
    calculateCashSummary,
    selectedCourierOrders,
    courierDebts,
    courierStartDate,
    courierEndDate,
    loadingDebts
}: EndOfDayModalProps) {
    if (!show || !selectedCourierId || !courier) return null

    const summary = calculateCashSummary(selectedCourierOrders)
    const totalOldDebt = courierDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
    const grandTotal = summary.grandTotal + totalOldDebt
    const received = endOfDayAmount ? parseFloat(endOfDayAmount) : 0
    const difference = received - grandTotal

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto admin-scrollbar">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900">
                        💰 Gün Sonu Kasası - {courier.full_name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {loadingDebts ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Borçlar yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* Seçilen Tarih Aralığı Nakit Toplam */}
                            <div className="mb-6 space-y-3">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-green-700">
                                            💵 Seçilen Tarih Aralığı Nakit Toplam
                                        </span>
                                        <span className="text-2xl font-bold text-green-700">
                                            {summary.cashTotal.toFixed(2)} ₺
                                        </span>
                                    </div>
                                    <p className="text-xs text-green-600 mt-1">
                                        {selectedCourierOrders.filter(o => o.payment_method === 'cash').length} nakit sipariş ({courierStartDate} - {courierEndDate})
                                    </p>
                                    <p className="text-xs text-green-700 mt-2 font-medium">
                                        ℹ️ Bu değer değişmez (bilgi amaçlı)
                                    </p>
                                </div>

                                {/* Seçilen Tarih Aralığı Kart Toplam */}
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-blue-700">
                                            💳 Seçilen Tarih Aralığı Kart Toplam
                                        </span>
                                        <span className="text-2xl font-bold text-blue-700">
                                            {summary.cardTotal.toFixed(2)} ₺
                                        </span>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">
                                        {selectedCourierOrders.filter(o => o.payment_method === 'card').length} kart sipariş ({courierStartDate} - {courierEndDate})
                                    </p>
                                    <p className="text-xs text-blue-700 mt-2 font-medium">
                                        ℹ️ Bu değer değişmez (bilgi amaçlı)
                                    </p>
                                </div>

                                {/* Geçmiş Borçlar */}
                                {courierDebts.length > 0 && (
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium text-red-700">
                                                📋 Geçmiş Borçlar
                                            </span>
                                            <span className="text-2xl font-bold text-red-700">
                                                {totalOldDebt.toFixed(2)} ₺
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {courierDebts.map((debt) => (
                                                <div key={debt.id} className="flex justify-between items-center text-xs bg-white p-2 rounded">
                                                    <span className="text-slate-600">
                                                        📅 {formatTurkishDate(debt.debt_date)} tarihinden kalan
                                                    </span>
                                                    <span className="font-bold text-red-600">
                                                        {debt.remaining_amount.toFixed(2)} ₺
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Genel Toplam */}
                                <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-300">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-bold text-purple-700">
                                            🎯 GENEL TOPLAM (Beklenen)
                                        </span>
                                        <span className="text-3xl font-black text-purple-700">
                                            {grandTotal.toFixed(2)} ₺
                                        </span>
                                    </div>
                                    <p className="text-xs text-purple-600 mt-1">
                                        Seçilen tarih aralığı (settled_at NULL) + Geçmiş borçlar
                                    </p>
                                </div>
                            </div>

                            {/* Alınan Para Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    💰 Kuryeden Alınan Para
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={endOfDayAmount}
                                    onChange={(e) => setEndOfDayAmount(e.target.value)}
                                    placeholder="Örn: 1250.00"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                />
                            </div>

                            {/* Fark Hesaplama Visuals */}
                            {endOfDayAmount && !isNaN(parseFloat(endOfDayAmount)) && (
                                <div className="mb-6">
                                    {difference < 0 ? (
                                        <div className="bg-red-50 p-4 rounded-xl border-2 border-red-300">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-bold text-red-700">
                                                    ⚠️ AÇIK
                                                </span>
                                                <span className="text-3xl font-black text-red-700">
                                                    {Math.abs(difference).toFixed(2)} ₺
                                                </span>
                                            </div>
                                            <p className="text-xs text-red-600 mt-2">
                                                Bu miktar kurye borcuna eklenecek
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
                                                Kurye fazla para getirdi
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-300">
                                            <div className="text-center">
                                                <span className="text-2xl font-black text-blue-700">
                                                    ✓ TAM ÖDEME
                                                </span>
                                                <p className="text-xs text-blue-600 mt-2">
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
                                    className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300:bg-slate-600 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={processing || !endOfDayAmount}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            İşleniyor...
                                        </span>
                                    ) : (
                                        '✓ Gün Sonu Kapat'
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
