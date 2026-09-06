'use client'

import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { Package, Courier, PackageStatus } from '@/types'
import { getStatusBadgeClass, getStatusLabel, normalizeStatus } from '@/utils/statusHelpers'
import { NightShiftIndicator } from './NightShiftIndicator'

function resolvePackageStatus(status: string): PackageStatus {
  if (status === 'preparing') return 'getting_ready'
  return normalizeStatus(status)
}

interface SortableCourierStatusListProps {
  couriers: Courier[]
  assignedPackages: Package[]
  restaurants: { id?: number | string; name?: string }[]
  onCouriersOrderChange: (couriers: Courier[]) => void
  onPackageClick: (pkg: Package) => void
}

function SortableCourierCard({
  courier,
  courierPackages,
  restaurants,
  onPackageClick,
}: {
  courier: Courier
  courierPackages: Package[]
  restaurants: { id?: number | string; name?: string }[]
  onPackageClick: (pkg: Package) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: courier.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 bg-slate-800 rounded-md border border-slate-700 ${isDragging ? 'shadow-sm ring-2 ring-orange-500/50' : ''}`}
    >
      <div className="flex gap-1.5">
        <button
          type="button"
          className="flex-shrink-0 self-start p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 cursor-grab active:cursor-grabbing touch-none"
          aria-label={`${courier.full_name ?? 'Kurye'} sırasını değiştir`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <NightShiftIndicator isNightShift={courier.is_night_shift} />
              <span className="font-bold text-xs text-white truncate">{courier.full_name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-green-400 block font-semibold">
                {courier.todayDeliveryCount || 0} bugün
              </span>
              <span className="text-[10px] text-orange-400 block font-semibold">
                {courier.activePackageCount || 0} üzerinde
              </span>
            </div>
          </div>

          <div className="mb-1.5">
            {!courier.is_active && (
              <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold">
                AKTİF DEĞİL
              </span>
            )}
            {courier.is_active && (
              <span className="text-[9px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded font-bold">
                AKTİF
              </span>
            )}
          </div>

          {courierPackages.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {courierPackages.map((pkg) => {
                const restoranAdi =
                  pkg.restaurant?.name ??
                  restaurants.find((r) => String(r.id) === String(pkg.restaurant_id))?.name ??
                  'Restoran'
                const adres = pkg.delivery_address || '—'
                const displayStatus = resolvePackageStatus(pkg.status)

                return (
                  <div
                    key={pkg.id}
                    onClick={() => onPackageClick(pkg)}
                    className="w-full overflow-hidden cursor-pointer hover:bg-slate-700/80 py-1 px-1.5 rounded transition-colors"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${getStatusBadgeClass(displayStatus)}`}
                        >
                          {getStatusLabel(displayStatus, true)}
                        </span>
                        <span className="font-semibold text-orange-400 text-[11px] truncate min-w-0">
                          {restoranAdi}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[11px] truncate block pl-0">
                        {adres}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function persistCourierSortOrder(updates: { id: string; sort_order: number }[]) {
  const { error } = await supabase.rpc('update_courier_sort_orders', {
    p_updates: updates,
  })

  if (error) throw error
}

export function SortableCourierStatusList({
  couriers,
  assignedPackages,
  restaurants,
  onCouriersOrderChange,
  onPackageClick,
}: SortableCourierStatusListProps) {
  const activeCouriers = useMemo(
    () => couriers.filter((c) => c.is_active),
    [couriers]
  )
  const courierIds = useMemo(() => activeCouriers.map((c) => c.id), [activeCouriers])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = activeCouriers.findIndex((c) => c.id === active.id)
    const newIndex = activeCouriers.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedActive = arrayMove(activeCouriers, oldIndex, newIndex).map((courier, index) => ({
      ...courier,
      sort_order: index,
    }))

    const sortOrderById = new Map(reorderedActive.map((c) => [c.id, c.sort_order]))
    const updatedCouriers = couriers
      .map((courier) =>
        sortOrderById.has(courier.id)
          ? { ...courier, sort_order: sortOrderById.get(courier.id)! }
          : courier
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    onCouriersOrderChange(updatedCouriers)

    const updates = reorderedActive.map((courier, index) => ({
      id: courier.id,
      sort_order: index,
    }))

    try {
      await persistCourierSortOrder(updates)
    } catch (error) {
      console.error('Kurye sırası kaydedilemedi:', error)
      onCouriersOrderChange(couriers)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={courierIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {activeCouriers.map((courier) => (
            <SortableCourierCard
              key={courier.id}
              courier={courier}
              courierPackages={assignedPackages.filter((pkg) => pkg.courier_id === courier.id)}
              restaurants={restaurants}
              onPackageClick={onPackageClick}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
