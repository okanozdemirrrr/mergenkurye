/**
 * @file src/app/admin/components/DraggableGrid.tsx
 * @description Dashboard için sürüklenebilir ve yeniden boyutlandırılabilir duyarlı (responsive) grid sistemi
 */
'use client'

import { useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { Responsive, useContainerWidth, Layout, Layouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// LocalStorage key (yeni duyarlı şema için v2)
const STORAGE_KEY = 'admin_dashboard_layout_v2'

// Masaüstü (lg) layout - Sadece başlıktan sürüklenebilir
const desktopLayout: Layout[] = [
  { i: 'map', x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 8, isDraggable: true, isResizable: true },
  { i: 'courier-status', x: 8, y: 0, w: 4, h: 12, minW: 3, minH: 8, isDraggable: true, isResizable: true },
  { i: 'orders', x: 0, y: 12, w: 8, h: 10, minW: 4, minH: 6, isDraggable: true, isResizable: true },
  { i: 'courier-routes', x: 8, y: 12, w: 4, h: 10, minW: 3, minH: 6, isDraggable: true, isResizable: true },
]

// Tablet (md, sm) layout - Kutular tam genişlik, sabit ve sürükleme kapalı
const tabletLayout: Layout[] = [
  { i: 'map', x: 0, y: 0, w: 10, h: 11, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
  { i: 'courier-status', x: 0, y: 11, w: 10, h: 10, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
  { i: 'orders', x: 0, y: 21, w: 10, h: 11, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
  { i: 'courier-routes', x: 0, y: 32, w: 10, h: 10, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
]

// Mobil (xs, xxs) layout - Kutular kesinlikle 1 kolon, x:0, alt alta ve sabit
const mobileLayout: Layout[] = [
  { i: 'map', x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
  { i: 'courier-status', x: 0, y: 12, w: 1, h: 10, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
  { i: 'orders', x: 0, y: 22, w: 1, h: 12, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
  { i: 'courier-routes', x: 0, y: 34, w: 1, h: 10, minW: 1, minH: 6, isDraggable: false, isResizable: false, static: true },
]

// Varsayılan çoklu cihaz layout yapılandırması
const defaultLayouts: Layouts = {
  lg: desktopLayout,
  md: tabletLayout,
  sm: tabletLayout,
  xs: mobileLayout,
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
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg')

  // İlk render'da ekran genişliğine göre breakpoint tespiti (SSR uyumlu)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth
      if (w < 480) setCurrentBreakpoint('xxs')
      else if (w < 768) setCurrentBreakpoint('xs')
      else if (w < 996) setCurrentBreakpoint('sm')
      else if (w < 1200) setCurrentBreakpoint('md')
      else setCurrentBreakpoint('lg')
    }
  }, [])

  // LocalStorage'dan layout'u yükle (SADECE masaüstü lg için yükle, mobil ve tableti daima sabit tut)
  useEffect(() => {
    const savedLayouts = localStorage.getItem(STORAGE_KEY)
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts)
        const merged: Layouts = {
          ...defaultLayouts,
          lg: (parsed.lg && Array.isArray(parsed.lg) && parsed.lg.length === 4)
            ? parsed.lg.map((item: Layout) => ({ ...item, isDraggable: true, isResizable: true }))
            : desktopLayout,
          md: tabletLayout,
          sm: tabletLayout,
          xs: mobileLayout,
          xxs: mobileLayout,
        }
        setLayouts(merged)
      } catch (error) {
        console.error('Layout yüklenemedi:', error)
      }
    }
  }, [])

  // onBreakpointChange event'i - aktif breakpoint'i güncelle
  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint)
  }, [])

  // Sadece masaüstünde (lg breakpoint ve genişlik > 1024px) sürükleme aktiftir
  // Mobil veya tablet (md, sm, xs, xxs veya genişlik <= 1024px) kesinlikle sürükleneMEZ
  const isDesktop = useMemo(() => {
    if (currentBreakpoint !== 'lg') return false
    if (width > 0 && width <= 1024) return false
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) return false
    return true
  }, [currentBreakpoint, width])

  // Aktif layout'ları masaüstü/mobil durumuna göre hazırla
  // Mobilde ve tablette tüm kutuların static: true ve isDraggable: false olmasını garanti et
  const activeLayouts = useMemo(() => {
    if (isDesktop) {
      return layouts
    }
    const lockedLayouts: Layouts = {}
    for (const [bp, items] of Object.entries(layouts)) {
      lockedLayouts[bp] = (items || []).map((item) => ({
        ...item,
        isDraggable: false,
        isResizable: false,
        static: true,
      }))
    }
    return lockedLayouts
  }, [layouts, isDesktop])

  // Layout değiştiğinde localStorage'a kaydet (sadece masaüstünde serbest düzen kaydedilir)
  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    if (!isDesktop) return

    const updated: Layouts = {
      ...allLayouts,
      md: tabletLayout,
      sm: tabletLayout,
      xs: mobileLayout,
      xxs: mobileLayout,
    }
    setLayouts(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [isDesktop])

  // Layout sıfırlama fonksiyonu
  const resetLayout = useCallback(() => {
    setLayouts(defaultLayouts)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <div ref={containerRef} className="w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="text-xs text-slate-400">
          {!isDesktop ? (
            <span className="text-slate-500 text-[11px]">📱 Mobil / Tablet Görünümü (Sabit Düzen - Sürükleme Kapalı)</span>
          ) : (
            <span className="text-slate-500 text-[11px]">🖥️ Kartları sadece üst başlıktan sürükleyebilirsiniz</span>
          )}
        </div>
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
          layouts={activeLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 }}
          rowHeight={30}
          onBreakpointChange={handleBreakpointChange}
          onLayoutChange={handleLayoutChange}
          // react-grid-layout v2 için dragConfig ve resizeConfig
          dragConfig={{
            enabled: isDesktop,
            handle: '.custom-drag-handle',
            cancel: '.cancel-drag',
          }}
          resizeConfig={{
            enabled: isDesktop,
          }}
          // Geriye dönük uyumluluk için flat proplar
          draggableHandle=".custom-drag-handle"
          draggableCancel=".cancel-drag"
          isDraggable={isDesktop}
          isResizable={isDesktop}
          compactType="vertical"
          preventCollision={false}
        >
          {/* Canlı Harita */}
          <div key="map" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative overflow-hidden">
            {children.map}
          </div>

          {/* Kurye Durumları */}
          <div key="courier-status" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative overflow-hidden">
            {children.courierStatus}
          </div>

          {/* Canlı Sipariş Takibi */}
          <div key="orders" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative overflow-hidden">
            {children.orders}
          </div>

          {/* Kurye Günlük Rota ve Performans */}
          <div key="courier-routes" className="bg-slate-900 shadow-sm rounded-md border border-slate-800 flex flex-col h-full w-full min-w-0 relative overflow-hidden">
            {children.courierRoutes}
          </div>
        </Responsive>
      ) : (
        <div className="p-4 text-slate-500 text-sm">Yükleniyor...</div>
      )}
    </div>
  )
}
