/**
 * @file src/app/admin/components/dashboard/LiveMapCard.tsx
 * @description Canlı Harita Kartı - Draggable
 */
'use client'

import dynamic from 'next/dynamic'
import { Package, Courier } from '@/types'
import { Map } from 'lucide-react'

// Harita bileşenini dinamik olarak yükle (SSR devre dışı)
const LiveMapComponent = dynamic(
    () => import('../LiveMapComponent').then(mod => ({ default: mod.LiveMapComponent })),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-slate-500">Harita yükleniyor...</div> }
)

interface LiveMapCardProps {
  packages: Package[]
  couriers: Courier[]
  restaurants: any[]
  onLiveCouriersChange: (count: number) => void
}

export function LiveMapCard({ packages, couriers, restaurants, onLiveCouriersChange }: LiveMapCardProps) {
  const liveCouriersCount = couriers.filter(c => c.is_active && c.latitude && c.longitude).length

  return (
    <div className="h-full w-full min-w-0 flex flex-col p-2">
      {/* Başlık - SADECE buradan sürüklenebilir */}
      <div className="custom-drag-handle cursor-move touch-none flex items-center justify-between p-2 -mx-2 -mt-2 mb-2 bg-slate-800/80 border-b border-slate-800 rounded-t-md select-none flex-wrap gap-2">
        <h2 className="text-sm font-bold flex items-center gap-2 text-white shrink-0 pointer-events-none">
          <Map className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
          <span>Canlı Harita</span>
        </h2>
        
        {/* İstatistikler - Yatay (cancel-drag ile başlıktan izole) */}
        <div className="cancel-drag touch-auto flex items-center flex-wrap gap-x-3 gap-y-1 text-xs cursor-default" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Toplam:</span>
            <span className="font-bold text-white">
              {packages.filter(pkg => pkg.latitude && pkg.longitude && pkg.status !== 'delivered' && pkg.status !== 'cancelled').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Yolda:</span>
            <span className="font-bold text-orange-400">
              {packages.filter(pkg => pkg.latitude && pkg.longitude && (pkg.status === 'assigned' || pkg.status === 'picking_up' || pkg.status === 'on_the_way')).length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Bekleyen:</span>
            <span className="font-bold text-yellow-400">
              {packages.filter(pkg => pkg.latitude && pkg.longitude && pkg.status === 'waiting').length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Kuryeler:</span>
            <span className="font-bold text-white">{liveCouriersCount}</span>
          </div>
          
          {/* Renk Lejantı */}
          <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
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

      
      {/* Harita Container - Kalkan (cancel-drag touch-auto) */}
      <div 
        className="cancel-drag touch-auto flex-1 min-h-0 w-full rounded-md overflow-hidden relative"
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <LiveMapComponent 
          packages={packages} 
          couriers={couriers} 
          restaurants={restaurants} 
          onLiveCouriersChange={onLiveCouriersChange}
        />
      </div>


    </div>
  )
}
