/**
 * @file src/hooks/useRestaurantReminder.ts
 * @description Restoran hatırlatıcı sistemi - Siparişler 10 dakikadan fazla beklediyse uyarı ver
 */

import { useEffect, useRef, useState } from 'react'
import { Package } from '@/types'

interface ReminderConfig {
  warningThresholdMinutes: number // Kaç dakika sonra uyarı başlasın
  soundIntervalMinutes: number // Ses kaç dakikada bir çalsın
}

const DEFAULT_CONFIG: ReminderConfig = {
  warningThresholdMinutes: 10,
  soundIntervalMinutes: 2
}

export function useRestaurantReminder(
  packages: Package[],
  config: Partial<ReminderConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const [delayedPackages, setDelayedPackages] = useState<Set<number>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSoundPlayedRef = useRef<number>(0)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Audio'yu initialize et
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/reminder.mp3')
      audioRef.current.volume = 0.7
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Paketleri kontrol et
  useEffect(() => {
    const checkDelayedPackages = () => {
      const now = Date.now()
      const delayed = new Set<number>()

      console.log('🔍 Hatırlatıcı kontrolü başladı:', {
        packageCount: packages.length,
        threshold: finalConfig.warningThresholdMinutes
      })

      packages.forEach(pkg => {
        // Sadece 'new_order' ve 'getting_ready' statüsündeki paketleri kontrol et
        if (pkg.status !== 'new_order' && pkg.status !== 'getting_ready') {
          return
        }

        const createdAt = new Date(pkg.created_at).getTime()
        const elapsedMinutes = (now - createdAt) / (1000 * 60)

        console.log('📦 Paket kontrol ediliyor:', {
          id: pkg.id,
          orderNumber: pkg.order_number,
          status: pkg.status,
          createdAt: pkg.created_at,
          elapsedMinutes: elapsedMinutes.toFixed(2),
          isDelayed: elapsedMinutes >= finalConfig.warningThresholdMinutes
        })

        // Eşik değerini aştıysa delayed listesine ekle
        if (elapsedMinutes >= finalConfig.warningThresholdMinutes) {
          delayed.add(pkg.id)
          console.log('⚠️ GECİKMİŞ PAKET BULUNDU:', {
            id: pkg.id,
            orderNumber: pkg.order_number,
            elapsedMinutes: elapsedMinutes.toFixed(2)
          })
        }
      })

      console.log('✅ Kontrol tamamlandı:', {
        delayedCount: delayed.size,
        delayedPackages: Array.from(delayed)
      })

      setDelayedPackages(delayed)

      // Eğer gecikmiş paket varsa ve ses çalma zamanı geldiyse
      if (delayed.size > 0) {
        const timeSinceLastSound = (now - lastSoundPlayedRef.current) / (1000 * 60)
        
        console.log('🔊 Ses kontrolü:', {
          timeSinceLastSound: timeSinceLastSound.toFixed(2),
          soundInterval: finalConfig.soundIntervalMinutes,
          shouldPlaySound: timeSinceLastSound >= finalConfig.soundIntervalMinutes
        })
        
        if (timeSinceLastSound >= finalConfig.soundIntervalMinutes) {
          console.log('🔊 SES ÇALINIYOR!')
          playReminderSound()
          lastSoundPlayedRef.current = now
        }
      }
    }

    // İlk kontrolü hemen yap
    checkDelayedPackages()

    // Her 60 saniyede bir kontrol et
    checkIntervalRef.current = setInterval(checkDelayedPackages, 60 * 1000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [packages, finalConfig.warningThresholdMinutes, finalConfig.soundIntervalMinutes])

  const playReminderSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(error => {
        console.warn('⚠️ Hatırlatıcı sesi çalınamadı:', error)
      })
    }
  }

  const isPackageDelayed = (packageId: number): boolean => {
    return delayedPackages.has(packageId)
  }

  const getDelayedMinutes = (pkg: Package): number => {
    const now = Date.now()
    const createdAt = new Date(pkg.created_at).getTime()
    return Math.floor((now - createdAt) / (1000 * 60))
  }

  return {
    delayedPackages,
    isPackageDelayed,
    getDelayedMinutes,
    hasDelayedPackages: delayedPackages.size > 0
  }
}
