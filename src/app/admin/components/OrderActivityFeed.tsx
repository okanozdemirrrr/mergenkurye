/**
 * @file src/app/admin/components/OrderActivityFeed.tsx
 * @description Anlık Sipariş Durumu Bileşeni + Canlı Harita.
 * Üstte tam genişlikte Malatya haritası, altta yatay kaydırmalı sipariş kartları.
 */
'use client'

import dynamic from 'next/dynamic'
import { Package, Courier } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { Rocket, Package as PackageIcon, Inbox, User, Footprints, Car, Bike, Banknote, CreditCard, Building2 } from 'lucide-react'

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
        <div className="bg-slate-900 shadow-sm rounded-md border border-slate-800 p-3 mb-3">
            <h2 className="text-base font-bold mb-2 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              Anlık Sipariş Durumu & Canlı Harita
            </h2>
            
            {/* Dikey Layout: ÜSTTE Harita, ALTTA Kartlar */}
            <div className="space-y-3">
                {/* ÜSTTE: Canlı Harita (Tam Genişlik) */}
                <div className="h-[400px] w-full">
                    <LiveMapComponent packages={packages} couriers={couriers} />
                </div>

                {/* ALTTA: Sipariş Kartları (Yatay Scroll) */}
                <div>
                    <h3 className="text-sm font-semibold mb-2 text-slate-700 flex items-center gap-2">
                        <PackageIcon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                        Canlı Sipariş Takibi ({activeOperationPackages.length})
                    </h3>
                    {activeOperationPackages.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-400" strokeWidth={1.5} />
                            <p>Şu an yolda olan sipariş yok</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-3 min-w-max items-start">
                                {activeOperationPackages.map(pkg => (
                                    <div 
                                        key={pkg.id} 
                                        className="relative bg-white rounded-md border-2 border-slate-200 p-3 w-[160px] flex-shrink-0 hover:shadow-sm transition-shadow"
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
                                                <div className="text-[11px] font-bold text-orange-600">
                                                    #{pkg.order_number || '...'}
                                                </div>
                                            </div>

                                            {/* Restoran - Merkez */}
                                            <div className="text-center">
                                                <div className="text-[9px] text-slate-700 font-medium truncate px-1">
                                                    {pkg.restaurant?.name || 'Bilinmeyen'}
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="border-t border-slate-200"></div>

                                            {/* Durum Badge - Merkez */}
                                            <div className="flex justify-center">
                                                <span className={`text-[8px] px-2 py-1 rounded font-semibold ${
                                                    pkg.status === 'assigned' ? 'bg-orange-100 text-orange-700' :
                                                    pkg.status === 'picking_up' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {pkg.status === 'assigned' ? (
                                                        <span className="inline-flex items-center gap-0.5"><User className="w-2.5 h-2.5" strokeWidth={1.5} /> Atandı</span>
                                                    ) : pkg.status === 'picking_up' ? (
                                                        <span className="inline-flex items-center gap-0.5"><Footprints className="w-2.5 h-2.5" strokeWidth={1.5} /> Alınıyor</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5"><Car className="w-2.5 h-2.5" strokeWidth={1.5} /> Yolda</span>
                                                    )}
                                                </span>
                                            </div>
                                            
                                            {/* Kurye - Merkez */}
                                            {pkg.courier_id && (
                                                <div className="flex justify-center">
                                                    <span className="text-[8px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-semibold truncate max-w-full inline-flex items-center gap-0.5">
                                                        <Bike className="w-2.5 h-2.5" strokeWidth={1.5} /> {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Divider */}
                                            <div className="border-t border-slate-200"></div>

                                            {/* Tutar - Merkez, Büyük */}
                                            <div className="text-center">
                                                <div className="text-[16px] font-black text-green-600">
                                                    {pkg.amount}₺
                                                </div>
                                            </div>

                                            {/* Paket İçeriği */}
                                            {pkg.content && (
                                                <div className="text-center">
                                                    <div className="text-[8px] text-slate-600 truncate px-1">
                                                        {pkg.content}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Müşteri */}
                                            <div className="text-center">
                                                <div className="text-[8px] text-slate-600 truncate px-1">
                                                    {pkg.customer_name}
                                                </div>
                                            </div>

                                            {/* Ödeme - Merkez */}
                                            <div className="flex justify-center">
                                                <span className={`text-[8px] px-2 py-1 rounded font-medium ${
                                                    pkg.payment_method === 'cash'
                                                        ? 'bg-green-50 text-green-700'
                                                        : pkg.payment_method === 'iban'
                                                        ? 'bg-purple-50 text-purple-700'
                                                        : 'bg-orange-50 text-orange-700'
                                                }`}>
                                                    {pkg.payment_method === 'cash' ? (
                                                        <span className="inline-flex items-center gap-0.5"><Banknote className="w-2.5 h-2.5" strokeWidth={1.5} /> Nakit</span>
                                                    ) : pkg.payment_method === 'iban' ? (
                                                        <span className="inline-flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" strokeWidth={1.5} /> IBAN</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5"><CreditCard className="w-2.5 h-2.5" strokeWidth={1.5} /> Kart</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
