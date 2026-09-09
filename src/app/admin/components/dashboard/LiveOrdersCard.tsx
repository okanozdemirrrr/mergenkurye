/**
 * @file src/app/admin/components/dashboard/LiveOrdersCard.tsx
 * @description Canlı Sipariş Takibi Kartı - Draggable
 */
'use client'

import { useState, useEffect } from 'react'
import { Package, Courier } from '@/types'
import { OrderActionMenu } from '@/components/ui/OrderActionMenu'
import { getPlatformBadgeClass, getPlatformDisplayName } from '@/app/lib/platformUtils'
import { formatTurkishTime } from '@/utils/dateHelpers'
import {
  Package as PackageIcon, Circle, ChefHat, CheckCircle2, User, Footprints, Car,
  PartyPopper, Ban
} from 'lucide-react'

interface LiveOrdersCardProps {
  packages: Package[]
  couriers: Courier[]
  isLoading: boolean
  selectedCouriers: { [key: number]: string }
  longDistancePackages: { [key: number]: boolean }
  assigningIds: Set<number>
  openDropdownId: number | null
  setOpenDropdownId: (id: number | null) => void
  handleCourierChange: (packageId: number, courierId: string) => void
  handleLongDistanceChange: (packageId: number, isLongDistance: boolean) => void
  handleAssignCourier: (packageId: number) => void
  handleCancelOrder: (id: number, details: string) => void
  onPackageClick: (pkg: Package) => void
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'new_order': return 'Yeni Sipariş'
    case 'getting_ready': return 'Hazırlanıyor'
    case 'ready': return 'Hazır'
    case 'assigned': return 'Atandı'
    case 'picking_up': return 'Alınıyor'
    case 'on_the_way': return 'Yolda'
    case 'delivered': return 'Teslim Edildi'
    case 'cancelled': return 'İptal Edildi'
    default: return status
  }
}

const getStatusIcon = (status: string) => {
  const cls = 'w-3.5 h-3.5 inline'
  switch (status) {
    case 'new_order': return <Circle className={`${cls} text-blue-400`} strokeWidth={1.5} />
    case 'getting_ready': return <ChefHat className={`${cls} text-orange-400`} strokeWidth={1.5} />
    case 'ready': return <CheckCircle2 className={`${cls} text-green-400`} strokeWidth={1.5} />
    case 'assigned': return <User className={`${cls} text-purple-400`} strokeWidth={1.5} />
    case 'picking_up': return <Footprints className={`${cls} text-orange-400`} strokeWidth={1.5} />
    case 'on_the_way': return <Car className={`${cls} text-yellow-400`} strokeWidth={1.5} />
    case 'delivered': return <PartyPopper className={`${cls} text-green-400`} strokeWidth={1.5} />
    case 'cancelled': return <Ban className={`${cls} text-red-400`} strokeWidth={1.5} />
    default: return <PackageIcon className={`${cls} text-gray-400`} strokeWidth={1.5} />
  }
}

