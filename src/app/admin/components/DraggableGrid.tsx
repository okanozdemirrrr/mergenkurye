/**
 * @file src/app/admin/components/DraggableGrid.tsx
 * @description Dashboard için sürüklenebilir ve yeniden boyutlandırılabilir grid sistemi
 */
'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Responsive, useContainerWidth, Layout, Layouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// LocalStorage key
const STORAGE_KEY = 'admin_dashboard_layout'

// Varsayılan layout yapılandırması
const defaultLayouts: Layouts = {
  lg: [
    { i: 'map', x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 8 },
    { i: 'courier-status', x: 8, y: 0, w: 4, h: 12, minW: 3, minH: 8 },
    { i: 'orders', x: 0, y: 12, w: 8, h: 10, minW: 4, minH: 6 },
    { i: 'courier-routes', x: 8, y: 12, w: 4, h: 10, minW: 3, minH: 6 },
  ],
  md: [
    { i: 'map', x: 0, y: 0, w: 6, h: 10, minW: 4, minH: 8 },
    { i: 'courier-status', x: 6, y: 0, w: 4, h: 10, minW: 3, minH: 8 },
    { i: 'orders', x: 0, y: 10, w: 6, h: 10, minW: 4, minH: 6 },
    { i: 'courier-routes', x: 6, y: 10, w: 4, h: 10, minW: 3, minH: 6 },
  ],
  sm: [
    { i: 'map', x: 0, y: 0, w: 6, h: 10, minW: 4, minH: 8 },
    { i: 'courier-status', x: 0, y: 10, w: 6, h: 10, minW: 4, minH: 8 },
    { i: 'orders', x: 0, y: 20, w: 6, h: 10, minW: 4, minH: 6 },
    { i: 'courier-routes', x: 0, y: 30, w: 6, h: 10, minW: 4, minH: 6 },
  ],
  xs: [
    { i: 'map', x: 0, y: 0, w: 4, h: 10, minW: 4, minH: 8 },
    { i: 'courier-status', x: 0, y: 10, w: 4, h: 10, minW: 4, minH: 8 },
    { i: 'orders', x: 0, y: 20, w: 4, h: 10, minW: 4, minH: 6 },
    { i: 'courier-routes', x: 0, y: 30, w: 4, h: 10, minW: 4, minH: 6 },
  ],
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

  // LocalStorage'dan layout'u yükle
  useEffect(() => {
    const savedLayouts = localStorage.getItem(STORAGE_KEY)
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts)
        setLayouts(parsed)
      } catch (error) {
        console.error('Layout yüklenemedi:', error)
      }
    }
  }, [])

  // Layout değiştiğinde localStorage'a kaydet
  const handleLayoutChange = (_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts))
  }

  // Layout sıfırlama fonksiyonu
  const resetLayout = () => {
    setLayouts(defaultLayouts)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex justify-end mb-2 px-2">
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
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={30}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          draggableCancel=".leaflet-container, .leaflet-interactive, .no-drag, input, textarea, button, select"
          isDraggable={true}
          isResizable={true}

          compactType="vertical"
          preventCollision={false}
        >
          {/* Canlı Harita */}
          <div key="map" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full relative">
            {children.map}
          </div>

          {/* Kurye Durumları */}
          <div key="courier-status" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full relative">
            {children.courierStatus}
          </div>

          {/* Canlı Sipariş Takibi */}
          <div key="orders" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full relative">
            {children.orders}
          </div>

          {/* Kurye Günlük Rota ve Performans */}
          <div key="courier-routes" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full relative">
            {children.courierRoutes}
          </div>

        </Responsive>
      ) : (
        <div className="p-4 text-slate-500 text-sm">Yükleniyor...</div>
      )}
    </div>
  )
}


