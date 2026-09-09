/**
 * @file src/app/admin/components/dashboard/CourierRoutesCard.tsx
 * @description Kurye Günlük Rota ve Performans Kartı - Draggable
 */
'use client'

import { Courier } from '@/types'
import { CourierDailyRoutes } from '../CourierDailyRoutes'

interface CourierRoutesCardProps {
  couriers: Courier[]
}

export function CourierRoutesCard({ couriers }: CourierRoutesCardProps) {
  return (
    <div className="h-full w-full min-w-0 flex flex-col">
      <CourierDailyRoutes couriers={couriers} />
    </div>
  )
}
