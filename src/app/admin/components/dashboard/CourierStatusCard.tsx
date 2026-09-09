/**
 * @file src/app/admin/components/dashboard/CourierStatusCard.tsx
 * @description Kurye Durumları Kartı - Draggable
 */
'use client'

import { Package, Courier } from '@/types'
import { SortableCourierStatusList } from '../SortableCourierStatusList'

interface CourierStatusCardProps {
  couriers: Courier[]
  assignedPackages: Package[]
  restaurants: any[]
  todayDeliveredCount: number
  onCouriersOrderChange: (couriers: Courier[]) => void
  onPackageClick: (pkg: Package) => void
}

export function CourierStatusCard({
  couriers,
  assignedPackages,
  restaurants,
  todayDeliveredCount,
  onCouriersOrderChange,
  onPackageClick
}: CourierStatusCardProps) {
  return (
    <div className="h-full w-full min-w-0 flex flex-col p-2">
      {/* Başlık - SADECE buradan sürüklenebilir */}
      <div className="custom-drag-handle cursor-move touch-none flex justify-between items-center p-2 -mx-2 -mt-2 mb-2 bg-slate-800/80 border-b border-slate-800 rounded-t-md select-none">
        <h2 className="text-sm font-bold text-white pointer-events-none">Kurye Durumları</h2>
        <span className="cancel-drag touch-auto bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-default" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          {todayDeliveredCount} bugün
        </span>
      </div>

      
      {/* Content - Kalkan (cancel-drag touch-auto) */}
      <div 
        className="cancel-drag touch-auto flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden space-y-2"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >


        <SortableCourierStatusList
          couriers={couriers}
          assignedPackages={assignedPackages}
          restaurants={restaurants}
          onCouriersOrderChange={onCouriersOrderChange}
          onPackageClick={onPackageClick}
        />
      </div>
    </div>
  )
}
