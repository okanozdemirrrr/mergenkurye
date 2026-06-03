'use client'

import { useCallback, useRef, useState } from 'react'
import { getBusinessDayDateTimeLocal } from '@/utils/calculations'

type DateRange = { start: string; end: string }

function readStored(key: string): DateRange | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DateRange
    if (parsed?.start && parsed?.end) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function writeStored(key: string, range: DateRange) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(key, JSON.stringify(range))
}

/**
 * Tarih filtresinin render/realtime ile "bugüne" sıfırlanmasını engeller.
 * Varsayılan sadece ilk mount'ta; sonra sessionStorage + kullanıcı seçimi.
 */
export function usePersistedDateRange(storageKey: string) {
  const initializedRef = useRef(false)

  const [range, setRange] = useState<DateRange>(() => {
    initializedRef.current = true
    return readStored(storageKey) ?? getBusinessDayDateTimeLocal()
  })

  const setStartDate = useCallback(
    (start: string) => {
      setRange((prev) => {
        const next = { ...prev, start }
        writeStored(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const setEndDate = useCallback(
    (end: string) => {
      setRange((prev) => {
        const next = { ...prev, end }
        writeStored(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const applyPreset = useCallback(
    (preset: DateRange) => {
      writeStored(storageKey, preset)
      setRange(preset)
    },
    [storageKey]
  )

  /** Dışarıdan bugüne zorla yazmayı engellemek için ref — effect'lerde kullanma */
  const getRange = useCallback(() => range, [range])

  return {
    startDate: range.start,
    endDate: range.end,
    setStartDate,
    setEndDate,
    applyPreset,
    getRange,
    storageKey,
  }
}
