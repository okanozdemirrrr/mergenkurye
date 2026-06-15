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

export interface SortableCategory {
  id: string
  name: string
  restaurant_id: string
  sort_order: number
  display_order?: number
}

interface SortableCategoryListProps {
  categories: SortableCategory[]
  onCategoriesChange: (categories: SortableCategory[]) => void
  renderCategoryContent: (category: SortableCategory) => React.ReactNode
}

function SortableCategoryItem({
  category,
  children,
}: {
  category: SortableCategory
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

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
      className={`bg-slate-900 rounded-xl p-6 border border-slate-800 ${isDragging ? 'shadow-2xl ring-2 ring-orange-500/50' : ''}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-grab active:cursor-grabbing touch-none"
          aria-label={`${category.name} kategorisini taşı`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={22} />
        </button>
        <h3 className="text-xl font-bold text-white flex-1">{category.name}</h3>
      </div>
      {children}
    </div>
  )
}

async function persistCategorySortOrder(categories: SortableCategory[]) {
  const restaurantId = localStorage.getItem('restoran_logged_restaurant_id')
  if (!restaurantId) throw new Error('Restoran ID bulunamadı')

  const updates = categories.map((category, index) => ({
    id: category.id,
    sort_order: index,
  }))

  const { error } = await supabase.rpc('update_category_sort_orders', {
    p_restaurant_id: restaurantId,
    p_updates: updates,
  })

  if (error) throw error
}

export default function SortableCategoryList({
  categories,
  onCategoriesChange,
  renderCategoryContent,
}: SortableCategoryListProps) {
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories])

  const sensors = useSensor(
    PointerSensor,
    { activationConstraint: { distance: 8 } }
  )
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
  const dndSensors = useSensors(sensors, keyboardSensor)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(categories, oldIndex, newIndex).map((category, index) => ({
      ...category,
      sort_order: index,
      display_order: index,
    }))

    onCategoriesChange(reordered)

    try {
      await persistCategorySortOrder(reordered)
    } catch (error) {
      console.error('Kategori sırası kaydedilemedi:', error)
      onCategoriesChange(categories)
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: { message: '❌ Kategori sırası kaydedilemedi', type: 'error' },
        })
      )
    }
  }

  return (
    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {categories.map((category) => (
            <SortableCategoryItem key={category.id} category={category}>
              {renderCategoryContent(category)}
            </SortableCategoryItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
