/**
 * @file src/app/admin/components/DraggableGrid.tsx
 * @description Dashboard için sürüklenebilir ve yeniden boyutlandırılabilir duyarlı (responsive) grid sistemi
 */
'use client'

import { useState, useEffect, ReactNode, useCallback } from 'react'
import { Responsive, useContainerWidth, Layout, Layouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// LocalStorage key (yeni duyarlı şema için v2)
const STORAGE_KEY = 'admin_dashboard_layout_v2'

// Masaüstü (lg) layout
const desktopLayout: Layout[] = [
  { i: 'map', x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 8 },
  { i: 'courier-status', x: 8, y: 0, w: 4, h: 12, minW: 3, minH: 8 },
  { i: 'orders', x: 0, y: 12, w: 8, h: 10, minW: 4, minH: 6 },
  { i: 'courier-routes', x: 8, y: 12, w: 4, h: 10, minW: 3, minH: 6 },
]

// Tablet (md, sm) layout - Kutular tam genişlik ve düzgün sıralı
const tabletLayout: Layout[] = [
  { i: 'map', x: 0, y: 0, w: 10, h: 11, minW: 1, minH: 6 },
  { i: 'courier-status', x: 0, y: 11, w: 10, h: 10, minW: 1, minH: 6 },
  { i: 'orders', x: 0, y: 21, w: 10, h: 11, minW: 1, minH: 6 },
  { i: 'courier-routes', x: 0, y: 32, w: 10, h: 10, minW: 1, minH: 6 },
]

// Mobil (xs, xxs) layout - Kutular kesinlikle 1 kolon, x:0 ve alt alta sıralı
const mobileLayout: Layout[] = [
  { i: 'map', x: 0, y: 0, w: 1, h: 12, minW: 1, minH: 6 },
  { i: 'courier-status', x: 0, y: 12, w: 1, h: 10, minW: 1, minH: 6 },
  { i: 'orders', x: 0, y: 22, w: 1, h: 12, minW: 1, minH: 6 },
  { i: 'courier-routes', x: 0, y: 34, w: 1, h: 10, minW: 1, minH: 6 },
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

  // LocalStorage'dan layout'u yükle
  useEffect(() => {
    const savedLayouts = localStorage.getItem(STORAGE_KEY)
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts)
        // Eğer geçerli v2 yapısındaysa ve xs/xxs 1 kolon ise yükle
        if (parsed && parsed.xs && parsed.xs[0]?.w === 1 && parsed.xxs) {
          setLayouts(parsed)
        } else {
          // Eski versiyon ise sadece lg'yi koru, mobil ve tableti yeni varsayılana ayarla
          const merged: Layouts = {
            ...defaultLayouts,
            lg: parsed.lg || desktopLayout,
          }
          setLayouts(merged)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        }
      } catch (error) {
        console.error('Layout yüklenemedi:', error)
      }
    }
  }, [])

  // onBreakpointChange event'i - aktif breakpoint'i güncelle
  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint)
  }, [])

  // Aktif breakpoint xs veya xxs ise (veya genişlik < 768px ise) mobildir
  const isMobile =
    currentBreakpoint === 'xs' ||
    currentBreakpoint === 'xxs' ||
    (width > 0 ? width < 768 : false)

  // Layout değiştiğinde localStorage'a kaydet (mobil modda bozulmaları engelle)
  const handleLayoutChange = useCallback((_: Layout[], allLayouts: Layouts) => {
    // Mobil düzenlerin (xs, xxs) daima 1 kolon ve alt alta kalmasını garanti et
    const updated: Layouts = {
      ...allLayouts,
      xs: mobileLayout,
      xxs: mobileLayout,
    }
    setLayouts(updated)
    if (!isMobile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }, [isMobile])

  // Layout sıfırlama fonksiyonu
  const resetLayout = useCallback(() => {
    setLayouts(defaultLayouts)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <div ref={containerRef} className="w-full max-w-full min-w-0 overflow-x-hidden">
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="text-xs text-slate-400">
          {isMobile ? (
            <span className="text-slate-500 text-[11px]">📱 Mobil Görünüm (Sabit Kolon Düzeni)</span>
          ) : (
            <span className="text-slate-500 text-[11px]">🖥️ Kartları başlıktan sürükleyip boyutlandırabilirsiniz</span>
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
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 }}
          rowHeight={30}
          onBreakpointChange={handleBreakpointChange}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          draggableCancel=".leaflet-container, .leaflet-interactive, .no-drag, input, textarea, button, select"
          isDraggable={!isMobile}
          isResizable={!isMobile}
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
