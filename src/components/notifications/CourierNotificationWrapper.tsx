/**
 * @file src/components/notifications/CourierNotificationWrapper.tsx
 * @description Kurye Paneli için Bildirim Wrapper Component
 * 
 * KULLANIM:
 * Kurye panelinin ana sayfasına bu component'i ekleyin
 * 
 * NOT: Kurye için popup YOK, sadece native notification + kısa audio
 */
'use client'

import { useCourierNotifications } from '@/hooks/useCourierNotifications'

interface CourierNotificationWrapperProps {
  courierId: string | null
  isLoggedIn?: boolean
}

export function CourierNotificationWrapper({
  courierId,
  isLoggedIn = false
}: CourierNotificationWrapperProps) {
  // Hook içinde tüm logic var (audio + native notification)
  useCourierNotifications(courierId, isLoggedIn)

  // Kurye için popup yok, sadece native notification
  return null
}
