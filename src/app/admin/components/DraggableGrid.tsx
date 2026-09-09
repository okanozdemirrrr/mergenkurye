/**
 * @file src/app/admin/components/DraggableGrid.tsx
 * @description Dashboard için sürüklenebilir ve yeniden boyutlandırılabilir duyarlı (responsive) grid sistemi
 * Sürükleme SADECE .custom-drag-handle başlık çubuğundan yapılabilir (her cihazda).
 * .cancel-drag alanlarına (harita, listeler) dokunulduğunda sürükleme iptal olur.
 */
'use client'

import { useState, useEffect, ReactNode, useCallback } from 'react'
import { Responsive, useContainerWidth, Layout, Layouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// LocalStorage key
const STORAGE_KEY = 'admin_dashboard_layout_v3'

// Masaüstü (lg) layout
const desktopLayout: Layout[] = [
  { i: 'map',            x: 0, y: 0,  w: 8, h: 12, minW: 4, minH: 8 },
  { i: 'courier-status', x: 8, y: 0,  w: 4, h: 12, minW: 3, minH: 8 },
  { i: 'orders',         x: 0, y: 12, w: 8, h: 10, minW: 4, minH: 6 },
  { i: 'courier-routes', x: 8, y: 12, w: 4, h: 10, minW: 3, minH: 6 },
]

// Tablet (md, sm) layout - tam genişlik, alt alta
const tabletLayout: Layout[] = [
  { i: 'map',            x: 0, y: 0,  w: 10, h: 11, minW: 1, minH: 6 },
  { i: 'courier-status', x: 0, y: 11, w: 10, h: 10, minW: 1, minH: 6 },
  { i: 'orders',         x: 0, y: 21, w: 10, h: 11, minW: 1, minH: 6 },
  { i: 'courier-routes', x: 0, y: 32, w: 10, h: 10, minW: 1, minH: 6 },
]

// Mobil (xs, xxs) layout - 1 kolon, alt alta
const mobileLayout: Layout[] = [
  { i: 'map',            x: 0, y: 0,  w: 1, h: 12, minW: 1, minH: 6 },
  { i: 'courier-status', x: 0, y: 12, w: 1, h: 10, minW: 1, minH: 6 },
  { i: 'orders',         x: 0, y: 22, w: 1, h: 12, minW: 1, minH: 6 },
  { i: 'courier-routes', x: 0, y: 34, w: 1, h: 10, minW: 1, minH: 6 },
]

const defaultLayouts: Layouts = {
  lg:  desktopLayout,
  md:  tabletLayout,
  sm:  tabletLayout,
  xs:  mobileLayout,
  xxs: mobileLayout,
}

interface DraggableGridProps {
  children: {
    map: ReactNode
    courierStatus: ReactNode
    orders: ReactNode
    courierRoutes: ReactNode
  }
}

export function DraggableGrid({ children }: DraggableGridProps) {
  const { width, containerRef, mounted } = useContainerWidth()
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts)

  // LocalStorage'dan kayıtlı lg layout'unu yükle
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.lg && Array.isArray(parsed.lg) && parsed.lg.length === 4) {
          setLayouts({
            ...defaultLayouts,
            lg: parsed.lg,
          })
        }
      } catch (e) {
        console.error('Layout yüklenemedi:', e)
      }
    }
  }, [])

  // Layout değişince localStorage'a kaydet
  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    const updated: Layouts = {
      ...allLayouts,
      md:  tabletLayout,
      sm:  tabletLayout,
      xs:  mobileLayout,
      xxs: mobileLayout,
    }
    setLayouts(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [])

  // Düzeni sıfırla
  const resetLayout = useCallback(() => {
    setLayouts(defaultLayouts)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <div ref={containerRef} className="w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-slate-500 text-[11px]">
          Kartları sadece üst başlıktan sürükleyebilirsiniz
        </span>
        <button
          onClick={resetLayout}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-700 transition-colors flex items-center gap-1"
          title="Grid yerleşimini varsayılana sıfırla"
        >
          <span>↺</span> Düzeni Sıfırla
        </button>
      </div>

      {mounted ? (
        <Responsive
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 }}
          rowHeight={30}
          onLayoutChange={handleLayoutChange}
          // ─── Her cihazda sürükleme AKTİF — sadece .custom-drag-handle başlığından ───
          dragConfig={{
            enabled: true,
            handle: '.custom-drag-handle',
            cancel: '.cancel-drag',
          }}
          resizeConfig={{
            enabled: true,
          }}
          compactType="vertical"
          preventCollision={false}
        >
          {/* Canlı Harita */}
          <div key="map" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative">
            {children.map}
          </div>

          {/* Kurye Durumları */}
          <div key="courier-status" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative">
            {children.courierStatus}
          </div>

          {/* Canlı Sipariş Takibi */}
          <div key="orders" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative">
            {children.orders}
          </div>

          {/* Kurye Günlük Rota ve Performans */}
          <div key="courier-routes" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative">
            {children.courierRoutes}
          </div>
        </Responsive>
      ) : (
        <div className="p-4 text-slate-500 text-sm">Yükleniyor...</div>
      )}
    </div>
  )
}
