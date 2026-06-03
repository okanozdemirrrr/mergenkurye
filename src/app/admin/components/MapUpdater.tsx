'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

type LatLngTuple = [number, number]

function safeMapSync(map: ReturnType<typeof useMap>, center: LatLngTuple) {
  try {
    const container = map.getContainer()
    if (!container?.isConnected) return

    map.invalidateSize({ pan: false })

    const zoom =
      typeof map.getZoom === 'function' && Number.isFinite(map.getZoom())
        ? map.getZoom()
        : 15

    map.setView(center, zoom, { animate: false })
  } catch {
    // Layout/flex resize sırasında Leaflet ara katmanları hazır olmayabilir
  }
}

export function MapUpdater({ center }: { center: LatLngTuple }) {
  const map = useMap()

  useEffect(() => {
    const run = () => safeMapSync(map, center)

    map.whenReady(run)

    const raf = requestAnimationFrame(run)
    const t = window.setTimeout(run, 150)

    const container = map.getContainer()
    const observeTarget = container?.parentElement ?? container
    const ro =
      observeTarget &&
      new ResizeObserver(() => {
        requestAnimationFrame(() => {
          try {
            map.invalidateSize({ pan: false })
          } catch {
            /* ignore */
          }
        })
      })

    if (ro && observeTarget) ro.observe(observeTarget)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      ro?.disconnect()
    }
  }, [center, map])

  return null
}
