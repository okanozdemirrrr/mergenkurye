/**
 * @file src/components/PullToRefresh.tsx
 * @description Pull-to-Refresh wrapper component for mobile UX
 */
'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  darkMode?: boolean
}

export default function PullToRefresh({ onRefresh, children, darkMode = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canPull, setCanPull] = useState(false)
  
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const PULL_THRESHOLD = 80 // Minimum pull distance to trigger refresh
  const MAX_PULL = 120 // Maximum visual pull distance

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      // Sadece sayfa en üstteyken pull-to-refresh aktif
      const scrollTop = container.scrollTop
      if (scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY
        setCanPull(true)
      } else {
        setCanPull(false)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull || isRefreshing) return

      const touchY = e.touches[0].clientY
      const distance = touchY - touchStartY.current

      // Sadece aşağı doğru çekme
      if (distance > 0) {
        // Overscroll effect - yavaşlatma
        const dampedDistance = Math.min(distance * 0.5, MAX_PULL)
        setPullDistance(dampedDistance)

        // Varsayılan scroll davranışını engelle
        if (dampedDistance > 10) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!canPull || isRefreshing) return

      // Eşik değeri aşıldıysa refresh tetikle
      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true)
        setPullDistance(PULL_THRESHOLD) // Spinner pozisyonunu sabitle
        
        try {
          await onRefresh()
        } catch (error) {
          console.error('Pull-to-refresh error:', error)
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        // Eşik aşılmadıysa geri çek
        setPullDistance(0)
      }

      setCanPull(false)
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [canPull, pullDistance, isRefreshing, onRefresh])

  const spinnerOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const spinnerRotation = (pullDistance / PULL_THRESHOLD) * 360

  return (
    <div
      ref={containerRef}
      className="relative h-screen overflow-y-auto"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
      }}
    >
      {/* Pull-to-Refresh Indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
        style={{
          height: `${PULL_THRESHOLD}px`,
          transform: `translateY(-${PULL_THRESHOLD - pullDistance}px)`,
          opacity: spinnerOpacity,
          transition: pullDistance === 0 ? 'opacity 0.3s ease-out' : 'none'
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Spinner */}
          <div
            className={`w-8 h-8 border-3 rounded-full ${
              darkMode 
                ? 'border-slate-600 border-t-orange-500' 
                : 'border-gray-300 border-t-orange-600'
            }`}
            style={{
              transform: isRefreshing 
                ? 'rotate(0deg)' 
                : `rotate(${spinnerRotation}deg)`,
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }}
          />
          
          {/* Text */}
          {pullDistance >= PULL_THRESHOLD && (
            <span className={`text-xs font-medium ${
              darkMode ? 'text-slate-400' : 'text-gray-600'
            }`}>
              {isRefreshing ? 'Yenileniyor...' : 'Bırakın'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {children}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