export function LiveOrdersCard({
  packages,
  couriers,
  isLoading,
  selectedCouriers,
  longDistancePackages,
  assigningIds,
  openDropdownId,
  setOpenDropdownId,
  handleCourierChange,
  handleLongDistanceChange,
  handleAssignCourier,
  handleCancelOrder,
  onPackageClick
}: LiveOrdersCardProps) {
  const [cardSize, setCardSize] = useState<'compact' | 'normal' | 'large'>('normal')

  useEffect(() => {
    const readSize = () => {
      const saved = localStorage.getItem('admin_order_card_size') as 'compact' | 'normal' | 'large'
      if (saved) setCardSize(saved)
    }

    readSize()
    window.addEventListener('order_card_size_changed', readSize)
    window.addEventListener('storage', readSize)

    return () => {
      window.removeEventListener('order_card_size_changed', readSize)
      window.removeEventListener('storage', readSize)
    }
  }, [])

  const handleSizeChange = (newSize: 'compact' | 'normal' | 'large') => {
    setCardSize(newSize)
    localStorage.setItem('admin_order_card_size', newSize)
    window.dispatchEvent(new Event('order_card_size_changed'))
  }

  // Sahipsiz paketler
  const unassignedPackages = packages.filter(pkg => 
    !pkg.courier_id && 
    pkg.status !== 'cancelled' &&
    pkg.status !== 'delivered'
  )

  const gridClass = cardSize === 'compact'
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 w-full'
    : cardSize === 'large'
    ? 'grid grid-cols-1 xl:grid-cols-2 gap-4 w-full'
    : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full'

  return (
    <div className="h-full w-full min-w-0 flex flex-col p-3">
      {/* Başlık - Drag Handle */}
      <div className="drag-handle flex items-center justify-between p-2 -mx-3 -mt-3 mb-3 bg-slate-800/80 border-b border-slate-800 rounded-t-md cursor-grab active:cursor-grabbing select-none flex-wrap gap-2">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <PackageIcon className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
          <span>Canlı Sipariş Takibi</span>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded font-mono" onMouseDown={(e) => e.stopPropagation()}>
            {unassignedPackages.length} bekleyen
          </span>
        </h2>

        {/* HIZLI KART BOYUTU SEÇİCİ */}
        <div className="flex items-center gap-1 text-[10px]" onMouseDown={(e) => e.stopPropagation()}>
          <span className="text-slate-400 mr-1 hidden sm:inline">Kart Boyutu:</span>
          <button
            type="button"
            onClick={() => handleSizeChange('compact')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              cardSize === 'compact' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
            title="Küçük Kart Görünümü (3-4 Kolon)"
          >
            Küçük
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange('normal')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              cardSize === 'normal' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
            title="Orta / Standart Kart Görünümü (2-3 Kolon)"
          >
            Orta
          </button>
          <button
            type="button"
            onClick={() => handleSizeChange('large')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              cardSize === 'large' ? 'bg-orange-600 text-white font-bold' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
            title="Büyük Kart Görünümü (1-2 Kolon)"
          >
            Büyük
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        className="no-drag flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={gridClass}>

          {isLoading ? (
            <div className="col-span-full text-center py-8 text-slate-500">Siparişler yükleniyor...</div>
          ) : unassignedPackages.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500">Kurye bekleyen sipariş bulunmuyor.</div>
          ) : (
            unassignedPackages.map(pkg => {
              const isWebOrder = pkg.platform === 'web'
              return (
                <div 
                  key={pkg.id} 
                  className={`relative p-3 rounded-md border-l-4 shadow-sm cursor-pointer transition-colors ${
                    isWebOrder
                      ? 'bg-amber-900/20 hover:bg-amber-900/30 border-yellow-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                  } ${pkg.status === 'waiting' ? 'border-l-yellow-500' :
                    pkg.status === 'assigned' ? 'border-l-orange-500' :
                    pkg.status === 'picking_up' ? 'border-l-orange-500' :
                    'border-l-red-500'
                  } border-r border-t border-b`}
                >
                  {isWebOrder && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-md z-20">
                      WEB
                    </span>
                  )}
                  <div onClick={() => onPackageClick(pkg)} className="absolute inset-0 z-0"></div>
                  <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                    <OrderActionMenu
                      package={pkg}
                      isOpen={openDropdownId === pkg.id}
                      onToggle={() => setOpenDropdownId(openDropdownId === pkg.id ? null : pkg.id)}
                      onCancel={handleCancelOrder}
                    />
                  </div>
                  <div className="flex justify-between items-center mb-2 ml-8 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${pkg.order_number
                        ? 'text-orange-600 bg-orange-900/50'
                        : 'text-slate-400 bg-slate-100 animate-pulse'
                      }`}>
                        {pkg.order_number || '......'}
                      </span>
                      {pkg.platform && pkg.platform !== 'web' && (
                        <span className={`text-xs py-0.5 px-2 rounded ${getPlatformBadgeClass(pkg.platform)}`}>
                          {getPlatformDisplayName(pkg.platform)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pkg.latitude != null && pkg.longitude != null && (
                        <span className="text-xs px-2 py-1 rounded-md bg-green-500/20 text-green-400 whitespace-nowrap">
                          📍 Koordinatlı
                        </span>
                      )}
                      <span className="text-xs text-white flex items-center gap-1">
                        {formatTurkishTime(pkg.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start mb-2 ml-8 relative z-10">
                    <span className="bg-orange-900/50 text-orange-300 px-2 py-1 rounded text-sm font-bold">
                      {pkg.restaurant?.name || 'Bilinmeyen'}
                    </span>
                    <span className="text-lg font-bold text-green-400">
                      {pkg.amount}₺
                    </span>
                  </div>
                  <div className="mb-2 ml-8 relative z-10">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      pkg.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                      pkg.status === 'new_order' ? 'bg-blue-900/50 text-blue-300' :
                      pkg.status === 'getting_ready' ? 'bg-cyan-900/50 text-cyan-300' :
                      pkg.status === 'ready' ? 'bg-teal-900/50 text-teal-300 animate-pulse' :
                      pkg.status === 'assigned' ? 'bg-purple-900/50 text-purple-300' :
                      pkg.status === 'picking_up' ? 'bg-orange-900/50 text-orange-300' :
                      pkg.status === 'on_the_way' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-green-900/50 text-green-300'
                    }`}>
                      {getStatusIcon(pkg.status)} {getStatusText(pkg.status).toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 mb-3 ml-8 relative z-10">
                    <h3 className="font-semibold text-sm text-white">
                      {pkg.customer_name}
                    </h3>
                    {pkg.customer_phone && (
                      <p className="text-xs text-white">
                        {pkg.customer_phone}
                      </p>
                    )}
                    {pkg.content && (
                      <div>
                        <p className="text-xs text-white">Paket İçeriği:</p>
                        <p className="text-xs text-orange-200 bg-orange-900/30 p-1.5 rounded border border-orange-700">
                          {pkg.content}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-white">Adres:</p>
                      <p className="text-xs text-slate-100 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {pkg.delivery_address}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${pkg.payment_method === 'cash'
                        ? 'bg-green-900/50 text-green-300'
                        : pkg.payment_method === 'iban'
                        ? 'bg-purple-900/50 text-purple-300'
                        : 'bg-orange-900/50 text-orange-300'
                      }`}>
                        {pkg.payment_method === 'cash' ? 'Nakit' : pkg.payment_method === 'iban' ? 'IBAN' : 'Kart'}
                      </span>
                    </div>
                  </div>
                  {!pkg.courier_id && (pkg.status === 'ready' || pkg.status === 'getting_ready') && (
                    <div className="border-t border-slate-700 pt-2 space-y-2 relative z-20" onClick={(e) => e.stopPropagation()}>
                      <label className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-800/80 border border-purple-500/30 rounded-md cursor-pointer">
                        <span className="text-xs font-medium text-purple-200">Uzak Mesafe Paketi</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={longDistancePackages[pkg.id] ?? false}
                          onClick={() =>
                            handleLongDistanceChange(
                              pkg.id,
                              !(longDistancePackages[pkg.id] ?? false)
                            )
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            longDistancePackages[pkg.id]
                              ? 'bg-purple-600'
                              : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              longDistancePackages[pkg.id]
                                ? 'translate-x-4'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                      <select
                        value={selectedCouriers[pkg.id] || ''}
                        onChange={(e) => handleCourierChange(pkg.id, e.target.value)}
                        className="w-full bg-slate-700 text-white border border-slate-600 rounded px-2 py-2 min-h-[44px] text-xs focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                        disabled={assigningIds.has(pkg.id)}
                      >
                        <option value="">Kurye Seçin</option>
                        {couriers.filter(c => c.is_active).length === 0 ? (
                          <option disabled>Aktif Kurye Bulunmuyor</option>
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
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-3 py-2 min-h-[44px] rounded text-xs font-semibold transition-all"
                      >
                        {assigningIds.has(pkg.id) ? 'Atanıyor...' : 'Kurye Ata'}
                      </button>
                    </div>
                  )}
                  {pkg.courier_id && (pkg.status === 'getting_ready' || pkg.status === 'preparing' || pkg.status === 'ready' || pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way') && (
                    <div className="border-t border-slate-700 pt-2 relative z-10">
                      <div className="flex items-center justify-center">
                        <span className="bg-orange-900/50 text-orange-300 px-2 py-1 rounded text-xs font-medium">
                          {couriers.find(c => c.id === pkg.courier_id)?.full_name || 'Bilinmeyen'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
