/**
 * @file src/app/admin/components/OrderDrawer.tsx
 * @description Modüler Sipariş Takip Drawer'ı - Sağ üstten açılır panel
 * Aktif siparişleri şık bir drawer içinde gösterir
 */
'use client'

import { useState, useEffect } from 'react'
import { Package, Courier } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { formatTurkishTime } from '@/utils/dateHelpers'

interface OrderDrawerProps {
    packages: Package[]
    couriers: Courier[]
    openDropdownId: number | null
    setOpenDropdownId: (id: number | null) => void
    handleCancelOrder: (id: number, details: string) => void
}

export function OrderDrawer({
    packages,
    couriers,
    openDropdownId,
    setOpenDropdownId,
    handleCancelOrder
}: OrderDrawerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

    // Aktif operasyondaki paketleri filtrele (iptal edilenler HARİÇ)
    const activeOperationPackages = packages.filter(pkg =>
        (pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') &&
        pkg.status !== 'cancelled'
    )

    const getStatusText = (status: string) => {
        switch (status) {
            case 'waiting': return 'Beklemede'
            case 'assigned': return 'Atandı'
            case 'picking_up': return 'Alınıyor'
            case 'on_the_way': return 'Yolda'
            case 'delivered': return 'Teslim Edildi'
            case 'cancelled': return 'İptal Edildi'
            default: return status
        }
    }

    // ESC tuşu ile kapatma
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen])

    return (
        <>
            {/* DETAY MODAL */}
            {selectedPackage && (
                <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4" onClick={() => setSelectedPackage(null)}>
                    <div className="bg-slate-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Başlık ve Kapat Butonu */}
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-900 pb-4 border-b border-slate-700 z-10">
                            <h3 className="text-xl font-bold text-white">📦 Sipariş Detayları</h3>
                            <button
                                onClick={() => setSelectedPackage(null)}
                                className="text-slate-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        {/* İçerik */}
                        <div className="space-y-4 pt-2">
                            {/* Sipariş No ve Platform */}
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-orange-400">
                                    {selectedPackage.order_number || '......'}
                                </span>
                                {selectedPackage.platform && (
                                    <span className={`text-sm py-1 px-3 rounded ${getPlatformBadgeClass(selectedPackage.platform)}`}>
                                        {getPlatformDisplayName(selectedPackage.platform)}
                                    </span>
                                )}
                            </div>

                            {/* Durum */}
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Durum:</span>
                                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                                        selectedPackage.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                                        selectedPackage.status === 'waiting' ? 'bg-yellow-900/50 text-yellow-300' :
                                        selectedPackage.status === 'assigned' ? 'bg-orange-900/50 text-orange-300' :
                                        selectedPackage.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                                        selectedPackage.status === 'on_the_way' ? 'bg-blue-900/50 text-blue-300' :
                                        'bg-green-900/50 text-green-300'
                                    }`}>
                                        {getStatusText(selectedPackage.status)}
                                    </span>
                                </div>
                            </div>

                            {/* Restoran ve Tutar */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Restoran</p>
                                    <p className="text-white font-semibold">🍽️ {selectedPackage.restaurant?.name || 'Bilinmeyen'}</p>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Tutar</p>
                                    <p className="text-green-400 font-bold text-xl">{selectedPackage.amount}₺</p>
                                </div>
                            </div>

                            {/* Müşteri Bilgileri */}
                            <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                                <h4 className="text-white font-semibold mb-2">Müşteri Bilgileri</h4>
                                <div>
                                    <p className="text-slate-400 text-xs mb-1">Ad Soyad</p>
                                    <p className="text-white">👤 {selectedPackage.customer_name}</p>
                                </div>
                                {selectedPackage.customer_phone && (
                                    <div>
                                        <p className="text-slate-400 text-xs mb-1">Telefon</p>
                                        <p className="text-white">📞 {selectedPackage.customer_phone}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-slate-400 text-xs mb-1">Teslimat Adresi</p>
                                    <p className="text-white">📍 {selectedPackage.delivery_address}</p>
                                </div>
                            </div>

                            {/* Paket İçeriği */}
                            {selectedPackage.content && (
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Paket İçeriği</p>
                                    <p className="text-orange-200">📝 {selectedPackage.content}</p>
                                </div>
                            )}

                            {/* Ödeme Yöntemi */}
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">Ödeme Yöntemi:</span>
                                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                                        selectedPackage.payment_method === 'cash'
                                            ? 'bg-green-900/50 text-green-300'
                                            : selectedPackage.payment_method === 'iban'
                                            ? 'bg-purple-900/50 text-purple-300'
                                            : 'bg-orange-900/50 text-orange-300'
                                    }`}>
                                        {selectedPackage.payment_method === 'cash' ? '💵 Nakit' : selectedPackage.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                                    </span>
                                </div>
                            </div>

                            {/* Kurye Bilgisi */}
                            {selectedPackage.courier_id && (
                                <div className="bg-slate-800 p-4 rounded-lg">
                                    <p className="text-slate-400 text-xs mb-1">Atanan Kurye</p>
                                    <p className="text-white">🚴 {couriers.find(c => c.id === selectedPackage.courier_id)?.full_name || 'Bilinmeyen'}</p>
                                </div>
                            )}

                            {/* Zaman Bilgileri */}
                            <div className="bg-slate-800 p-4 rounded-lg space-y-2">
                                <h4 className="text-white font-semibold mb-2">Zaman Bilgileri</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Oluşturulma:</span>
                                    <span className="text-white">🕐 {formatTurkishTime(selectedPackage.created_at)}</span>
                                </div>
                                {selectedPackage.assigned_at && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Atanma:</span>
                                        <span className="text-white">🕐 {formatTurkishTime(selectedPackage.assigned_at)}</span>
                                    </div>
                                )}
                                {selectedPackage.picked_up_at && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Alınma:</span>
                                        <span className="text-white">🕐 {formatTurkishTime(selectedPackage.picked_up_at)}</span>
                                    </div>
                                )}
                                {selectedPackage.delivered_at && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Teslim:</span>
                                        <span className="text-white">🕐 {formatTurkishTime(selectedPackage.delivered_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SABİT BUTON - SAĞ ALT KÖŞE */}
            <div className="fixed bottom-6 right-6 z-[200]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 font-bold"
                >
                <span className="text-2xl">📦</span>
                <span className="hidden sm:inline">Anlık Sipariş Takibi</span>
                {/* Bildirim Badge */}
                {activeOperationPackages.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full w-7 h-7 flex items-center justify-center animate-pulse shadow-lg">
                        {activeOperationPackages.length}
                    </span>
                )}
            </button>
            </div>

            {/* DRAWER OVERLAY */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity duration-300"
                    style={{ zIndex: 9998 }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* DRAWER PANEL */}
            <div
                className={`fixed top-0 right-0 h-screen w-[90%] max-w-7xl bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ zIndex: 9999 }}
            >
                {/* DRAWER HEADER */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📦</span>
                        <div>
                            <h2 className="text-xl font-bold">Anlık Sipariş Takibi</h2>
                            <p className="text-sm text-orange-100">
                                {activeOperationPackages.length} aktif sipariş
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* DRAWER CONTENT */}
                <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                    {activeOperationPackages.length === 0 ? (
                        <div className="text-center py-16 text-slate-500">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-xl font-semibold">Şu an yolda olan sipariş yok</p>
                            <p className="text-sm mt-2">Yeni siparişler geldiğinde burada görünecek</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {activeOperationPackages.map(pkg => (
                                <div
                                    key={pkg.id}
                                    className="relative bg-white rounded-xl border-2 border-slate-200 p-4 hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
                                >
                                    {/* Tıklanabilir Alan */}
                                    <div onClick={() => setSelectedPackage(pkg)} className="absolute inset-0 z-0 rounded-xl"></div>

                                    {/* 3 Nokta Menüsü */}
                                    <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                                        <OrderActionMenu
                                            package={pkg}
                                            isOpen={openDropdownId === pkg.id}
                                            onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                                            onCancel={handleCancelOrder}
                                        />
                                    </div>

                                    {/* Platform Badge */}
                                    {pkg.platform && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <span className={`text-[8px] py-1 px-2 rounded font-bold ${getPlatformBadgeClass(pkg.platform)}`}>
                                                {getPlatformDisplayName(pkg.platform)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="space-y-3 mt-6 relative z-10">
                                        {/* Sipariş No */}
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-orange-600">
                                                #{pkg.order_number || '...'}
                                            </div>
                                        </div>

                                        {/* Restoran */}
                                        <div className="text-center">
                                            <div className="text-[10px] text-slate-700 font-medium truncate px-1">
                                                {pkg.restaurant?.name || 'Bilinmeyen'}
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-200"></div>

                                        {/* Durum Badge */}
                                        <div className="flex justify-center">
                                            <span className={`text-[9px] px-2 py-1 rounded font-semibold ${
                                                pkg.status === 'assigned' ? 'bg-orange-100 text-orange-700' :
                                                pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {pkg.status === 'assigned' ? '👤 Atandı' :
                                                 pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                                            </span>
                                        </div>

                                        {/* Kurye */}
                                        {pkg.courier_id && (
                                            <div className="flex justify-center">
                                                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-semibold truncate max-w-full">
                                                    🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                                                </span>
                                            </div>
                                        )}

                                        <div className="border-t border-slate-200"></div>

                                        {/* Tutar */}
                                        <div className="text-center">
                                            <div className="text-xl font-black text-green-600">
                                                {pkg.amount}₺
                                            </div>
                                        </div>

                                        {/* Paket İçeriği */}
                                        {pkg.content && (
                                            <div className="text-center">
                                                <div className="text-[9px] text-slate-600 truncate px-1">
                                                    {pkg.content}
                                                </div>
                                            </div>
                                        )}

                                        {/* Müşteri */}
                                        <div className="text-center">
                                            <div className="text-[9px] text-slate-600 truncate px-1">
                                                {pkg.customer_name}
                                            </div>
                                        </div>

                                        {/* Ödeme */}
                                        <div className="flex justify-center">
                                            <span className={`text-[9px] px-2 py-1 rounded font-medium ${
                                                pkg.payment_method === 'cash'
                                                    ? 'bg-green-50 text-green-700'
                                                    : pkg.payment_method === 'iban'
                                                    ? 'bg-purple-50 text-purple-700'
                                                    : 'bg-orange-50 text-orange-700'
                                            }`}>
                                                {pkg.payment_method === 'cash' ? '💵 Nakit' : pkg.payment_method === 'iban' ? '🏦 IBAN' : '💳 Kart'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
