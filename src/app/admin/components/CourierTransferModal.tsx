/**
 * @file src/app/admin/components/CourierTransferModal.tsx
 * @description Kriz Yönetimi - Kurye Devir Modal'ı
 * Sahada kaza/arıza durumunda paketin durumunu bozmadan başka kuryeye devredilmesi
 */
'use client'

import { useState } from 'react'
import { Package, Courier } from '@/types'
import { supabase } from '@/app/lib/supabase'

interface CourierTransferModalProps {
    package: Package
    couriers: Courier[]
    onClose: () => void
    onSuccess: () => void
}

export function CourierTransferModal({ package: pkg, couriers, onClose, onSuccess }: CourierTransferModalProps) {
    const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null)
    const [isTransferring, setIsTransferring] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Sadece aktif kuryeleri göster (mevcut kurye hariç)
    const availableCouriers = couriers.filter(c => 
        c.is_active && c.id !== pkg.courier_id
    )

    const handleTransfer = async () => {
        if (!selectedCourierId) {
            setError('Lütfen bir kurye seçin')
            return
        }

        // 🚫 GÜVENLİK KONTROLÜ: Kurye paketi yola çıktıysa devir yapılamaz!
        const blockedStatuses = ['on_the_way', 'delivered']
        if (blockedStatuses.includes(pkg.status)) {
            setError(`❌ Bu paket "${pkg.status}" durumunda! Kurye yola çıktıktan sonra devir yapılamaz.`)
            return
        }

        setIsTransferring(true)
        setError(null)

        try {
            // KRİTİK: Sadece courier_id güncelleniyor, status ve timestamp'ler korunuyor
            const { error: updateError } = await supabase
                .from('packages')
                .update({ 
                    courier_id: selectedCourierId
                    // status, assigned_at, picked_up_at vb. DOKUNULMUYOR
                })
                .eq('id', pkg.id)

            if (updateError) throw updateError

            // Başarılı
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error('❌ Kurye devir hatası:', err)
            setError(err.message || 'Kurye devri başarısız oldu')
        } finally {
            setIsTransferring(false)
        }
    }

    const currentCourier = couriers.find(c => c.id === pkg.courier_id)

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-orange-500 shadow-2xl relative z-[10000]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Başlık */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                            🚨 Kurye Devret
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Kriz Yönetimi - Paket durumu korunur</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* Paket Bilgisi */}
                <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-orange-400">
                            {pkg.order_number || '......'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            pkg.status === 'assigned' ? 'bg-purple-900/50 text-purple-300' :
                            pkg.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                            'bg-yellow-900/50 text-yellow-300'
                        }`}>
                            {pkg.status === 'assigned' ? '👤 Atandı' :
                             pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                        </span>
                    </div>
                    <p className="text-sm text-white">👤 {pkg.customer_name}</p>
                    <p className="text-xs text-slate-400 mt-1">📍 {pkg.delivery_address}</p>
                </div>

                {/* Mevcut Kurye */}
                <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg mb-4">
                    <p className="text-xs text-red-400 mb-1">Mevcut Kurye:</p>
                    <p className="text-sm font-bold text-white">
                        🚴 {currentCourier?.full_name || 'Bilinmeyen'}
                    </p>
                </div>

                {/* Yeni Kurye Seçimi */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-white mb-3">
                        Yeni Kurye Seçin:
                    </label>
                    {availableCouriers.length === 0 ? (
                        <div className="bg-yellow-900/20 border border-yellow-700 p-3 rounded-lg">
                            <p className="text-sm text-yellow-400">
                                ⚠️ Müsait aktif kurye bulunmuyor
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {availableCouriers.map(courier => (
                                <div
                                    key={courier.id}
                                    onClick={() => setSelectedCourierId(courier.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedCourierId === courier.id
                                            ? 'bg-orange-600 border-orange-500 text-white'
                                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">🚴 {courier.full_name}</p>
                                            <p className="text-xs opacity-75">
                                                📦 {courier.activePackageCount || 0} aktif paket
                                            </p>
                                        </div>
                                        {selectedCourierId === courier.id && (
                                            <div className="text-white">
                                                ✅
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hata Mesajı */}
                {error && (
                    <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg mb-4">
                        <p className="text-sm text-red-400">❌ {error}</p>
                    </div>
                )}

                {/* Uyarı */}
                <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-lg mb-4">
                    <p className="text-xs text-blue-300">
                        ℹ️ Paket durumu ve zaman bilgileri korunacak, sadece kurye değişecektir.
                    </p>
                </div>

                {/* Butonlar */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isTransferring}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={!selectedCourierId || isTransferring || availableCouriers.length === 0}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                    >
                        {isTransferring ? '⏳ Devrediliyor...' : '✅ Kurye Devret'}
                    </button>
                </div>
            </div>
        </div>
    )
}
