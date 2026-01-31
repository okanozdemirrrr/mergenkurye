/**
 * @file src/app/admin/components/OrderActivityFeed.tsx
 * @description Anlık Sipariş Durumu Bileşeni + Canlı Harita.
 * Sol tarafta Malatya haritası, sağ tarafta yatay kaydırmalı sipariş kartları.
 */
'use client'

import dynamic from 'next/dynamic'
import { Package, Courier } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'

// Harita bileşenini dinamik olarak yükle (SSR devre dışı)
const LiveMapComponent = dynamic(
    () => import('./LiveMapComponent').then(mod => ({ default: mod.LiveMapComponent })),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-slate-500">Harita yükleniyor...</div> }
)

interface OrderActivityFeedProps {
    packages: Package[]
    couriers: Courier[]
    openDropdownId: number | null
    setOpenDropdownId: (id: number | null) => void
    handleCancelOrder: (id: number, details: string) => void
}

export function OrderActivityFeed({
    packages,
    couriers,
    openDropdownId,
    setOpenDropdownId,
    handleCancelOrder
}: OrderActivityFeedProps) {
    // Aktif operasyondaki paketleri filtrele (iptal edilenler HARİÇ)
    const activeOperationPackages = packages.filter(pkg =>
        (pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') &&
        pkg.status !== 'cancelled'
    )

    return (
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-3 mb-3">
            <h2 className="text-base font-bold mb-2">🚀 Anlık Sipariş Durumu & Canlı Harita</h2>
            
            {/* Grid Layout: SOL Kartlar, SAĞ Harita - YER DEĞİŞTİRİLDİ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* SOL: Sipariş Kartları (65%) */}
                <div className="lg:col-span-2">
                    {activeOperationPackages.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm h-[500px] flex flex-col items-center justify-center">
                            <div className="text-4xl mb-2">📭</div>
                            <p>Şu an yolda olan sipariş yok</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-2 h-[500px]">
                            <div className="flex gap-3 min-w-max h-full items-start">
                                {activeOperationPackages.map(pkg => (
                                    <div 
                                        key={pkg.id} 
                                        className="relative bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-600 p-3 w-[160px] flex-shrink-0 hover:shadow-lg transition-shadow"
                                    >
                                        {/* 3 Nokta Menüsü */}
                                        <div className="absolute top-1.5 left-1.5 z-10">
                                            <OrderActionMenu
                                                package={pkg}
                                                isOpen={openDropdownId === pkg.id}
                                                onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                                                onCancel={handleCancelOrder}
                                            />
                                        </div>

                                        {/* Platform Badge */}
                                        {pkg.platform && (
                                            <div className="absolute top-1.5 right-1.5">
                                                <span className={`text-[7px] py-0.5 px-1 rounded font-bold ${getPlatformBadgeClass(pkg.platform)}`}>
                                                    {getPlatformDisplayName(pkg.platform)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="space-y-2 mt-5">
                                            {/* Sipariş No - Merkez */}
                                            <div className="text-center">
                                                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                                    #{pkg.order_number || '...'}
                                                </div>
                                            </div>

                                            {/* Restoran - Merkez */}
                                            <div className="text-center">
                                                <div className="text-[9px] text-slate-700 dark:text-slate-300 font-medium truncate px-1">
                                                    {pkg.restaurant?.name || 'Bilinmeyen'}
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="border-t border-slate-200 dark:border-slate-600"></div>

                                            {/* Durum Badge - Merkez */}
                                            <div className="flex justify-center">
                                                <span className={`text-[8px] px-2 py-1 rounded font-semibold ${
                                                    pkg.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                    {pkg.status === 'assigned' ? '👤 Atandı' :
                                                     pkg.status === 'picking_up' ? '🏃 Alınıyor' : '🚗 Yolda'}
                                                </span>
                                            </div>
                                            
                                            {/* Kurye - Merkez */}
                                            {pkg.courier_id && (
                                                <div className="flex justify-center">
                                                    <span className="text-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded font-semibold truncate max-w-full">
                                                        🚴 {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Divider */}
                                            <div className="border-t border-slate-200 dark:border-slate-600"></div>

                                            {/* Tutar - Merkez, Büyük */}
                                            <div className="text-center">
                                                <div className="text-[16px] font-black text-green-600 dark:text-green-400">
                                                    {pkg.amount}₺
                                                </div>
                                            </div>

                                            {/* Paket İçeriği */}
                                            {pkg.content && (
                                                <div className="text-center">
                                                    <div className="text-[8px] text-slate-600 dark:text-slate-400 truncate px-1">
                                                        {pkg.content}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Müşteri */}
                                            <div className="text-center">
                                                <div className="text-[8px] text-slate-600 dark:text-slate-400 truncate px-1">
                                                    {pkg.customer_name}
                                                </div>
                                            </div>

                                            {/* Ödeme - Merkez */}
                                            <div className="flex justify-center">
                                                <span className={`text-[8px] px-2 py-1 rounded font-medium ${
                                                    pkg.payment_method === 'cash'
                                                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                }`}>
                                                    {pkg.payment_method === 'cash' ? '💵 Nakit' : '💳 Kart'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* SAĞ: Canlı Harita (35%) */}
                <div className="lg:col-span-1 h-[500px]">
                    <LiveMapComponent packages={packages} couriers={couriers} />
                </div>
            </div>
        </div>
    )
}
