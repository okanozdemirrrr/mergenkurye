/**
 * @file src/app/admin/components/LiveTrackingTab.tsx
 * @description Canlı Takip Paneli Bileşeni.
 * Aktif operasyonların (bekleyen, atanan, yolda olan siparişler) gerçek zamanlı 
 * izlendiği ve yönetildiği ana sekmeyi oluşturur. Siparişlere kurye atama, 
 * sipariş iptali (3 nokta menüsü üzerinden) ve kuryelerin anlık yük durumlarını 
 * görüntüleme yeteneklerine sahiptir.
 */
'use client'

import dynamic from 'next/dynamic'
import { Package, Courier } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { OrderDrawer } from './OrderDrawer'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { formatTurkishTime } from '@/utils/dateHelpers'

// Harita bileşenini dinamik olarak yükle (SSR devre dışı)
const LiveMapComponent = dynamic(
    () => import('./LiveMapComponent').then(mod => ({ default: mod.LiveMapComponent })),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-slate-500">Harita yükleniyor...</div> }
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
    handleCancelOrder
}: LiveTrackingTabProps) {
    // Sol panel: Sadece sahipsiz paketler (kurye atanmamış ve iptal edilmemiş)
    const unassignedPackages = packages.filter(pkg => !pkg.courier_id && pkg.status !== 'cancelled')
    
    // Sağ panel: Kurye atanmış paketler (iptal edilmemiş)
    const assignedPackages = packages.filter(pkg => pkg.courier_id && pkg.status !== 'cancelled')

    return (
        <>
            {/* DRAWER BUTONU - EN ÜSTTE SABİT */}
            <OrderDrawer
                packages={assignedPackages}
                couriers={couriers}
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
                handleCancelOrder={handleCancelOrder}
            />
            
            <div className="space-y-2">
            {/* CANLI HARİTA + KURYE DURUMLARI - YAN YANA */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                {/* SOL: Canlı Harita (3/4) */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900 shadow-xl rounded-2xl p-2 border border-slate-800" style={{ position: 'relative', zIndex: 1 }}>
                        {/* Başlık ve İstatistikler - Yatay */}
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                                <span>🗺️</span>
                                <span>Canlı Harita</span>
                            </h2>
                            
                            {/* İstatistikler - Yatay */}
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400">📦 Toplam:</span>
                                    <span className="font-bold text-white">{packages.filter(pkg => pkg.latitude && pkg.longitude && pkg.status !== 'delivered' && pkg.status !== 'cancelled').length}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400">🚚 Yolda:</span>
                                    <span className="font-bold text-orange-400">{packages.filter(pkg => pkg.latitude && pkg.longitude && (pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way')).length}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400">⏳ Bekleyen:</span>
                                    <span className="font-bold text-yellow-400">{packages.filter(pkg => pkg.latitude && pkg.longitude && pkg.status === 'waiting').length}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400">🏍️ Kuryeler:</span>
                                    <span className="font-bold text-white">{couriers.filter(c => c.last_location?.latitude && c.last_location?.longitude && c.is_active).length}</span>
                                </div>
                                
                                {/* Renk Lejantı */}
                                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <span className="text-[10px] text-slate-400">Sahipsiz/Teslimat</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <span className="text-[10px] text-slate-400">Restoran Yolu</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-[10px] text-slate-400">Atanmış/Boşta</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="h-[500px] w-full rounded-xl overflow-hidden">
                            <LiveMapComponent packages={packages} couriers={couriers} restaurants={restaurants} />
                        </div>
                    </div>
                </div>

                {/* SAĞ: Kurye Durumları (1/4) */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 shadow-xl rounded-2xl p-2 sticky top-4 border border-slate-800">
                        <h2 className="text-sm font-bold mb-2 text-white">🚴 Kurye Durumları</h2>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {couriers.map(c => {
                                const courierPackages = assignedPackages.filter(pkg => pkg.courier_id === c.id)

                                return (
                                    <div
                                        key={c.id}
                                        className="p-2 bg-slate-800 rounded-lg border border-slate-700"
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="font-bold text-xs text-white">{c.full_name}</span>
                                            <div className="text-right">
                                                <span className="text-[10px] text-green-400 block font-semibold">
                                                    📦 {c.todayDeliveryCount || 0} bugün
                                                </span>
                                                <span className="text-[10px] text-orange-400 block font-semibold">
                                                    🚚 {c.activePackageCount || 0} üzerinde
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-1.5">
                                            {!c.is_active && <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold">⚫ AKTİF DEĞİL</span>}
                                            {c.is_active && <span className="text-[9px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded font-bold">🟢 AKTİF</span>}
                                        </div>

                                        {courierPackages.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {courierPackages.map(pkg => (
                                                    <div key={pkg.id} className="text-[10px] flex items-center gap-1">
                                                        <span className={`px-2 py-0.5 rounded-full font-semibold ${pkg.status === 'waiting' ? 'bg-yellow-900/50 text-yellow-300' :
                                                            pkg.status === 'assigned' ? 'bg-orange-900/50 text-orange-300' :
                                                                pkg.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                                                                    'bg-red-900/50 text-red-300'
                                                            }`}>
                                                            {pkg.status === 'waiting' ? '⏳ Bekliyor' :
                                                                pkg.status === 'assigned' ? '👤 Atandı' :
                                                                    pkg.status === 'picking_up' ? '🏃 Alıyor' : '🚗 Yolda'}
                                                        </span>
                                                        <span className="text-slate-300 truncate">
                                                            {pkg.customer_name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                <div className="lg:col-span-3 space-y-2">
                    {/* SİPARİŞ KARTLARI */}
                    <div className="bg-slate-900 shadow-xl rounded-2xl p-3 border border-slate-800">
                        <h2 className="text-xl font-bold mb-3 text-white">📦 Canlı Sipariş Takibi</h2>

                        {/* Sipariş Kartları */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {isLoading ? (
                                <div className="col-span-full text-center py-8 text-slate-500">Siparişler yükleniyor...</div>
                            ) : unassignedPackages.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-slate-500">Kurye bekleyen sipariş bulunmuyor.</div>
                            ) : (
                                unassignedPackages.map(pkg => (
                                    <div key={pkg.id} className={`relative bg-slate-800 p-3 rounded-lg border-l-4 shadow-sm ${pkg.status === 'waiting' ? 'border-l-yellow-500' :
                                        pkg.status === 'assigned' ? 'border-l-orange-500' :
                                            pkg.status === 'picking_up' ? 'border-l-orange-500' :
                                                'border-l-red-500'
                                        } border-r border-t border-b border-slate-700`}>

                                        {/* 3 Nokta Menüsü */}
                                        <div className="absolute top-2 left-2 z-10">
                                            <OrderActionMenu
                                                package={pkg}
                                                isOpen={openDropdownId === pkg.id}
                                                onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                                                onCancel={handleCancelOrder}
                                            />
                                        </div>

                                        {/* Sipariş Bilgileri */}
                                        <div className="flex justify-between items-center mb-2 ml-8">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${pkg.order_number
                                                    ? 'text-orange-600 bg-orange-900/50'
                                                    : 'text-slate-400 bg-slate-100 animate-pulse'
                                                    }`}>
                                                    {pkg.order_number || '......'}
                                                </span>
                                                {pkg.platform && (
                                                    <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                                                        {getPlatformDisplayName(pkg.platform)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                🕐 {formatTurkishTime(pkg.created_at)}
                                            </span>
                                        </div>

                                        {/* Restoran ve Tutar */}
                                        <div className="flex justify-between items-start mb-2 ml-8">
                                            <span className="bg-orange-900/50 text-orange-300 px-2 py-1 rounded text-sm font-bold">
                                                🍽️ {pkg.restaurant?.name || 'Bilinmeyen'}
                                            </span>
                                            <span className="text-lg font-bold text-green-400">
                                                {pkg.amount}₺
                                            </span>
                                        </div>

                                        {/* Durum */}
                                        <div className="mb-2 ml-8">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                pkg.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                                                !pkg.courier_id && pkg.status !== 'waiting' && pkg.status !== 'delivered' && pkg.status !== 'cancelled'
                                                ? 'bg-red-900/50 text-red-300 animate-pulse'
                                                : pkg.status === 'waiting' ? 'bg-yellow-900/50 text-yellow-300' :
                                                    pkg.status === 'assigned' ? 'bg-orange-900/50 text-orange-300' :
                                                        pkg.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                                                            'bg-red-900/50 text-red-300'
                                                }`}>
                                                {pkg.status === 'cancelled' ? '🚫 İPTAL EDİLDİ' :
                                                !pkg.courier_id && pkg.status !== 'waiting' && pkg.status !== 'delivered' && pkg.status !== 'cancelled'
                                                    ? '⚠️ SAHİPSİZ PAKET'
                                                    : pkg.status === 'waiting' ? '⏳ Kurye Bekliyor' :
                                                        pkg.status === 'assigned' ? '👤 Atandı' :
                                                            pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                                            </span>
                                        </div>

                                        {/* Müşteri Bilgileri */}
                                        <div className="space-y-2 mb-3 ml-8">
                                            <h3 className="font-semibold text-sm text-white">
                                                👤 {pkg.customer_name}
                                            </h3>

                                            {pkg.customer_phone && (
                                                <p className="text-xs text-slate-300">
                                                    📞 {pkg.customer_phone}
                                                </p>
                                            )}

                                            {pkg.content && (
                                                <div>
                                                    <p className="text-xs text-slate-300">Paket İçeriği:</p>
                                                    <p className="text-xs text-orange-200 bg-orange-900/30 p-1.5 rounded border border-orange-700">
                                                        📝 {pkg.content}
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-xs text-slate-300">Adres:</p>
                                                <p className="text-xs text-slate-200 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                    📍 {pkg.delivery_address}
                                                </p>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.payment_method === 'cash'
                                                    ? 'bg-green-900/50 text-green-300'
                                                    : 'bg-orange-900/50 text-orange-300'
                                                    }`}>
                                                    {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Kurye Atama */}
                                        {!pkg.courier_id && pkg.status !== 'delivered' && pkg.status !== 'cancelled' && (
                                            <div className="border-t border-slate-700 pt-2 space-y-2">
                                                <select
                                                    value={selectedCouriers[pkg.id] || ''}
                                                    onChange={(e) => handleCourierChange(pkg.id, e.target.value)}
                                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                                                    disabled={assigningIds.has(pkg.id)}
                                                >
                                                    <option value="">Kurye Seçin</option>
                                                    {couriers.filter(c => c.is_active).length === 0 ? (
                                                        <option disabled>⚠️ Aktif Kurye Bulunmuyor</option>
                                                    ) : (
                                                        <>
                                                            <option disabled>Kurye Seçin (Aktif: {couriers.filter(c => c.is_active).length})</option>
                                                            {couriers
                                                                .filter(c => c.is_active)
                                                                .map(c => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.full_name} ({c.todayDeliveryCount || 0} bugün, {c.activePackageCount || 0} aktif)
                                                                    </option>
                                                                ))
                                                            }
                                                        </>
                                                    )}
                                                </select>
                                                <button
                                                    onClick={() => handleAssignCourier(pkg.id)}
                                                    disabled={!selectedCouriers[pkg.id] || assigningIds.has(pkg.id)}
                                                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                                                >
                                                    {assigningIds.has(pkg.id) ? '⏳ Atanıyor...' : '✅ Kurye Ata'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Atanmış Kurye */}
                                        {pkg.courier_id && (pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') && (
                                            <div className="border-t border-slate-700 pt-2">
                                                <div className="flex items-center justify-center">
                                                    <span className="bg-orange-900/50 text-orange-300 px-2 py-1 rounded text-xs font-medium">
                                                        🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}
