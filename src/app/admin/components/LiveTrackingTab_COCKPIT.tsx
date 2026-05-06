/**
 * @file src/app/admin/components/LiveTrackingTab_COCKPIT.tsx
 * @description LOJİSTİK KOKPİT - Deneysel UI/UX Revizyonu (Local Test Only)
 * 
 * TASARIM FELSEFESİ:
 * - Sıfır Ölü Boşluk: Her piksel değerli
 * - Ana Odak: Siparişler (%65-70)
 * - İkincil Odak: Kurye Durumları (Sağ Üst %30)
 * - Üçüncül Odak: Minimap (Sağ Alt - Referans)
 * - 100vh içinde her şey, scroll yok
 */
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Package, Courier } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { OrderDrawer } from './OrderDrawer'
import { CourierTransferModal } from './CourierTransferModal'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { formatTurkishTime } from '@/utils/dateHelpers'
import Image from 'next/image'

// Minimap - Lazy load
const LiveMapComponent = dynamic(
    () => import('./LiveMapComponent').then(mod => ({ default: mod.LiveMapComponent })),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-slate-500 text-xs">Harita...</div> }
)

interface LiveTrackingTabProps {
    packages: Package[]
    couriers: Courier[]
    restaurants: any[]
    isLoading: boolean
    selectedCouriers: { [key: number]: string }
    assigningIds: Set<number>
    openDropdownId: number | null
    setOpenDropdownId: (id: number | null) => void
    handleCourierChange: (packageId: number, courierId: string) => void
    handleAssignCourier: (packageId: number) => void
    handleCancelOrder: (id: number, details: string) => void
    todayDeliveredCount: number
}

