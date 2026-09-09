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
    <div className="h-full flex flex-col p-2">
      {/* Başlık - Drag Handle */}
      <div className="drag-handle flex justify-between items-center p-2 -mx-2 -mt-2 mb-2 bg-slate-800/80 border-b border-slate-800 rounded-t-md cursor-grab active:cursor-grabbing select-none">
        <h2 className="text-sm font-bold text-white">Kurye Durumları</h2>
        <span className="bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full text-xs font-semibold" onMouseDown={(e) => e.stopPropagation()}>
          {todayDeliveredCount} bugün
        </span>
      </div>

      
      {/* Content */}
      <div 
        className="no-drag flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2"
        onMouseDown={(e) => e.stopPropagation()}
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
