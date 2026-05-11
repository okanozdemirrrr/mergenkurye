/**
 * @file src/app/admin/components/modals/RestaurantPaymentModal.tsx
 * @description Restoran NET Hakediş Ödeme Modalı - Ödeme Terminali Sadeliği.
 * 
 * MANTIK: Detaylı Rapor'dan NET TUTAR (Ciro - Kurye Masrafı) gelir.
 * Modal sadece ödeme aksiyonu alır, tarihçe göstermez.
 */
'use client'

import { useState, useEffect } from 'react'
import { Restaurant, RestaurantDebt } from '@/types'
import { formatTurkishDate } from '@/utils/dateHelpers'

interface RestaurantPaymentModalProps {
    show: boolean
    onClose: () => void
    restaurant: Restaurant | undefined
    selectedRestaurantId: number | string | null
    netAmountToPay: number  // 💰 Detaylı Rapor'dan gelen NET TUTAR
    restaurantPaymentAmount: string
    setRestaurantPaymentAmount: (amount: string) => void
    onConfirm: (amount?: number) => void  // 🔥 Amount parametresi ekledik
    processing: boolean
    restaurantDebts: RestaurantDebt[]
    loadingDebts: boolean
}

export function RestaurantPaymentModal({
    show,
    onClose,
    restaurant,
    selectedRestaurantId,
    netAmountToPay,
    restaurantPaymentAmount,
    setRestaurantPaymentAmount,
    onConfirm,
    processing,
    restaurantDebts,
    loadingDebts
}: RestaurantPaymentModalProps) {
    
    // 🔥 LOCAL STATE - Input için string olarak tut
    const [paymentAmount, setPaymentAmount] = useState<string>('')
    const [showConfetti, setShowConfetti] = useState(false)
    
    // Modal açıldığında input'u temizle
    useEffect(() => {
        if (show) {
            setPaymentAmount('')
            setShowConfetti(false)
        }
    }, [show])

    if (!show || !selectedRestaurantId || !restaurant) return null

    // 📊 Finansal Hesaplamalar - YENİ MİMARİ
    // netAmountToPay artık "Net Hakediş" değil, "Net Ödenmesi Gereken"
    // (Brüt Ciro - Toplam Masraf) - Önceki Ödemeler
    const netOdenecek = netAmountToPay
    
    // Eski borçlar artık "Paket Masrafları" (restaurant_debts)
    const toplamMasraf = restaurantDebts.reduce((sum, d) => sum + d.amount, 0)
    
    // Sayısal hesaplamalar için parse et
    const paid = paymentAmount && paymentAmount.trim() !== '' 
      ? parseFloat(paymentAmount) 
      : 0

    // Buton validation
    const isValidAmount = paymentAmount && 
                          paymentAmount.trim() !== '' && 
                          parseFloat(paymentAmount) > 0

    // 🔥 MAX Butonu - Net Ödenecek tutarını doldur
    const handleMaxClick = () => {
        setPaymentAmount(String(netOdenecek.toFixed(2)))
    }

    // 🔥 Ödeme Onaylama - Tutarı direkt gönder
    const handleConfirmPayment = async () => {
        try {
            const amount = parseFloat(paymentAmount)
            
            console.log('🔥 MODAL: Ödeme onaylanıyor', { 
                paymentAmount, 
                parsedAmount: amount,
                isValid: !isNaN(amount) && amount > 0
            })
            
            // Parent state'i güncelle
            setRestaurantPaymentAmount(paymentAmount)
            
            // Tutarı direkt parametre olarak gönder (state update async olduğu için)
            await onConfirm(amount)
            
            // Başarılı ödeme sonrası konfeti göster
            setShowConfetti(true)
            setTimeout(() => {
                setShowConfetti(false)
                onClose()
            }, 2000)
        } catch (error: any) {
            console.error('❌ MODAL ÖDEME HATASI:', error)
            // Hata durumunda modal açık kalsın, kullanıcı görsün
            // Parent'tan gelen error message zaten gösterilecek
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!showConfetti) onClose()
            }}
        >
            {/* 🎉 KONFETI EFEKTİ */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center">
                    <div className="text-center animate-bounce">
                        <div className="text-8xl mb-4">🎉</div>
                        <div className="text-4xl font-black text-emerald-400 mb-2">
                            ÖDEME BAŞARILI!
                        </div>
                        <div className="text-xl text-emerald-300">
                            Restoran bakiyesi güncellendi
                        </div>
                    </div>
                    {/* Konfeti parçacıkları */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute animate-ping"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 0.5}s`,
                                    fontSize: `${Math.random() * 20 + 20}px`
                                }}
                            >
                                {['🎊', '✨', '💰', '✅', '🎉'][Math.floor(Math.random() * 5)]}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div 
                className="bg-slate-950 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                }}
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <div>
                        <h3 className="text-2xl font-black text-white">
                            💰 Hesap Ödemesi
                        </h3>
                        <p className="text-sm text-slate-400 mt-1 font-medium">
                            {restaurant.name}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onClose()
                        }}
                        className="text-slate-400 hover:text-white transition-colors text-2xl ml-4 hover:bg-slate-800 rounded-lg w-10 h-10 flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {loadingDebts ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-medium">Hesaplanıyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* 🎯 TEK DEVASA KART: NET ÖDENMESİ GEREKEN */}
                            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 p-8 rounded-2xl border-2 border-emerald-500/30 shadow-2xl shadow-emerald-900/30 mb-6">
                                <div className="text-center">
                                    <div className="text-emerald-400/70 text-sm font-bold uppercase tracking-wider mb-3">
                                        Net Ödenmesi Gereken
                                    </div>
                                    <div className="text-6xl font-black text-emerald-300 mb-3 tracking-tight">
                                        {netOdenecek.toFixed(2)}₺
                                    </div>
                                    <div className="text-emerald-400/60 text-xs font-medium">
                                        (Brüt Ciro - Toplam Masraf) - Önceki Ödemeler
                                    </div>
                                </div>
                            </div>

                            {/* Paket Masrafları (Varsa) */}
                            {restaurantDebts.length > 0 && (
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-slate-300">
                                            📦 Paket Masrafları (restaurant_debts)
                                        </span>
                                        <span className="text-xl font-black text-rose-500">
                                            {toplamMasraf.toFixed(2)} ₺
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {restaurantDebts.map((debt) => (
                                            <div key={debt.id} className="flex justify-between items-center text-xs bg-slate-800 p-3 rounded-lg border border-slate-700">
                                                <span className="text-slate-400">
                                                    📅 {formatTurkishDate(debt.debt_date)} - {(debt as any).package_count || 1} paket × {(debt as any).package_fee || 0}₺
                                                </span>
                                                <span className="font-bold text-rose-400">
                                                    {debt.amount.toFixed(2)} ₺
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ödenen Para Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
                                    💰 Ödeme Tutarı
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="any"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder={`Örn: ${netOdenecek.toFixed(2)}`}
                                        autoFocus
                                        className="w-full px-4 py-4 bg-slate-900 border-2 border-slate-700 rounded-xl text-2xl font-black text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder-slate-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleMaxClick}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                                    >
                                        MAX
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Kısmi ödeme yapabilirsiniz (Örn: 5000₺)
                                </p>
                            </div>

                            {/* Fark Hesaplama */}
                            {isValidAmount && (
                                <div className="mb-6">
                                    {paid < netOdenecek ? (
                                        <div className="bg-rose-900/20 p-4 rounded-xl border-2 border-rose-500/30">
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-bold text-rose-400">
                                                    ⚠️ KISMI ÖDEME
                                                </span>
                                                <span className="text-3xl font-black text-rose-500">
                                                    {(netOdenecek - paid).toFixed(2)} ₺ kaldı
                                                </span>
                                            </div>
                                            <p className="text-xs text-rose-400 mt-2">
                                                Kalan tutar sonraki ödemede ödenecek
                                            </p>
                                        </div>
                                    ) : paid > netOdenecek ? (
                                        <div className="bg-amber-900/20 p-4 rounded-xl border-2 border-amber-500/30">
                                            <div className="text-center">
                                                <span className="text-2xl font-black text-amber-500">
                                                    ⚠️ FAZLA TUTAR
                                                </span>
                                                <p className="text-sm text-amber-400 mt-2">
                                                    Ödeme tutarı net ödenecek tutardan fazla olamaz
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-900/20 p-4 rounded-xl border-2 border-emerald-500/30">
                                            <div className="text-center">
                                                <span className="text-2xl font-black text-emerald-500">
                                                    ✓ TAM ÖDEME
                                                </span>
                                                <p className="text-xs text-emerald-400 mt-2">
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
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onClose()
                                    }}
                                    className="flex-1 px-4 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleConfirmPayment()
                                    }}
                                    disabled={processing || !isValidAmount || parseFloat(paymentAmount) > netOdenecek}
                                    className="flex-1 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            İşleniyor...
                                        </span>
                                    ) : (
                                        '✓ Ödemeyi Tamamla'
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