export function LiveTrackingTab({
    packages,
    couriers,
    restaurants,
    isLoading,
    selectedCouriers,
    assigningIds,
    openDropdownId,
    setOpenDropdownId,
    handleCourierChange,
    handleAssignCourier,
    handleCancelOrder,
    todayDeliveredCount
}: LiveTrackingTabProps) {
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
    const [transferPackage, setTransferPackage] = useState<Package | null>(null)
    
    const unassignedPackages = packages.filter(pkg => 
        !pkg.courier_id && 
        pkg.status !== 'cancelled' &&
        pkg.status !== 'delivered'
    )
    
    const assignedPackages = packages.filter(pkg => pkg.courier_id && pkg.status !== 'cancelled')

    const getStatusText = (status: string) => {
        switch (status) {
            case 'new_order': return 'Yeni'
            case 'getting_ready': return 'Hazırlanıyor'
            case 'ready': return 'Hazır'
            case 'assigned': return 'Atandı'
            case 'picking_up': return 'Alınıyor'
            case 'on_the_way': return 'Yolda'
            default: return status
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'new_order': return '🔵'
            case 'getting_ready': return '👨‍🍳'
            case 'ready': return '✅'
            case 'assigned': return '👤'
            case 'picking_up': return '🏃'
            case 'on_the_way': return '🚗'
            default: return '📦'
        }
    }

    return (
        <>
            {/* MODALS */}
            {transferPackage && (
                <CourierTransferModal
                    package={transferPackage}
                    couriers={couriers}
                    onClose={() => setTransferPackage(null)}
                    onSuccess={() => console.log('✅ Kurye devri başarılı')}
                />
            )}

            {selectedPackage && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-2" onClick={() => setSelectedPackage(null)}>
                    <div className="bg-slate-900 rounded-lg p-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
                            <h3 className="text-lg font-bold text-white">📦 #{selectedPackage.order_number}</h3>
                            <button onClick={() => setSelectedPackage(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">Restoran</p>
                                    <p className="text-white font-semibold">{selectedPackage.restaurant?.name}</p>
                                </div>
                                <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">Tutar</p>
                                    <p className="text-green-400 font-bold text-lg">{selectedPackage.amount}₺</p>
                                </div>
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <p className="text-slate-400 text-xs">Müşteri</p>
                                <p className="text-white">{selectedPackage.customer_name}</p>
                                {selectedPackage.customer_phone && <p className="text-slate-300 text-xs">📞 {selectedPackage.customer_phone}</p>}
                            </div>
                            <div className="bg-slate-800 p-2 rounded">
                                <p className="text-slate-400 text-xs">Adres</p>
                                <p className="text-white text-xs">{selectedPackage.delivery_address}</p>
                            </div>
                            {selectedPackage.content && (
                                <div className="bg-slate-800 p-2 rounded">
                                    <p className="text-slate-400 text-xs">İçerik</p>
                                    <p className="text-orange-200 text-xs">{selectedPackage.content}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <OrderDrawer
                packages={assignedPackages}
                couriers={couriers}
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
                handleCancelOrder={handleCancelOrder}
            />

            {/* KOKPİT LAYOUT - 100vh, Sıfır Boşluk */}
            <div className="h-[calc(100vh-4rem)] flex flex-col gap-2 overflow-hidden">
                {/* HEADER - Minimal Logo + Başlık */}
                <div className="flex items-center gap-3 px-2 py-1 bg-slate-900 border-b border-slate-800">
                    <Image 
                        src="/logo.png" 
                        alt="Mergen Kurye" 
                        width={32} 
                        height={32} 
                        className="h-8 w-auto"
                    />
                    <h1 className="text-lg font-bold text-white">🎯 Lojistik Kokpit</h1>
                    <div className="ml-auto flex items-center gap-3 text-xs">
                        <span className="text-slate-400">📦 Aktif: <span className="text-white font-bold">{unassignedPackages.length}</span></span>
                        <span className="text-slate-400">🚚 Yolda: <span className="text-orange-400 font-bold">{assignedPackages.length}</span></span>
                        <span className="text-slate-400">✅ Bugün: <span className="text-green-400 font-bold">{todayDeliveredCount}</span></span>
                    </div>
                </div>

                {/* MAIN GRID - 12 Kolon */}
                <div className="flex-1 grid grid-cols-12 gap-2 px-2 pb-2 overflow-hidden">
                    {/* SOL + ORTA: SİPARİŞLER (8 kolon = %67) */}
                    <div className="col-span-8 flex flex-col gap-2 overflow-hidden">
                        {/* Sipariş Grid - Compact Cards */}
                        <div className="flex-1 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex flex-col">
                            <div className="px-2 py-1.5 border-b border-slate-800 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white">📦 Canlı Siparişler</h2>
                                <span className="text-xs text-slate-400">{unassignedPackages.length} sipariş</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="grid grid-cols-3 gap-2">
                                    {isLoading ? (
                                        <div className="col-span-3 text-center py-8 text-slate-500 text-xs">Yükleniyor...</div>
                                    ) : unassignedPackages.length === 0 ? (
                                        <div className="col-span-3 text-center py-8 text-slate-500 text-xs">Sipariş yok</div>
                                    ) : (
                                        unassignedPackages.map(pkg => (
                                            <div 
                                                key={pkg.id} 
                                                className="relative bg-slate-800 rounded border-l-2 border-orange-500 hover:bg-slate-700 transition-colors cursor-pointer"
                                                onClick={() => setSelectedPackage(pkg)}
                                            >
                                                {/* 3 Nokta Menü */}
                                                <div className="absolute top-1 left-1 z-10" onClick={(e) => e.stopPropagation()}>
                                                    <OrderActionMenu
                                                        package={pkg}
                                                        isOpen={openDropdownId === pkg.id}
                                                        onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                                                        onCancel={handleCancelOrder}
                                                    />
                                                </div>

                                                <div className="p-2 pl-7">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-orange-400">#{pkg.order_number || '...'}</span>
                                                        <span className="text-[9px] text-slate-400">{formatTurkishTime(pkg.created_at).split(' ')[1]}</span>
                                                    </div>

                                                    {/* Restoran + Tutar */}
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] text-orange-300 truncate">🍽️ {pkg.restaurant?.name}</span>
                                                        <span className="text-xs font-bold text-green-400">{pkg.amount}₺</span>
                                                    </div>

                                                    {/* Durum */}
                                                    <div className="mb-1">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                            pkg.status === 'new_order' ? 'bg-blue-900/50 text-blue-300' :
                                                            pkg.status === 'getting_ready' ? 'bg-cyan-900/50 text-cyan-300' :
                                                            pkg.status === 'ready' ? 'bg-teal-900/50 text-teal-300' :
                                                            'bg-yellow-900/50 text-yellow-300'
                                                        }`}>
                                                            {getStatusIcon(pkg.status)} {getStatusText(pkg.status)}
                                                        </span>
                                                    </div>

                                                    {/* Müşteri */}
                                                    <p className="text-[10px] text-white truncate mb-1">👤 {pkg.customer_name}</p>

                                                    {/* Adres */}
                                                    <p className="text-[9px] text-slate-400 line-clamp-2 mb-2">📍 {pkg.delivery_address}</p>

                                                    {/* Kurye Atama - Sadece ready durumunda */}
                                                    {!pkg.courier_id && pkg.status === 'ready' && (
                                                        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                                            <select
                                                                value={selectedCouriers[pkg.id] || ''}
                                                                onChange={(e) => handleCourierChange(pkg.id, e.target.value)}
                                                                className="w-full bg-slate-700 text-white border border-slate-600 rounded px-1 py-1 text-[10px]"
                                                                disabled={assigningIds.has(pkg.id)}
                                                            >
                                                                <option value="">Kurye Seç</option>
                                                                {couriers.filter(c => c.is_active).map(c => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.full_name} ({c.activePackageCount || 0})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => handleAssignCourier(pkg.id)}
                                                                disabled={!selectedCouriers[pkg.id] || assigningIds.has(pkg.id)}
                                                                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white px-2 py-1 rounded text-[10px] font-semibold"
                                                            >
                                                                {assigningIds.has(pkg.id) ? '⏳' : '✅ Ata'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Atanmış Kurye */}
                                                    {pkg.courier_id && (
                                                        <div className="text-center">
                                                            <span className="text-[9px] bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded">
                                                                🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ: KURYE DURUMLARI + MİNİMAP (4 kolon = %33) */}
                    <div className="col-span-4 flex flex-col gap-2 overflow-hidden">
                        {/* KURYE DURUMLARI - Üstte */}
                        <div className="h-1/2 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex flex-col">
                            <div className="px-2 py-1.5 border-b border-slate-800 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white">🚴 Kuryeler</h2>
                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                                    {couriers.filter(c => c.is_active).length} aktif
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {couriers.filter(c => c.is_active).map(c => {
                                    const courierPackages = assignedPackages.filter(pkg => pkg.courier_id === c.id)
                                    return (
                                        <div key={c.id} className="bg-slate-800 rounded p-1.5 border border-slate-700">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-bold text-white truncate">{c.full_name}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] text-green-400">📦 {c.todayDeliveryCount || 0}</span>
                                                    <span className="text-[9px] text-orange-400">🚚 {c.activePackageCount || 0}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                                                <span className="text-[9px] text-slate-400">{c.is_active ? 'Aktif' : 'Pasif'}</span>
                                            </div>
                                            {courierPackages.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {courierPackages.slice(0, 2).map(pkg => (
                                                        <div 
                                                            key={pkg.id} 
                                                            onClick={() => setSelectedPackage(pkg)}
                                                            className="text-[9px] bg-slate-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-600 truncate"
                                                        >
                                                            {pkg.status === 'assigned' ? '👤' : pkg.status === 'picking_up' ? '🏃' : '🚗'} {pkg.delivery_address}
                                                        </div>
                                                    ))}
                                                    {courierPackages.length > 2 && (
                                                        <div className="text-[9px] text-slate-500 text-center">+{courierPackages.length - 2} daha</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* MİNİMAP - Altta */}
                        <div className="h-1/2 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden flex flex-col">
                            <div className="px-2 py-1.5 border-b border-slate-800">
                                <h2 className="text-sm font-bold text-white">🗺️ Minimap</h2>
                            </div>
                            <div className="flex-1 relative">
                                <LiveMapComponent packages={packages} couriers={couriers} restaurants={restaurants} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
