/**
 * @file src/hooks/useCourierLocationBroadcast.ts
 * @description Kurye Anlık Konum Yayını (GEÇİCİ OLARAK DEVRE DIŞI BIRAKILDI)
 *
 * MİMARİ:
 * - Supabase Egress ve Realtime kotalarını korumak için GPS takibi ve broadcast geçici olarak kapatılmıştır.
 */
'use client'

import { useEffect } from 'react'

interface LocationBroadcastOptions {
  courierId: string
  courierName: string
  isActive: boolean
}

export function useCourierLocationBroadcast({
  courierId,
  courierName,
  isActive
}: LocationBroadcastOptions) {
  useEffect(() => {
    // 📍 Optimizasyon çalışmaları nedeniyle geçici olarak devre dışı bırakıldı.
    console.log('📡 Konum yayını ve GPS takibi geçici olarak devre dışıdır:', courierId)
  }, [courierId, courierName, isActive])
}
